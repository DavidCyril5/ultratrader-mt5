import MetaApi from "metaapi.cloud-sdk";
import { logger } from "./logger.js";

interface CachedEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any;
  accountId: string;
}

const cache = new Map<string, CachedEntry>();

export async function connectToAccount(token: string, accountId: string) {
  const api = new MetaApi(token);
  const account = await api.metatraderAccountApi.getAccount(accountId);

  if (account.state !== "DEPLOYED" && account.state !== "DEPLOYING") {
    await account.deploy();
  }
  await account.waitConnected();

  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized({ timeoutInSeconds: 120 });

  cache.set(accountId, { connection, accountId });
  logger.info({ accountId }, "MetaApi connection established");
  return connection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCachedConnection(accountId: string): any | null {
  return cache.get(accountId)?.connection ?? null;
}

export async function getAccountInformation(accountId: string) {
  const conn = getCachedConnection(accountId);
  if (!conn) throw new Error("No active connection for this account");
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
  if (entry) {
    try { entry.connection.close(); } catch {}
    cache.delete(accountId);
  }
}
