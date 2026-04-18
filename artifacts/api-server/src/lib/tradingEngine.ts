import { BotConfig, AccountConnection, Trade } from "@workspace/db";
import { logger } from "./logger.js";
import * as MetaApiService from "./metaapi.js";

let tradingInterval: ReturnType<typeof setInterval> | null = null;

const TF_MAP: Record<string, string> = {
  M1: "1m", M5: "5m", M15: "15m", M30: "30m",
  H1: "1h", H4: "4h", D1: "1d", W1: "1w",
};

function sma(data: number[], period: number): number {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function ema(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) val = data[i] * k + val * (1 - k);
  return val;
}

function rsiCalc(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  const changes = data.slice(-(period + 1)).map((v, i, a) => (i === 0 ? 0 : v - a[i - 1])).slice(1);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  const avgGain = gains.reduce((s, v) => s + v, 0) / period;
  const avgLoss = losses.reduce((s, v) => s + v, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function pipValue(symbol: string): number {
  if (symbol === "XAUUSD") return 0.1;
  if (symbol.includes("JPY")) return 0.01;
  if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("LTC")) return 1.0;
  return 0.0001;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTick(accountId: string, config: any, symbol: string) {
  try {
    const conn = MetaApiService.getCachedConnection(accountId);
    if (!conn) return;

    const tf = TF_MAP[config.timeframe as string] ?? "1h";
    const lookback = Math.max(Number(config.slowMaPeriod), Number(config.trendMaPeriod), 200);
    const from = new Date(Date.now() - lookback * 4 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let candles: any[];
    try {
      candles = await conn.getHistoricalCandles(symbol, tf, from, new Date(), lookback + 10);
    } catch {
      return;
    }
    if (!candles || candles.length < 60) return;

    const closes: number[] = candles.map((c: { close: number }) => c.close);
    const currentPrice = closes[closes.length - 1];
    const prevCloses = closes.slice(0, -1);

    let buySignals = 0;
    let sellSignals = 0;
    const strategy = config.strategy as string;

    if (strategy === "ma_crossover" || strategy === "combined") {
      const fastNow = sma(closes, config.fastMaPeriod);
      const fastPrev = sma(prevCloses, config.fastMaPeriod);
      const slowNow = sma(closes, config.slowMaPeriod);
      const slowPrev = sma(prevCloses, config.slowMaPeriod);
      if (fastPrev <= slowPrev && fastNow > slowNow) buySignals++;
      if (fastPrev >= slowPrev && fastNow < slowNow) sellSignals++;
    }

    if (strategy === "rsi" || strategy === "combined") {
      const rsiVal = rsiCalc(closes, config.rsiPeriod);
      if (rsiVal < config.rsiOversold) buySignals++;
      if (rsiVal > config.rsiOverbought) sellSignals++;
    }

    if (strategy === "macd" || strategy === "combined") {
      const macdNow = ema(closes, config.macdFastEma) - ema(closes, config.macdSlowEma);
      const macdPrev = ema(prevCloses, config.macdFastEma) - ema(prevCloses, config.macdSlowEma);
      if (macdPrev < 0 && macdNow > 0) buySignals++;
      if (macdPrev > 0 && macdNow < 0) sellSignals++;
    }

    if (strategy === "bollinger") {
      const mid = sma(closes, config.bbPeriod);
      const variance = closes.slice(-config.bbPeriod).reduce((s, v) => s + (v - mid) ** 2, 0) / config.bbPeriod;
      const stdDev = Math.sqrt(variance);
      const upper = mid + config.bbDeviation * stdDev;
      const lower = mid - config.bbDeviation * stdDev;
      if (currentPrice <= lower) buySignals++;
      if (currentPrice >= upper) sellSignals++;
    }

    const direction = config.tradeDirection as string;
    const canBuy = direction === "both" || direction === "buy_only";
    const canSell = direction === "both" || direction === "sell_only";

    let signal: "buy" | "sell" | null = null;
    const threshold = strategy === "combined" ? 2 : 1;
    if (buySignals >= threshold && canBuy) signal = "buy";
    else if (sellSignals >= threshold && canSell) signal = "sell";

    if (!signal) return;

    // Check existing positions
    const positions = await MetaApiService.getPositions(accountId);
    const symbolPositions = positions.filter((p: { symbol: string }) => p.symbol === symbol);
    if (symbolPositions.length >= (config.maxPositions ?? 3)) return;

    // Check spread filter
    if (config.useSpreadFilter) {
      try {
        const tick = await conn.getSymbolPrice(symbol);
        const spreadPips = Math.abs(tick.ask - tick.bid) / pipValue(symbol);
        if (spreadPips > config.maxSpreadPips) {
          logger.info({ symbol, spreadPips }, "Spread too wide, skipping");
          return;
        }
      } catch {}
    }

    // Check session filter
    if (config.session !== "all") {
      const hour = new Date().getUTCHours();
      const inLondon = hour >= 8 && hour < 17;
      const inNewYork = hour >= 13 && hour < 22;
      const inTokyo = hour >= 0 && hour < 9;
      if (config.session === "london" && !inLondon) return;
      if (config.session === "new_york" && !inNewYork) return;
      if (config.session === "tokyo" && !inTokyo) return;
      if (config.session === "london_new_york" && !(inLondon || inNewYork)) return;
    }

    // Calculate lot size
    let lots = Number(config.fixedLot);
    if (config.lotMode === "percent_balance") {
      try {
        const info = await conn.getAccountInformation();
        const riskAmount = info.balance * (config.riskPercent / 100);
        lots = Math.max(0.01, parseFloat((riskAmount / (config.stopLossPips * 10)).toFixed(2)));
      } catch {}
    } else if (config.lotMode === "fixed_dollar") {
      const riskAmount = Number(config.fixedDollarRisk);
      lots = Math.max(0.01, parseFloat((riskAmount / (config.stopLossPips * 10)).toFixed(2)));
    }

    const pv = pipValue(symbol);
    const sl = signal === "buy"
      ? currentPrice - config.stopLossPips * pv
      : currentPrice + config.stopLossPips * pv;
    const tp = signal === "buy"
      ? currentPrice + config.takeProfitPips * pv
      : currentPrice - config.takeProfitPips * pv;

    logger.info({ symbol, signal, lots, sl: sl.toFixed(5), tp: tp.toFixed(5) }, "Placing trade");

    try {
      await MetaApiService.placeMarketOrder(accountId, symbol, signal, lots, sl, tp);
      await new Trade({
        symbol, type: signal, lots, openPrice: currentPrice,
        stopLoss: sl, takeProfit: tp,
        openTime: new Date(), status: "open", strategy,
      }).save();
      logger.info({ symbol, signal }, "Trade placed and recorded");
    } catch (err) {
      logger.error({ err }, "Failed to place order");
    }
  } catch (err) {
    logger.error({ err, symbol }, "Strategy tick error");
  }
}

async function syncClosedTrades(accountId: string) {
  try {
    const openTrades = await Trade.find({ status: "open" });
    if (openTrades.length === 0) return;

    const positions = await MetaApiService.getPositions(accountId);
    const openSymbols = new Set(positions.map((p: { symbol: string }) => p.symbol));

    for (const trade of openTrades) {
      if (!openSymbols.has(trade.symbol)) {
        const from = new Date(trade.openTime.getTime() - 60000);
        const deals = await MetaApiService.getDeals(accountId, from, new Date());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const closing = deals.find((d: any) =>
          d.symbol === trade.symbol &&
          (d.entryType === "DEAL_ENTRY_OUT" || d.entryType === "DEAL_ENTRY_INOUT")
        );
        trade.status = "closed";
        trade.closeTime = new Date();
        if (closing) {
          trade.profit = closing.profit ?? 0;
          trade.closePrice = closing.price;
        }
        await trade.save();
      }
    }
  } catch (err) {
    logger.warn({ err }, "Trade sync error");
  }
}

export function startTradingEngine(accountId: string) {
  if (tradingInterval) return;

  logger.info({ accountId }, "Trading engine started");

  tradingInterval = setInterval(async () => {
    try {
      const [account, config] = await Promise.all([
        AccountConnection.findOne(),
        BotConfig.findOne(),
      ]);
      if (!account?.botRunning || !config) return;

      const symbols = config.symbols as string[];
      for (const symbol of symbols) {
        await runTick(accountId, config, symbol);
      }
      await syncClosedTrades(accountId);
    } catch (err) {
      logger.error({ err }, "Trading loop error");
    }
  }, 60 * 1000);
}

export function stopTradingEngine() {
  if (tradingInterval) {
    clearInterval(tradingInterval);
    tradingInterval = null;
  }
  logger.info("Trading engine stopped");
}
