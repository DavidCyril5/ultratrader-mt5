import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountConnectionTable = pgTable("account_connection", {
  id: serial("id").primaryKey(),
  metaApiToken: text("meta_api_token").notNull(),
  accountId: text("account_id").notNull(),
  broker: text("broker"),
  server: text("server"),
  login: text("login"),
  balance: real("balance"),
  equity: real("equity"),
  margin: real("margin"),
  freeMargin: real("free_margin"),
  currency: text("currency").default("USD"),
  connected: boolean("connected").notNull().default(false),
  botRunning: boolean("bot_running").notNull().default(false),
  activeTrades: text("active_trades").default("0"),
  lastSignalAt: timestamp("last_signal_at"),
  connectedAt: timestamp("connected_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAccountConnectionSchema = createInsertSchema(accountConnectionTable).omit({ id: true, connectedAt: true, updatedAt: true });
export type InsertAccountConnection = z.infer<typeof insertAccountConnectionSchema>;
export type AccountConnection = typeof accountConnectionTable.$inferSelect;
