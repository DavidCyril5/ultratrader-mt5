import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  lots: real("lots").notNull(),
  openPrice: real("open_price").notNull(),
  closePrice: real("close_price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  profit: real("profit"),
  pips: real("pips"),
  openTime: timestamp("open_time").notNull().defaultNow(),
  closeTime: timestamp("close_time"),
  status: text("status").notNull().default("open"),
  strategy: text("strategy"),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
