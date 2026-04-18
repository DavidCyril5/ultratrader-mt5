import { Router } from "express";
import { Trade } from "@workspace/db";

const router = Router();

// GET /trades
router.get("/trades", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const trades = await Trade.find().sort({ openTime: -1 }).limit(limit);
    res.json(trades.map(t => ({
      id: t._id,
      symbol: t.symbol,
      type: t.type,
      lots: t.lots,
      openPrice: t.openPrice,
      closePrice: t.closePrice ?? null,
      stopLoss: t.stopLoss ?? null,
      takeProfit: t.takeProfit ?? null,
      profit: t.profit ?? null,
      pips: t.pips ?? null,
      openTime: t.openTime?.toISOString(),
      closeTime: t.closeTime?.toISOString() ?? null,
      status: t.status,
      strategy: t.strategy ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get trades");
    res.status(500).json({ error: "internal_error", message: "Failed to get trades" });
  }
});

// GET /trades/stats
router.get("/trades/stats", async (req, res) => {
  try {
    const trades = await Trade.find();
    const closed = trades.filter(t => t.status === "closed");
    const open = trades.filter(t => t.status === "open");
    const wins = closed.filter(t => (t.profit ?? 0) > 0);
    const losses = closed.filter(t => (t.profit ?? 0) <= 0);
    const totalProfit = wins.reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit ?? 0), 0));
    const netProfit = totalProfit - totalLoss;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    const avgWin = wins.length > 0 ? totalProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const profits = closed.map(t => t.profit ?? 0);
    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = closed.filter(t => t.closeTime && t.closeTime >= today);
    const todayProfit = todayTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0);

    res.json({
      totalTrades: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalProfit,
      totalLoss,
      netProfit,
      profitFactor,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      openTrades: open.length,
      todayProfit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get trade stats");
    res.status(500).json({ error: "internal_error", message: "Failed to get trade stats" });
  }
});

export default router;
