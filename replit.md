# UltraTrader Bot Workspace

## Overview

A full-stack MetaTrader 5 auto-trading web app built with React + Vite frontend and Express backend. Users connect their MT5 broker account via MetaApi, configure trading strategy settings, and let the bot trade automatically.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/trader-bot)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: Shadcn/ui + Tailwind CSS
- **Forms**: react-hook-form + zod resolver
- **Routing**: wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/trader-bot run dev` — run frontend locally

## Application Structure

### Frontend Pages (artifacts/trader-bot/src/pages/)
- `/` — Connect Account: Enter MetaApi token + Account ID to connect MT5 broker
- `/dashboard` — Main dashboard: account balance, bot ON/OFF toggle, live trade stats, recent trades
- `/trades` — Full trade history table with P&L coloring
- `/settings` — Strategy configurator: all strategy options, risk management, indicators, session filters

### API Routes (artifacts/api-server/src/routes/)
- `bot.ts` — Bot control: GET/PUT config, GET status, POST start/stop, POST account connect, GET account info
- `trades.ts` — Trade history: GET trades list, GET stats summary
- `health.ts` — Health check

### Database Schema (lib/db/src/schema/)
- `botConfig.ts` — Bot configuration (strategy, risk settings, indicator params)
- `trades.ts` — Trade history (symbol, type, profit, pips, timestamps)
- `accountConnection.ts` — MT5 account connection details (MetaApi token, broker info, balance)

## MetaApi Integration

The app uses MetaApi (metaapi.cloud) as the bridge to MT5 accounts:
1. User gets their MetaApi token from metaapi.cloud
2. User adds their MT5 account to MetaApi dashboard
3. User enters token + account ID in the web app to connect
4. Bot can then monitor account and place trades

## Strategy Options
- MA Crossover (trend-following)
- RSI Overbought/Oversold (mean reversion)
- MACD Signal Crossover
- Bollinger Bands Breakout
- Combined Multi-Signal (MA + RSI + MACD voting)

## Also Included
- `mt5-ea/UltraTraderBot.mq5` — A full MQL5 Expert Advisor for direct MT5 terminal use
- `mt5-ea/INSTALLATION_GUIDE.md` — Installation instructions for the EA

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
