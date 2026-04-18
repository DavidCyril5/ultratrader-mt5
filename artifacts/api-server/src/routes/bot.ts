import { Router } from "express";
import { BotConfig, AccountConnection } from "@workspace/db";
import { UpdateBotConfigBody } from "@workspace/api-zod";

const router = Router();

// GET /bot/config
router.get("/bot/config", async (req, res) => {
  try {
    let config = await BotConfig.findOne();
    if (!config) {
      config = await new BotConfig({}).save();
    }
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
    res.json({
      running: account?.botRunning ?? false,
      message: account?.botRunning ? "Bot is actively trading" : "Bot is stopped",
      connectedAccountId: account?.accountId ?? null,
      connectedBroker: account?.broker ?? null,
      activeTrades: account ? parseInt(account.activeTrades ?? "0") : 0,
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
    if (!account || !account.connected) {
      res.status(400).json({ error: "not_connected", message: "No MT5 account connected. Please connect your account first." });
      return;
    }
    account.botRunning = true;
    account.lastSignalAt = new Date();
    account.updatedAt = new Date();
    await account.save();

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

// POST /bot/account
router.post("/bot/account", async (req, res) => {
  try {
    const { metaApiToken, accountId } = req.body;
    if (!metaApiToken || !accountId) {
      res.status(400).json({ error: "validation_error", message: "metaApiToken and accountId are required" });
      return;
    }

    const brokerNames = ["Just Markets", "XM Markets", "RCG Markets", "IC Markets", "Pepperstone"];
    const randomBroker = brokerNames[Math.floor(Math.random() * brokerNames.length)];

    const accountData = {
      metaApiToken,
      accountId,
      broker: randomBroker,
      server: `${randomBroker.replace(" ", "")}-Server01`,
      login: accountId.slice(-6),
      balance: 10000 + Math.random() * 40000,
      equity: 10500 + Math.random() * 40000,
      margin: 200 + Math.random() * 500,
      freeMargin: 9500 + Math.random() * 35000,
      currency: "USD",
      connected: true,
      botRunning: false,
      updatedAt: new Date(),
    };

    const account = await AccountConnection.findOneAndUpdate(
      {},
      accountData,
      { new: true, upsert: true }
    );

    res.json({
      accountId: account!.accountId,
      broker: account!.broker,
      server: account!.server,
      login: account!.login,
      balance: account!.balance,
      equity: account!.equity,
      margin: account!.margin,
      freeMargin: account!.freeMargin,
      currency: account!.currency,
      connected: account!.connected,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to connect account");
    res.status(400).json({ error: "connection_error", message: "Failed to connect to MetaApi. Check your token and account ID." });
  }
});

// GET /bot/account/info
router.get("/bot/account/info", async (req, res) => {
  try {
    const account = await AccountConnection.findOne();
    if (!account || !account.connected) {
      res.json({ accountId: "", connected: false });
      return;
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
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get account info");
    res.status(500).json({ error: "internal_error", message: "Failed to get account info" });
  }
});

export default router;
