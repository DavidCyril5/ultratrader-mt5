import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "@workspace/db";
import { AccountConnection } from "@workspace/db";
import { connectInBackground } from "./lib/metaapi.js";
import { startTradingEngine } from "./lib/tradingEngine.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function autoReconnect() {
  try {
    const account = await AccountConnection.findOne();
    if (!account?.connected || !account?.metaApiToken || !account?.accountId) return;

    logger.info({ accountId: account.accountId }, "Auto-reconnecting MetaApi WebSocket after server restart");
    connectInBackground(account.metaApiToken, account.accountId);

    if (account.botRunning) {
      logger.info("Bot was running before restart — resuming trading engine");
      startTradingEngine(account.accountId);
    }
  } catch (err) {
    logger.warn({ err }, "Auto-reconnect skipped (no saved account)");
  }
}

connectDB()
  .then(async () => {
    logger.info("Connected to MongoDB");
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
    // Kick off background reconnect after server is up
    autoReconnect();
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
