import MetaApi from "metaapi.cloud-sdk";
import { AccountConnection } from "@workspace/db";
import { logger } from "./logger.js";

interface CachedEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any;
  synced: boolean;
}

const cache = new Map<string, CachedEntry>();

// Fetch basic account details via the MetaApi provisioning REST API — fast, no WebSocket needed
export async function fetchAccountDetails(token: string, accountId: string) {
  const resp = await fetch(
    `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}`,
    { headers: { "auth-token": token, "Content-Type": "application/json" } }
  );
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`MetaApi provisioning error ${resp.status}: ${body}`);
  }
  return resp.json() as Promise<{
    id: string;
    name: string;
    login: string;
    server: string;
    broker: string;
    state: string;
    connectionStatus: string;
    region?: string;
    type: string;
  }>;
}

// Connect WebSocket in the background and update MongoDB once synced
export function connectInBackground(token: string, accountId: string) {
  // Prevent duplicate background connections
  const existing = cache.get(accountId);
  if (existing) return;

  cache.set(accountId, { connection: null, synced: false });

  (async () => {
    try {
      logger.info({ accountId }, "Background MetaApi connection starting...");
      const api = new MetaApi(token);
      const account = await api.metatraderAccountApi.getAccount(accountId);

      if (account.state === "UNDEPLOYED") {
        try { await account.deploy(); } catch {}
      }
      await account.waitConnected();

      const connection = account.getRPCConnection();
      await connection.connect();

      // Give the connection 10 seconds to establish before trying account info
      await new Promise(r => setTimeout(r, 10000));

      cache.set(accountId, { connection, synced: false });
      logger.info({ accountId }, "MetaApi RPC connected, attempting account info...");

      try {
        const info = await connection.getAccountInformation();
        logger.info({ accountId, balance: info.balance }, "MetaApi connection fully synced");

        await AccountConnection.findOneAndUpdate(
          {},
          {
            balance: info.balance ?? 0,
            equity: info.equity ?? 0,
            margin: info.margin ?? 0,
            freeMargin: info.freeMargin ?? 0,
            currency: info.currency ?? "USD",
            connected: true,
            updatedAt: new Date(),
          }
        );

        cache.set(accountId, { connection, synced: true });
      } catch (err) {
        logger.warn({ err, accountId }, "Could not fetch account info yet — will retry on next poll");
        cache.set(accountId, { connection, synced: false });
      }
    } catch (err) {
      logger.error({ err, accountId }, "Background MetaApi connection failed");
      cache.delete(accountId);
    }
  })();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCachedConnection(accountId: string): any | null {
  return cache.get(accountId)?.connection ?? null;
}

export function isConnected(accountId: string): boolean {
  return cache.has(accountId) && cache.get(accountId)!.connection !== null;
}

export function isSynced(accountId: string): boolean {
  return cache.get(accountId)?.synced ?? false;
}

export async function getAccountInformation(accountId: string) {
  const conn = getCachedConnection(accountId);
  if (!conn) throw new Error("No active connection");
  return await conn.getAccountInformation();
}

export async function getPositions(accountId: string) {
  const conn = getCachedConnection(accountId);
  if (!conn) return [];
  return (await conn.getPositions()) ?? [];
}

export async function getDeals(accountId: string, from: Date, to: Date) {
  const conn = getCachedConnection(accountId);
  if (!conn) return [];
  return (await conn.getDealsByTimeRange(from, to)) ?? [];
}

export async function placeMarketOrder(
  accountId: string,
  symbol: string,
  type: "buy" | "sell",
  lots: number,
  stopLoss?: number,
  takeProfit?: number
) {
  const conn = getCachedConnection(accountId);
  if (!conn) throw new Error("No active connection");
  const options = { comment: "UltraTrader" };
  if (type === "buy") {
    return await conn.createMarketBuyOrder(symbol, lots, stopLoss, takeProfit, options);
  }
  return await conn.createMarketSellOrder(symbol, lots, stopLoss, takeProfit, options);
}

export async function closePosition(accountId: string, positionId: string) {
  const conn = getCachedConnection(accountId);
  if (!conn) throw new Error("No active connection");
  return await conn.closePosition(positionId);
}

export function disconnectAccount(accountId: string) {
  const entry = cache.get(accountId);
  if (entry?.connection) {
    try { entry.connection.close(); } catch {}
  }
  cache.delete(accountId);
}
