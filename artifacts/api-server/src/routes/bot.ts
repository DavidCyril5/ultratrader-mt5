import { Router } from "express";
import { db } from "@workspace/db";
import { botConfigTable, accountConnectionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateBotConfigBody } from "@workspace/api-zod";

const router = Router();

// GET /bot/config
router.get("/bot/config", async (req, res) => {
  try {
    let config = await db.query.botConfigTable.findFirst();
    if (!config) {
      const inserted = await db.insert(botConfigTable).values({}).returning();
      config = inserted[0];
    }
    const symbols = JSON.parse(config.symbols || '["EURUSD","XAUUSD"]');
    res.json({ ...config, symbols });
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

    const body = parsed.data;
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.symbols) {
      updateData.symbols = JSON.stringify(body.symbols);
    }

    let config = await db.query.botConfigTable.findFirst();
    if (!config) {
      const inserted = await db.insert(botConfigTable).values(updateData as Parameters<typeof db.insert>[1] extends { values: infer V } ? V : never).returning();
      config = inserted[0];
    } else {
      const updated = await db.update(botConfigTable).set(updateData).where(eq(botConfigTable.id, config.id)).returning();
      config = updated[0];
    }

    const symbols = JSON.parse(config.symbols || '["EURUSD","XAUUSD"]');
    res.json({ ...config, symbols });
  } catch (err) {
    req.log.error({ err }, "Failed to update bot config");
    res.status(500).json({ error: "internal_error", message: "Failed to update bot config" });
  }
});

// GET /bot/status
router.get("/bot/status", async (req, res) => {
  try {
    const account = await db.query.accountConnectionTable.findFirst();
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
    const account = await db.query.accountConnectionTable.findFirst();
    if (!account || !account.connected) {
      res.status(400).json({ error: "not_connected", message: "No MT5 account connected. Please connect your account first." });
      return;
    }
    await db.update(accountConnectionTable)
      .set({ botRunning: true, lastSignalAt: new Date(), updatedAt: new Date() })
      .where(eq(accountConnectionTable.id, account.id));

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
    const account = await db.query.accountConnectionTable.findFirst();
    if (account) {
      await db.update(accountConnectionTable)
        .set({ botRunning: false, updatedAt: new Date() })
        .where(eq(accountConnectionTable.id, account.id));
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

    // Simulate connection validation (MetaApi would be called here)
    // In production with metaapi.cloud credentials, integrate the metaapi-cloud-sdk package
    const brokerNames = ["Just Markets", "XM Markets", "RCG Markets", "IC Markets", "Pepperstone"];
    const randomBroker = brokerNames[Math.floor(Math.random() * brokerNames.length)];

    // Store or update account connection
    const existing = await db.query.accountConnectionTable.findFirst();
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
    };

    let account;
    if (existing) {
      const updated = await db.update(accountConnectionTable)
        .set({ ...accountData, updatedAt: new Date() })
        .where(eq(accountConnectionTable.id, existing.id))
        .returning();
      account = updated[0];
    } else {
      const inserted = await db.insert(accountConnectionTable).values(accountData).returning();
      account = inserted[0];
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
    req.log.error({ err }, "Failed to connect account");
    res.status(400).json({ error: "connection_error", message: "Failed to connect to MetaApi. Check your token and account ID." });
  }
});

// GET /bot/account/info
router.get("/bot/account/info", async (req, res) => {
  try {
    const account = await db.query.accountConnectionTable.findFirst();
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
