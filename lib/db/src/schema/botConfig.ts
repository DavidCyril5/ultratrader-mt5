import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botConfigTable = pgTable("bot_config", {
  id: serial("id").primaryKey(),
  strategy: text("strategy").notNull().default("combined"),
  symbols: text("symbols").notNull().default('["EURUSD","XAUUSD"]'),
  timeframe: text("timeframe").notNull().default("H1"),
  lotMode: text("lot_mode").notNull().default("percent_balance"),
  fixedLot: real("fixed_lot").notNull().default(0.01),
  riskPercent: real("risk_percent").notNull().default(1.5),
  fixedDollarRisk: real("fixed_dollar_risk").notNull().default(50),
  stopLossPips: real("stop_loss_pips").notNull().default(30),
  takeProfitPips: real("take_profit_pips").notNull().default(60),
  useTrailingStop: boolean("use_trailing_stop").notNull().default(true),
  trailingPips: real("trailing_pips").notNull().default(20),
  useBreakEven: boolean("use_break_even").notNull().default(true),
  breakEvenPips: real("break_even_pips").notNull().default(15),
  maxPositions: integer("max_positions").notNull().default(3),
  maxBuys: integer("max_buys").notNull().default(2),
  maxSells: integer("max_sells").notNull().default(2),
  tradeDirection: text("trade_direction").notNull().default("both"),
  session: text("session").notNull().default("all"),
  useSpreadFilter: boolean("use_spread_filter").notNull().default(true),
  maxSpreadPips: real("max_spread_pips").notNull().default(5),
  useDailyProfitLimit: boolean("use_daily_profit_limit").notNull().default(true),
  dailyProfitLimit: real("daily_profit_limit").notNull().default(200),
  useDailyLossLimit: boolean("use_daily_loss_limit").notNull().default(true),
  dailyLossLimit: real("daily_loss_limit").notNull().default(100),
  fastMaPeriod: integer("fast_ma_period").notNull().default(20),
  slowMaPeriod: integer("slow_ma_period").notNull().default(50),
  trendMaPeriod: integer("trend_ma_period").notNull().default(200),
  rsiPeriod: integer("rsi_period").notNull().default(14),
  rsiOverbought: real("rsi_overbought").notNull().default(70),
  rsiOversold: real("rsi_oversold").notNull().default(30),
  macdFastEma: integer("macd_fast_ema").notNull().default(12),
  macdSlowEma: integer("macd_slow_ema").notNull().default(26),
  macdSignal: integer("macd_signal").notNull().default(9),
  bbPeriod: integer("bb_period").notNull().default(20),
  bbDeviation: real("bb_deviation").notNull().default(2.0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBotConfigSchema = createInsertSchema(botConfigTable).omit({ id: true, updatedAt: true });
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigTable.$inferSelect;
