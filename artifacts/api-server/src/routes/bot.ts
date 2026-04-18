import { Router } from "express";
import { BotConfig, AccountConnection } from "@workspace/db";
import { UpdateBotConfigBody } from "@workspace/api-zod";
import * as MetaApiService from "../lib/metaapi.js";
import { startTradingEngine, stopTradingEngine } from "../lib/tradingEngine.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /bot/config
router.get("/bot/config", async (req, res) => {
  try {
    let config = await BotConfig.findOne();
    if (!config) config = await new BotConfig({}).save();
    res.json(config.toObject());
  } catch (err) {
    req.log.error({ err }, "Failed to get bot config");
    res.status(500).json({ error: "internal_error", message: "Failed to get bot config" });
  }
});

// PUT /bot/config
router.put("/bot/config", async (req, res) => {
  try {
    const parsed = UpdateBotConfigBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "validation_error", message: parsed.error.message });
      return;
    }
    const config = await BotConfig.findOneAndUpdate(
      {},
      { ...parsed.data, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(config!.toObject());
  } catch (err) {
    req.log.error({ err }, "Failed to update bot config");
    res.status(500).json({ error: "internal_error", message: "Failed to update bot config" });
  }
});

// GET /bot/status
router.get("/bot/status", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    let activeTrades = parseInt(account?.activeTrades ?? "0");

    if (account?.connected && account.accountId && MetaApiService.isSynced(account.accountId)) {
      try {
        const positions = await MetaApiService.getPositions(account.accountId);
        activeTrades = positions.length;
        await AccountConnection.findOneAndUpdate({ _id: account._id }, { activeTrades: String(positions.length) });
      } catch {}
    }

    res.json({
      running: account?.botRunning ?? false,
      message: account?.botRunning ? "Bot is actively trading" : "Bot is stopped",
      connectedAccountId: account?.accountId ?? null,
      connectedBroker: account?.broker ?? null,
      activeTrades,
      synced: account?.accountId ? MetaApiService.isSynced(account.accountId) : false,
      lastSignalAt: account?.lastSignalAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get bot status");
    res.status(500).json({ error: "internal_error", message: "Failed to get bot status" });
  }
});

// POST /bot/start
router.post("/bot/start", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    if (!account?.connected) {
      res.status(400).json({ error: "not_connected", message: "No MT5 account connected. Please connect your account first." });
      return;
    }
    account.botRunning = true;
    account.lastSignalAt = new Date();
    account.updatedAt = new Date();
    await account.save();

    // Ensure background connection is running
    if (account.metaApiToken && !MetaApiService.isConnected(account.accountId)) {
      MetaApiService.connectInBackground(account.metaApiToken, account.accountId);
    }

    startTradingEngine(account.accountId);

    res.json({
      running: true,
      message: "Bot started successfully",
      connectedAccountId: account.accountId,
      connectedBroker: account.broker,
      activeTrades: parseInt(account.activeTrades ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to start bot");
    res.status(500).json({ error: "internal_error", message: "Failed to start bot" });
  }
});

// POST /bot/stop
router.post("/bot/stop", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    if (account) {
      account.botRunning = false;
      account.updatedAt = new Date();
      await account.save();
    }
    stopTradingEngine();

    res.json({
      running: false,
      message: "Bot stopped",
      connectedAccountId: account?.accountId ?? null,
      connectedBroker: account?.broker ?? null,
      activeTrades: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to stop bot");
    res.status(500).json({ error: "internal_error", message: "Failed to stop bot" });
  }
});

// POST /bot/account — saves credentials, fetches account details via REST, connects WebSocket in background
router.post("/bot/account", async (req, res) => {
  try {
    const { metaApiToken, accountId } = req.body;
    if (!metaApiToken || !accountId) {
      res.status(400).json({ error: "validation_error", message: "metaApiToken and accountId are required" });
      return;
    }

    logger.info({ accountId }, "Fetching MetaApi account details...");

    // Fast REST call — responds in under 2 seconds
    let details;
    try {
      details = await MetaApiService.fetchAccountDetails(metaApiToken, accountId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error({ err }, "MetaApi account details fetch failed");
      res.status(400).json({ error: "connection_error", message: `Failed to reach MetaApi: ${message}` });
      return;
    }

    const accountData = {
      metaApiToken,
      accountId,
      broker: details.broker ?? details.name ?? "Unknown Broker",
      server: details.server ?? "Unknown",
      login: String(details.login ?? accountId.slice(-6)),
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      currency: "USD",
      connected: true,
      botRunning: false,
      updatedAt: new Date(),
    };

    const account = await AccountConnection.findOneAndUpdate({}, accountData, { new: true, upsert: true });

    // Start WebSocket connection in the background — don't block the response
    MetaApiService.connectInBackground(metaApiToken, accountId);

    res.json({
      accountId: account!.accountId,
      broker: account!.broker,
      server: account!.server,
      login: account!.login,
      balance: account!.balance,
      equity: account!.equity,
      connected: true,
      syncing: true,
      message: "Account connected. Balance will update in a moment as the live feed syncs.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to connect account");
    res.status(400).json({ error: "connection_error", message: "Failed to connect account. Check your token and account ID." });
  }
});

// GET /bot/account/info — returns cached data, refreshes live if WebSocket is synced
router.get("/bot/account/info", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    if (!account?.connected) {
      res.json({ accountId: "", connected: false });
      return;
    }

    // If WebSocket is synced, refresh balance/equity live
    if (account.accountId && MetaApiService.isSynced(account.accountId)) {
      try {
        const info = await MetaApiService.getAccountInformation(account.accountId);
        account.balance = info.balance ?? account.balance;
        account.equity = info.equity ?? account.equity;
        account.margin = info.margin ?? account.margin;
        account.freeMargin = info.freeMargin ?? account.freeMargin;
        account.currency = info.currency ?? account.currency;
        account.updatedAt = new Date();
        await account.save();
      } catch {}
    }

    res.json({
      accountId: account.accountId,
      broker: account.broker,
      server: account.server,
      login: account.login,
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.freeMargin,
      currency: account.currency,
      connected: account.connected,
      synced: account.accountId ? MetaApiService.isSynced(account.accountId) : false,
      syncing: account.accountId ? MetaApiService.isConnected(account.accountId) && !MetaApiService.isSynced(account.accountId) : false,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get account info");
    res.status(500).json({ error: "internal_error", message: "Failed to get account info" });
  }
});

export default router;
