# Crypto Arbitrage Trading Bot — Backend

A production-ready Node.js/TypeScript backend for a multi-exchange cryptocurrency arbitrage trading bot. Supports **paper trading** (simulated, virtual money) and **live trading** (real orders via exchange APIs), with per-user isolated bot loops, real-time WebSocket updates, and a full REST API.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment Variables](#environment-variables)
7. [Database Setup](#database-setup)
8. [Running the Server](#running-the-server)
9. [Project Structure](#project-structure)
10. [API Reference](#api-reference)
11. [WebSocket Events](#websocket-events)
12. [Trading Modes](#trading-modes)
13. [Bot Lifecycle](#bot-lifecycle)
14. [Adding Exchange Credentials (Live Trading)](#adding-exchange-credentials-live-trading)
15. [Supported Exchanges & Pairs](#supported-exchanges--pairs)
16. [Security](#security)

---

## Overview

This backend powers a crypto arbitrage bot that monitors price differences across multiple centralized exchanges (Binance, Kraken, KuCoin) and executes trades to capture profit from the spread.

**Paper mode** — the bot uses a virtual $10,000 balance to simulate every trade with real market data. All P&L, win rate, and trade history are recorded to the database so you can evaluate performance before going live.

**Live mode** — the bot checks your Ethereum wallet balance on-chain (via ethers.js), verifies you have sufficient capital, then fires simultaneous market buy/sell orders on both legs of the arbitrage using your stored exchange API keys.

Multiple users can run bots at the same time. Each user's bot runs in its own independent timer loop and never blocks other users.

---

## Architecture

```
HTTP Client / WebSocket Client
         │
         ▼
    Express App (src/app.ts)
         │
    ┌────┴─────┐
    │  Routes  │  /api/auth  /api/bot  /api/trades  /api/prices  /api/portfolio  /api/wallet
    └────┬─────┘
         │
    ┌────┴─────────────────────────────────────────┐
    │               Services                        │
    │  AuthService   BotService   TradeService      │
    │  MarketDataService  ExchangeService           │
    │  WalletService  PortfolioService  LogService  │
    └────┬──────────────────────────────────────────┘
         │
    ┌────┴──────────────────────┐
    │  Prisma ORM (PostgreSQL)  │
    └───────────────────────────┘

Real-time:
    BotService (per-user timers)
         │
         ├── MarketDataService (price polling every BOT_LOOP_INTERVAL_MS)
         │         └── CCXT (Binance / Kraken / KuCoin)
         │
         └── SocketService (Socket.io)
                   └── Push events to authenticated WebSocket clients
```

**Per-user bot isolation** — `BotService` keeps a `Map<userId, NodeJS.Timeout>`. When a user starts their bot a dedicated timer is created for them. `start()`, `stop()`, and `pause()` control only that user's timer. Server restarts automatically re-attach timers for bots that were `RUNNING` at shutdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| HTTP framework | Express 4 |
| ORM | Prisma 5 (PostgreSQL) |
| Exchange integration | CCXT 4 |
| Wallet / blockchain | ethers.js 6 |
| Real-time | Socket.io 4 |
| Authentication | JSON Web Tokens (jsonwebtoken) |
| Password hashing | bcryptjs |
| Validation | Zod |
| Logging | Pino + pino-pretty |
| Encryption | Node.js built-in `crypto` (AES-256-GCM) |

---

## Prerequisites

- **Node.js** v20 or newer
- **npm** v9 or newer
- A **PostgreSQL** database (local, [Neon](https://neon.tech), Supabase, Railway, etc.)

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd crypto-arbitrage-trading-bot

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your values
cp .env.example .env
# then edit .env — see Environment Variables section below

# 4. Push the database schema and generate the Prisma client
npx prisma db push

# 5. Start the development server
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root. Every variable listed below is **required** unless a default is shown.

```env
# ── Server ────────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development           # development | test | production

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ── JWT ───────────────────────────────────────────────────────────────────────
# Both secrets must be at least 32 characters long.
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
ACCESS_TOKEN_TTL=60m           # access token lifetime  (default: 60m)
REFRESH_TOKEN_TTL=30d          # refresh token lifetime (default: 30d)

# ── Wallet encryption ─────────────────────────────────────────────────────────
# Must be a base64-encoded 32-byte key (exactly 44 base64 chars).
# Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
WALLET_ENCRYPTION_KEY=your-base64-32-byte-key=

# ── Market data ───────────────────────────────────────────────────────────────
MARKET_POLL_INTERVAL_MS=5000   # how often to fetch prices from exchanges (ms)
BOT_LOOP_INTERVAL_MS=5000      # how often each user's bot cycle runs (ms)

# ── Bot defaults (applied when a new user's bot config is created) ────────────
MIN_SPREAD_THRESHOLD=0.003     # minimum net spread required to act (0.3%)
DEFAULT_MAX_TRADE_SIZE=1000    # maximum USD size per trade
DEFAULT_MAX_DAILY_TRADES=50    # daily trade cap per user
DEFAULT_SLIPPAGE_TOLERANCE=0.001
DEFAULT_DAILY_LOSS_LIMIT=100   # auto-pause if daily P&L drops below -$100

# ── Exchange & pair configuration ─────────────────────────────────────────────
# Comma-separated list of pairs to monitor (use exchange symbol format)
SUPPORTED_PAIRS=ETH/USDT,BTC/USDT

# Comma-separated list of exchanges to connect to
EXCHANGES=binance,kraken,kucoin

# ── Ethereum RPC (for live trading balance checks) ───────────────────────────
# Use a free public RPC or a private one from Alchemy / Infura for reliability
ETHEREUM_RPC_URL=https://cloudflare-eth.com
```

### Generating secrets

```bash
# JWT secret (run twice for access + refresh)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Wallet encryption key (must decode to exactly 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Setup

The project uses Prisma with PostgreSQL.

```bash
# Push the full schema to the database (creates all tables) and regenerate the client
npx prisma db push

# Open Prisma Studio to inspect data in the browser
npx prisma studio

# If you are using migrations (recommended for production)
npx prisma migrate dev --name init
```

### Schema overview

| Model | Purpose |
|---|---|
| `User` | Account with email/password, role, status |
| `Wallet` | Per-user Ethereum wallet (private key encrypted at rest) |
| `BotConfig` | Per-user bot parameters (pair, mode, limits) |
| `BotState` | Per-user bot runtime state (status, P&L, virtual balance) |
| `ExchangeCredential` | Per-user, per-exchange API keys (secret encrypted at rest) |
| `Trade` | Executed or failed trades (PAPER and LIVE) |
| `Opportunity` | Detected arbitrage opportunities |
| `PriceSnapshot` | Historical price data from all exchanges |
| `PortfolioSnapshot` | Periodic portfolio value snapshots |
| `BotLog` | Bot activity log (INFO / WARN / ERROR) |
| `RefreshToken` | Stored hashed refresh tokens |

---

## Running the Server

```bash
# Development (hot-reload via tsx)
npm run dev

# Production build
npm run build
npm start

# Prisma helpers
npm run prisma:generate   # regenerate the Prisma client after schema changes
npm run prisma:migrate    # create + apply a migration
npm run prisma:studio     # open Prisma Studio
```

The server starts on `http://localhost:PORT` (default `4000`).

---

## Project Structure

```
src/
├── app.ts                   # Express app factory (CORS, middleware, routes)
├── server.ts                # HTTP server entry point, bootstraps bot + sockets
├── config/
│   ├── env.ts               # Zod-validated environment config
│   ├── logger.ts            # Pino logger instance
│   └── prisma.ts            # Prisma client singleton
├── lib/
│   ├── crypto.ts            # AES-256-GCM encrypt / decrypt helpers
│   ├── errors.ts            # ApiError class + asyncHandler wrapper
│   ├── jwt.ts               # Sign / verify access & refresh tokens
│   ├── pagination.ts        # Pagination helper (page, limit, skip)
│   └── response.ts          # Typed ok() response helper
├── middleware/
│   ├── auth.ts              # requireAuth — validates Bearer token
│   ├── error.ts             # Global error handler (ApiError, Prisma, Zod, dev messages)
│   └── validate.ts          # validateBody / validateQuery Zod middleware
├── routes/
│   ├── index.ts             # Router aggregator
│   ├── authRoutes.ts        # /api/auth/*
│   ├── botRoutes.ts         # /api/bot/*
│   ├── portfolioRoutes.ts   # /api/portfolio/*
│   ├── pricesRoutes.ts      # /api/prices/*
│   ├── tradesRoutes.ts      # /api/trades/*
│   └── walletRoutes.ts      # /api/wallet/*
├── services/
│   ├── arbitrageService.ts  # Detect arbitrage opportunities from price data
│   ├── authService.ts       # Register, login, refresh, logout, me
│   ├── botService.ts        # Per-user bot timers, paper & live execution
│   ├── exchangeService.ts   # CCXT price fetching + authenticated order placement
│   ├── logService.ts        # BotLog CRUD
│   ├── marketDataService.ts # Price polling, caching, tick events
│   ├── portfolioService.ts  # Portfolio balances and history snapshots
│   ├── socketService.ts     # Socket.io server, per-user room management
│   ├── tradeService.ts      # Trade CRUD, paper execute, live execute
│   └── walletService.ts     # Wallet create, view, rotate
└── types/
    ├── domain.ts            # All shared TypeScript interfaces
    └── express.d.ts         # Express Request augmentation (req.user)
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <accessToken>` header.

### Health check

```
GET /health
```
Returns `{ success: true, message: "ok", data: { status: "healthy" } }`.

---

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Create account; returns user + token pair |
| `POST` | `/login` | — | Authenticate; returns user + token pair |
| `POST` | `/refresh` | — | Exchange refresh token for a new token pair |
| `POST` | `/logout` | ✓ | Revoke all refresh tokens for the user |
| `GET` | `/me` | ✓ | Return the authenticated user's profile |

**Register / Login body:**
```json
{ "email": "user@example.com", "password": "min8chars" }
```

**Refresh body:**
```json
{ "refreshToken": "<token>" }
```

**Response (register & login):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id": "...", "email": "...", "role": "USER", "walletAddress": "0x..." },
    "tokens": { "accessToken": "...", "refreshToken": "..." }
  }
}
```

---

### Bot — `/api/bot` *(all protected)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/status` | Current bot state (status, P&L, virtual balance, win rate) |
| `POST` | `/start` | Start the bot (validates ETH balance if mode is LIVE) |
| `POST` | `/stop` | Stop the bot and clear the timer |
| `POST` | `/pause` | Pause the bot (can be restarted later) |
| `GET` | `/config` | Read bot configuration |
| `PUT` | `/config` | Update bot configuration |
| `GET` | `/opportunities` | Last 20 detected arbitrage opportunities |
| `GET` | `/logs` | Paginated bot activity log |

**PUT /config body** (all fields optional):
```json
{
  "tradingPair": "ETH/USDT",
  "executionMode": "PAPER",
  "minSpreadThreshold": 0.003,
  "maxTradeSize": 1000,
  "maxDailyTrades": 50,
  "slippageTolerance": 0.001,
  "dailyLossLimit": 100
}
```

`executionMode` must be `"PAPER"` or `"LIVE"`.

**GET /status response:**
```json
{
  "success": true,
  "data": {
    "status": "RUNNING",
    "currentMode": "PAPER",
    "totalOpportunities": 42,
    "totalTrades": 18,
    "todayPnl": 34.72,
    "winRate": 77.8,
    "virtualBalance": 10034.72,
    "lastStartedAt": "2026-05-21T10:00:00.000Z",
    "lastStoppedAt": null
  }
}
```

**GET /logs query parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `level` | string | Filter by log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |

---

### Prices — `/api/prices` *(all protected)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/current` | Latest prices from all active exchanges |
| `GET` | `/history` | Historical price snapshots for a given pair |

**GET /current query parameters:**

| Param | Example | Description |
|---|---|---|
| `pairs` | `ETH/USDT,BTC/USDT` | Comma-separated pairs to filter |
| `exchanges` | `binance,kraken` | Comma-separated exchanges to filter |

**GET /history query parameters:**

| Param | Required | Example | Description |
|---|---|---|---|
| `pair` | ✓ | `ETH/USDT` | Trading pair |
| `exchange` | — | `BINANCE` | Filter by exchange |
| `limit` | — | `100` | Number of snapshots (max 500) |

---

### Trades — `/api/trades` *(all protected)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Paginated trade list for the authenticated user |
| `GET` | `/stats` | Aggregated trade statistics |
| `GET` | `/:id` | Single trade by ID |

**GET / query parameters:**

| Param | Description |
|---|---|
| `page` | Page number |
| `limit` | Items per page |
| `status` | Filter: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `pair` | Filter by trading pair |

**GET /stats query parameters:**

| Param | Options | Description |
|---|---|---|
| `period` | `24h`, `7d`, `30d`, `all` | Time window for stats (default: `30d`) |

**Stats response:**
```json
{
  "data": {
    "totalTrades": 42,
    "winRate": 73.8,
    "totalNetProfit": 284.50,
    "avgProfit": 6.77,
    "profitableTrades": 31,
    "losingTrades": 11,
    "largestProfit": 48.20,
    "largestLoss": -12.30
  }
}
```

---

### Portfolio — `/api/portfolio` *(all protected)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/balances` | Current portfolio allocation across exchanges |
| `GET` | `/history` | Portfolio value history snapshots |

**GET /history query parameters:**

| Param | Options | Default |
|---|---|---|
| `period` | `24h`, `7d`, `30d`, `90d` | `30d` |

---

### Wallet — `/api/wallet` *(all protected)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/me` | View wallet address and metadata (private key never exposed) |
| `POST` | `/rotate` | Generate a new Ethereum wallet and re-encrypt (replaces old key) |

**Wallet response:**
```json
{
  "data": {
    "address": "0xAbC...123",
    "chainId": 1,
    "keyVersion": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### Error responses

All errors follow the same shape:

```json
{
  "success": false,
  "message": "Descriptive error message here",
  "data": null
}
```

For validation errors, `data` contains the field-level breakdown:

```json
{
  "success": false,
  "message": "Invalid request body",
  "data": {
    "fieldErrors": { "email": ["Invalid email"] },
    "formErrors": []
  }
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `400` | Validation failed or bad input |
| `401` | Missing, invalid, or expired token |
| `404` | Resource not found |
| `409` | Conflict (e.g. email already registered) |
| `500` | Server error (message shown in `development` mode) |

---

## WebSocket Events

Connect with Socket.io. The client must authenticate by sending the access token in the handshake:

```js
import { io } from 'socket.io-client'

const socket = io('http://localhost:4000', {
  auth: { token: accessToken }
})
```

### Events emitted **to the client**

| Event | Payload | When |
|---|---|---|
| `prices:update` | `MarketTicker[]` | Every market data tick |
| `opportunity:new` | `Opportunity` | An arbitrage opportunity is detected |
| `trade:new` | `Trade` | A trade is executed (paper or live) |
| `bot:status` | `BotStateView` | After each successful trade |
| `bot:paused` | `{ reason: string }` | Bot auto-paused (daily loss limit hit) |
| `bot:error` | `{ message: string }` | Recoverable bot error (e.g. low balance, missing credentials) |

---

## Trading Modes

### Paper Trading (`executionMode: "PAPER"`)

- No real money involved.
- Each user starts with a **$10,000 virtual balance** tracked in `BotState.virtualBalance`.
- Each detected opportunity triggers a simulated trade:
  - Trade size = `min(maxTradeSize, virtualBalance × 95%)`
  - Exchange fees are applied at 0.1% per leg.
  - `netProfit` is added to (or subtracted from) `virtualBalance`.
- Every paper trade is recorded in the `Trade` table with `mode: PAPER`.
- Use paper mode to validate your configuration before risking real funds.

### Live Trading (`executionMode: "LIVE"`)

**Step 1 — Balance check (on `POST /bot/start` and before every trade cycle):**
- The bot fetches the ETH balance of the user's Ethereum wallet on-chain via `ethers.JsonRpcProvider`.
- It converts the ETH balance to USD using the latest `ETH/USDT` market price.
- If `balanceUsd < maxTradeSize`, the bot throws an error with the exact shortfall and the wallet address to top up.

**Step 2 — Exchange credentials check:**
- The bot looks up `ExchangeCredential` rows for both the buy exchange and the sell exchange.
- If either is missing, it emits `bot:error` with a clear message listing which credentials are needed.

**Step 3 — Order execution:**
- Both legs fire simultaneously via `Promise.allSettled`:
  - **Buy** — market buy on the cheaper exchange.
  - **Sell** — market sell on the more expensive exchange.
- If both orders fill → `Trade.status = COMPLETED`, P&L recorded.
- If either order fails → `Trade.status = FAILED`, error details logged to `BotLog`.

---

## Bot Lifecycle

```
IDLE ──start()──► RUNNING ──stop()───► STOPPED
                     │
                  pause()
                     │
                     ▼
                  PAUSED ──start()──► RUNNING
                     │
                  (daily loss limit or balance too low)
                     │
                     ▼
                  PAUSED  (emits bot:paused event)
```

**Daily safeguards (enforced every bot cycle):**
- `maxDailyTrades` — stops trading for the rest of the day once reached.
- `dailyLossLimit` — auto-pauses the bot if `todayPnl ≤ -dailyLossLimit`.

**Server restart recovery:** On startup `botService.bootstrap()` queries all `BotState` rows where `status = RUNNING` and re-attaches a live timer for each one, so no bot is left orphaned after a restart.

---

## Adding Exchange Credentials (Live Trading)

Exchange API keys need to be stored so the bot can place real orders. Add a `POST /api/bot/credentials` endpoint (or use a direct DB insert for now) that accepts:

```json
{
  "exchange": "BINANCE",
  "apiKey": "your-api-key",
  "secret": "your-api-secret",
  "passphrase": "only-needed-for-kucoin"
}
```

The handler should:
1. Encrypt the secret: `encryptSecret(secret)` → `{ encryptedText, iv, authTag }`
2. Upsert into `ExchangeCredential`:
   ```ts
   prisma.exchangeCredential.upsert({
     where: { userId_exchange: { userId, exchange } },
     update: { apiKey, encryptedSecret: encryptedText, iv, authTag, passphrase },
     create: { userId, exchange, apiKey, encryptedSecret: encryptedText, iv, authTag, passphrase }
   })
   ```

**Required exchange API permissions:**
- Binance: `Enable Spot & Margin Trading`
- Kraken: `Trade` (Query + Create & Modify Orders)
- KuCoin: `Trade` permission + passphrase

> **Important:** API keys are stored encrypted with AES-256-GCM. The raw secret is never written to the database or logged.

---

## Supported Exchanges & Pairs

Exchanges are configured via the `EXCHANGES` environment variable (comma-separated, lowercase):

```
EXCHANGES=binance,kraken,kucoin
```

Trading pairs are configured via `SUPPORTED_PAIRS` (comma-separated, use the exchange symbol format):

```
SUPPORTED_PAIRS=ETH/USDT,BTC/USDT
```

Fee schedule used for spread calculations:

| Exchange | Taker fee |
|---|---|
| Binance | 0.10% |
| Kraken | 0.26% |
| KuCoin | 0.10% |

---

## Security

| Concern | Approach |
|---|---|
| Passwords | bcrypt with cost factor 12 |
| Access tokens | Short-lived JWT (default 60 min), signed with HS256 |
| Refresh tokens | Long-lived JWT (default 30 days); hash stored in DB, revoked on logout |
| Wallet private keys | AES-256-GCM encrypted at rest; never returned by any API endpoint |
| Exchange secrets | AES-256-GCM encrypted at rest, same key as wallet encryption |
| Encryption key | Loaded from env, validated to be exactly 32 bytes |
| CORS | Whitelist-based; localhost + ngrok patterns in dev |
| HTTP headers | Helmet.js defaults |
| Input validation | Zod schemas on all request bodies and query strings |
| Error messages | `ApiError` messages always forwarded; unhandled errors show real message in `development`, generic message in `production` |
