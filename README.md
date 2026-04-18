# UltraTrader Bot

A full-stack MetaTrader 5 auto-trading web app. Users connect their MT5 broker account via [MetaApi](https://metaapi.cloud) and the bot trades automatically based on configurable strategy settings.

---

## Features

- Connect any MT5 broker account (Just Markets, XM, RCG Markets, IC Markets, Pepperstone, etc.)
- 5 built-in trading strategies: MA Crossover, RSI, MACD, Bollinger Bands, Combined multi-signal
- Full risk management: lot size, stop loss, take profit, max drawdown
- Trade limits: max daily trades, max positions, spread filter, session filter
- Live dashboard: account balance, equity, open trades, win/loss stats
- Full trade history with P&L coloring
- Standalone MQL5 Expert Advisor (`mt5-ea/UltraTraderBot.mq5`) for direct MT5 terminal use

---

## Project Structure

```
/
├── artifacts/
│   ├── api-server/       # Express backend (Node.js)
│   └── trader-bot/       # React + Vite frontend
├── lib/
│   ├── db/               # Drizzle ORM schema + migrations
│   ├── api-spec/         # OpenAPI spec
│   └── api-client-react/ # Auto-generated React query hooks
└── mt5-ea/               # Standalone MQL5 Expert Advisor
```

---

## Local Development

**Requirements:** Node.js 20+, pnpm, PostgreSQL

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (port 5173)
pnpm --filter @workspace/trader-bot run dev
```

---

## Deploying to Render

Deploy as **two separate Web Services** on [render.com](https://render.com).

### Service 1 — API Server (Backend)

| Setting | Value |
|---|---|
| **Root Directory** | `artifacts/api-server` |
| **Runtime** | Node |
| **Build Command** | `cd ../.. && npm install -g pnpm && pnpm install && pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./dist/index.mjs` |

**Environment Variables:**

| Key | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SESSION_SECRET` | A long random secret string |
| `NODE_ENV` | `production` |

---

### Service 2 — Frontend (Web App)

| Setting | Value |
|---|---|
| **Root Directory** | `artifacts/trader-bot` |
| **Runtime** | Node |
| **Build Command** | `cd ../.. && npm install -g pnpm && pnpm install && pnpm --filter @workspace/trader-bot run build` |
| **Start Command** | `npx serve -s dist -l $PORT` |

**Environment Variables:**

| Key | Value |
|---|---|
| `VITE_API_URL` | URL of your deployed API server (e.g. `https://ultratrader-api.onrender.com`) |
| `NODE_ENV` | `production` |

---

## MetaApi Setup

1. Sign up at [metaapi.cloud](https://metaapi.cloud)
2. Add your MT5 account in the MetaApi dashboard
3. Copy the generated **Account ID**
4. Go to **API tokens** and create a new token
5. Enter both in the web app's Connect page

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Shadcn/ui, TanStack Query, Wouter
- **Backend:** Express 5, Node.js, Drizzle ORM, Zod
- **Database:** PostgreSQL
- **API:** OpenAPI 3.0 spec with auto-generated hooks via Orval
- **MT5 Bridge:** MetaApi Cloud SDK (metaapi.cloud)
