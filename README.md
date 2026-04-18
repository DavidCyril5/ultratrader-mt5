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
│   ├── api-server/       # Express backend — also serves the built frontend in production
│   └── trader-bot/       # React + Vite frontend
├── lib/
│   ├── db/               # Mongoose models (MongoDB)
│   ├── api-spec/         # OpenAPI spec
│   └── api-client-react/ # Auto-generated React query hooks
└── mt5-ea/               # Standalone MQL5 Expert Advisor
```

---

## Local Development

**Requirements:** Node.js 20+, pnpm, MongoDB (or use MongoDB Atlas)

```bash
# Install dependencies
pnpm install

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal, port 18356)
pnpm --filter @workspace/trader-bot run dev
```

---

## Deploying to Render

Deploy as a **single Web Service** — the backend builds and serves the frontend too.

| Setting | Value |
|---|---|
| **Root Directory** | `artifacts/api-server` |
| **Build Command** | `cd ../.. && npm install -g pnpm && pnpm install && BASE_PATH=/ pnpm --filter @workspace/trader-bot run build && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./dist/index.mjs` |

**Environment Variables:**

| Key | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string (e.g. `mongodb+srv://...`) |
| `SESSION_SECRET` | Any long random string |
| `NODE_ENV` | `production` |
| `PORT` | Render sets this automatically — do not set manually |

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
- **Backend:** Express 5, Node.js
- **Database:** MongoDB + Mongoose
- **API:** OpenAPI 3.0 spec with auto-generated hooks via Orval
- **MT5 Bridge:** MetaApi Cloud SDK (metaapi.cloud)
