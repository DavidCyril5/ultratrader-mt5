import { Router } from "express";
import { Trade, AccountConnection } from "@workspace/db";
import * as MetaApiService from "../lib/metaapi.js";

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

// POST /trades/sync — pull real deal history from MetaApi into MongoDB
router.post("/trades/sync", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    if (!account?.connected) {
      res.status(400).json({ error: "not_connected", message: "No account connected" });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const to = new Date();

    let deals;
    try {
      deals = await MetaApiService.getDeals(account.accountId, from, to);
    } catch (err) {
      res.status(400).json({ error: "sync_error", message: "Failed to fetch deals from MetaApi" });
      return;
    }

    let imported = 0;
    for (const deal of deals ?? []) {
      // Only import opening deals (not commissions/fees)
      if (!deal.symbol || !deal.type?.includes("BUY") && !deal.type?.includes("SELL")) continue;
      if (deal.entryType === "DEAL_ENTRY_OUT") continue; // skip closing legs

      const exists = await Trade.findOne({ externalId: String(deal.id) });
      if (exists) continue;

      const type = deal.type?.includes("BUY") ? "buy" : "sell";
      await new Trade({
        externalId: String(deal.id),
        symbol: deal.symbol,
        type,
        lots: deal.volume ?? 0.01,
        openPrice: deal.price ?? 0,
        profit: deal.profit ?? 0,
        openTime: deal.time ? new Date(deal.time) : new Date(),
        status: "closed",
      }).save();
      imported++;
    }

    res.json({ synced: imported, message: `Imported ${imported} deals from MetaApi` });
  } catch (err) {
    req.log.error({ err }, "Failed to sync trades");
    res.status(500).json({ error: "internal_error", message: "Failed to sync trades" });
  }
});

export default router;
