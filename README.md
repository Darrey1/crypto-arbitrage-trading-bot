# ArbMatrix — Crypto Arbitrage Trading Bot

A full-stack, real-time crypto arbitrage dashboard built with Next.js 16, React 19, TypeScript, Zustand, Socket.io, and Recharts. It monitors live price feeds across **Binance**, **Kraken**, and **KuCoin**, detects spread opportunities, and lets you start, pause, and stop the trading bot — all from a single dashboard.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Prerequisites](#4-prerequisites)
5. [Environment Variables](#5-environment-variables)
6. [Installation & Running Locally](#6-installation--running-locally)
7. [Authentication System](#7-authentication-system)
8. [Pages & Routes](#8-pages--routes)
9. [API Layer](#9-api-layer)
10. [State Management](#10-state-management)
11. [Real-Time Data (Socket.io)](#11-real-time-data-socketio)
12. [Price Chart System](#12-price-chart-system)
13. [Bot Control](#13-bot-control)
14. [Admin Panel](#14-admin-panel)
15. [Architecture Decisions](#15-architecture-decisions)
16. [Deployment](#16-deployment)

---

## 1. Project Overview

ArbMatrix scans prices for the same trading pair (e.g. ETH/USDT) across three centralised exchanges simultaneously. When the price difference between exchanges exceeds a configurable spread threshold, the bot marks the opportunity and (in live mode) executes a buy on the cheaper exchange and a sell on the more expensive one, capturing the spread as profit.

**Key capabilities:**

| Capability | Detail |
|---|---|
| Live price streaming | WebSocket feed from backend, with REST polling fallback every 10 s |
| Opportunity detection | Spread > `minSpreadThreshold` triggers an `opportunity:new` event |
| Paper / Live trading | Bot runs in `PAPER` mode by default; switch to `LIVE` in settings |
| Portfolio tracking | Per-exchange balances (USDT + ETH) with 30-day history chart |
| Bot control | Start / Pause / Stop from the dashboard in real time |
| Admin panel | Manage users, view all trades, configure system-wide limits |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Component library | Radix UI primitives |
| Icons | Lucide React |
| Charts | Recharts 3 |
| State management | Zustand v5 with persist middleware |
| HTTP client | Axios with JWT interceptors |
| Real-time | Socket.io client v4 |
| Exchange data | ccxt v4 |
| ORM | Prisma v7 (backend) |
| Job queue | BullMQ + ioredis (backend) |
| Auth | JWT access/refresh tokens + session cookie |

---

## 3. Folder Structure

```
src/
├── api/                    # Axios API modules
│   ├── client.ts           # Axios instance + auth interceptors + request gate
│   ├── index.ts            # Barrel export
│   ├── auth.api.ts         # Login, register, refresh, logout
│   ├── bot.api.ts          # Bot status, start/stop/pause, config, logs
│   ├── prices.api.ts       # Current prices, price history
│   ├── portfolio.api.ts    # Balances, history
│   ├── trades.api.ts       # Trade list, stats
│   ├── wallet.api.ts       # Wallet info, key rotation
│   ├── admin.api.ts        # Admin-only endpoints
│   └── types.ts            # All shared TypeScript types
│
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout — mounts AuthProvider
│   ├── page.tsx            # Landing page "/"
│   ├── globals.css         # Global styles + CSS variables
│   ├── auth/
│   │   ├── login/          # "/auth/login"
│   │   └── register/       # "/auth/register"
│   ├── dashboard/
│   │   ├── layout.tsx      # Dashboard shell (sidebar + header)
│   │   ├── page.tsx        # Main dashboard
│   │   ├── markets/        # Price comparison charts per pair
│   │   ├── portfolio/      # Portfolio balances + history
│   │   ├── analytics/      # PnL analytics
│   │   ├── history/        # Trade history table
│   │   ├── bot/            # Bot configuration
│   │   └── settings/       # User settings
│   └── admin/
│       ├── layout.tsx      # Admin shell (admin-only guard)
│       ├── page.tsx        # Admin overview
│       ├── users/          # User management
│       ├── bots/           # All bots
│       ├── trades/         # All trades
│       ├── config/         # System-wide config
│       └── logs/           # System logs
│
├── components/
│   ├── AuthProvider.tsx    # Render gate — blocks children until auth is ready
│   ├── AuthGuard.tsx       # Per-page auth redirect guard
│   ├── ThemeProvider.tsx   # Dark/light theme context
│   ├── dashboard/
│   │   ├── PriceComparisonChart.tsx  # Three-exchange area chart
│   │   └── WalletConnect.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
│
├── hooks/
│   ├── usePriceEngine.ts   # Socket.io connection lifecycle + price polling
│   └── usePairChart.ts     # Chart data — history fetch + live stream merge
│
├── store/
│   ├── useAuthStore.ts     # Auth state — tokens, user, hydration gate
│   ├── useBotStore.ts      # All trading data — prices, bot state, opportunities
│   └── useThemeStore.ts    # UI theme preference
│
├── lib/
│   ├── utils.ts            # cn(), formatCurrency(), formatPrice(), EXCHANGES
│   └── mockPriceEngine.ts  # Local price simulator (dev without backend)
│
└── types/
    └── index.ts            # App-level TypeScript types
```

---

## 4. Prerequisites

- **Node.js** 20 or later
- **npm** or **pnpm**
- A running backend API server (NestJS / Express) that exposes the REST and Socket.io endpoints listed in section 9
- **ngrok** (optional) — for exposing a local backend during development

---

## 5. Environment Variables

Create a `.env.local` file in the project root:

```env
# Full URL of your backend API — no trailing slash
# Local backend:
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Via ngrok (free tier — update this URL every time ngrok restarts):
# NEXT_PUBLIC_API_BASE_URL=https://xxxx-xxxx.ngrok-free.app
```

> **ngrok tip:** The free tier assigns a new random URL on every restart. After restarting ngrok, copy the new URL into `.env.local` and restart the dev server (`npm run dev`) to pick up the change.

---

## 6. Installation & Running Locally

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd crypto-arbitrage-trading-bot
npm install
```

### Step 2 — Set up environment

```bash
# Create your local environment file
cp .env.local.example .env.local   # if an example file exists
# OR create it manually and add NEXT_PUBLIC_API_BASE_URL (see section 5)
```

### Step 3 — Clear any stale build cache

```bash
rm -rf .next
```

Always do this after pulling changes or changing environment variables.

### Step 4 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Step 5 — Production build

```bash
npm run build   # type-check + compile
npm run start   # serve on port 3000
```

---

## 7. Authentication System

Authentication uses **JWT access + refresh tokens** stored in Zustand's persisted store (localStorage), with a **session cookie** as a backup.

### Login flow

```
1. User submits email + password to POST /api/auth/login
2. Backend returns { accessToken, refreshToken, user }
3. Frontend stores tokens in Zustand store (persisted to localStorage key "arb-auth")
4. Frontend writes accessToken to cookie "arb-access-token" (24 h, SameSite=Lax)
5. isAuthenticated = true → redirect to /dashboard
```

### Page refresh flow

```
1. Browser loads JS bundle
2. useAuthStore.ts module evaluates
   → authReady promise created (pending)
   → void hydrateAuthStore() fires (async, fire-and-forget)
       → await persist.rehydrate()   ← reads localStorage (waits for microtask)
       → merge with cookie fallback  ← in case localStorage was cleared
       → setState({ hydrated: true, accessToken, isAuthenticated })
       → authReady resolves ✓
3. AuthProvider mounts
   → useEffect calls hydrateAuthStore() again (idempotent no-op)
   → setReady(true) once hydration confirms complete
   → children render for the first time
4. Every Axios request goes through: await authReady → token attached
```

### Token refresh (401 handling)

When any API call returns `401`, the Axios response interceptor automatically:

1. Calls `POST /api/auth/refresh` with the stored `refreshToken`
2. Replaces `accessToken` + `refreshToken` in the store and cookie
3. Retries the original failed request with the new access token
4. If the refresh call also fails — logs the user out and redirects to `/auth/login`

Only one refresh call is ever in-flight at a time (deduplicated with a shared promise).

### Key files

| File | Role |
|---|---|
| `src/store/useAuthStore.ts` | Zustand auth store, `authReady` promise, `hydrateAuthStore()` |
| `src/api/client.ts` | Axios instance — `await authReady` gate + 401 refresh interceptor |
| `src/components/AuthProvider.tsx` | Render gate — children never mount until `hydrated: true` |
| `src/components/AuthGuard.tsx` | Per-page guard — redirects unauthenticated users to login |

---

## 8. Pages & Routes

### Public

| Route | Description |
|---|---|
| `/` | Landing page |
| `/auth/login` | Email + password login form |
| `/auth/register` | New account registration |

### Dashboard (requires login)

| Route | Description |
|---|---|
| `/dashboard` | Main view: stat cards, bot control, live opportunities, portfolio trend chart, recent trades, live price sidebar |
| `/dashboard/markets` | Per-pair price comparison chart — all three exchanges plotted on one Recharts AreaChart with history + live stream |
| `/dashboard/portfolio` | Exchange balances (USDT + ETH) and 30-day portfolio value history |
| `/dashboard/analytics` | PnL analytics, win rate, profit breakdown |
| `/dashboard/history` | Paginated trade history with status and pair filters |
| `/dashboard/bot` | Bot configuration — trading pair, execution mode, spread threshold, trade size limits |
| `/dashboard/settings` | User account settings |

### Admin (requires `role: ADMIN`)

| Route | Description |
|---|---|
| `/admin` | Platform overview stats |
| `/admin/users` | List + manage all registered users |
| `/admin/bots` | All bots and their statuses |
| `/admin/trades` | All platform trades |
| `/admin/config` | System-wide config — global kill switch, max trade size, allowed pairs |
| `/admin/logs` | Real-time system log stream (DEBUG / INFO / WARN / ERROR) |

---

## 9. API Layer

All requests go through `src/api/client.ts`. Each domain has its own module under `src/api/`.

### Auth — `auth.api.ts`

```
POST /api/auth/login          { email, password }     → { user, tokens }
POST /api/auth/register       { email, password }     → { user, tokens }
POST /api/auth/refresh        { refreshToken }        → { tokens }
POST /api/auth/logout         —                       → void
```

### Bot — `bot.api.ts`

```
GET  /api/bot/status          →  BotState
GET  /api/bot/config          →  BotConfig
PUT  /api/bot/config          partial BotConfig       →  BotConfig
POST /api/bot/start           →  BotState
POST /api/bot/stop            →  BotState
POST /api/bot/pause           →  BotState
GET  /api/bot/opportunities   →  Opportunity[]
GET  /api/bot/logs            { page, limit }         →  { items: BotLog[], ... }
```

### Prices — `prices.api.ts`

```
GET  /api/prices/current      →  PriceData[]
GET  /api/prices/history      { pair, limit }         →  PriceData[] | { items: PriceData[] }
```

### Trades — `trades.api.ts`

```
GET  /api/trades              { page, limit, status, pair }  →  { items: Trade[], ... }
GET  /api/trades/stats        { period }                     →  TradeStats
```

### Portfolio — `portfolio.api.ts`

```
GET  /api/portfolio/balances  →  PortfolioBalance[]
GET  /api/portfolio/history   { period }              →  PortfolioHistoryPoint[]
```

### Wallet — `wallet.api.ts`

```
GET  /api/wallet/me           →  WalletPublicView
POST /api/wallet/rotate       →  WalletPublicView
```

### Response envelope

Every backend response uses the same JSON shape:

```typescript
// Single resource
{ success: boolean, message: string, data: T }

// Paginated list
{ success: boolean, message: string, data: { items: T[], page: number, limit: number, total: number } }
```

If `success` is `false`, `message` contains the human-readable error string. This message is extracted by `extractApiError()` in `usePairChart.ts` and displayed directly to the user.

---

## 10. State Management

### `useAuthStore` — `src/store/useAuthStore.ts`

Persisted to localStorage under the key `"arb-auth"`. Only `accessToken`, `refreshToken`, and `user` are persisted (the `hydrated` flag is always re-computed on load).

| Field | Type | Description |
|---|---|---|
| `accessToken` | `string \| null` | JWT used in `Authorization: Bearer` headers |
| `refreshToken` | `string \| null` | Used to obtain a new access token |
| `user` | `AuthUser \| null` | Logged-in user profile |
| `hydrated` | `boolean` | True after `hydrateAuthStore()` completes |
| `isAuthenticated` | `boolean` | True when `accessToken` is non-null |

Actions: `setSession`, `updateTokens`, `setUser`, `logout`, `loginDemo`

### `useBotStore` — `src/store/useBotStore.ts`

Not persisted — always sourced live from the server.

| Field | Description |
|---|---|
| `botState` | Current bot status + metrics |
| `config` | Active bot configuration |
| `opportunities` | Last 100 arbitrage opportunities (newest first) |
| `trades` | Last 200 trades |
| `prices` | Map of `"exchange:pair" → PriceData` — updated on every WebSocket tick |
| `portfolioBalances` | Per-exchange USDT + ETH balances |
| `portfolioHistory` | 30-day portfolio value series |
| `tradeStats` | Aggregate stats (win rate, total PnL, etc.) |
| `socketConnected` | Live WebSocket connection status |

Key actions: `refreshAll`, `refreshPrices`, `startBot`, `stopBot`, `pauseBot`, `updateConfig`, `applyRealtimeEvent`

---

## 11. Real-Time Data (Socket.io)

`src/hooks/usePriceEngine.ts` manages the WebSocket connection. It only connects once `hydrated && isAuthenticated && token` are all truthy — preventing premature connections on page load.

### Server → client events

| Event | Payload type | Effect |
|---|---|---|
| `price:tick` | `PriceData` | Updates `prices` map + `lastPriceTick` |
| `prices:update` | `PriceData[]` | Bulk-updates `prices` map |
| `opportunity:new` | `Opportunity` | Prepends to `opportunities` list (max 100) |
| `trade:new` | `Trade` | Prepends to `trades` list (max 200) |
| `bot:status` | `BotState` | Replaces `botState` |
| `bot:log` | `BotLog` | Prepends to `logs` list (max 250) |
| `portfolio:update` | `PortfolioBalance[] \| PortfolioHistoryPoint[]` | Updates balances or history |

### Polling fallback

If the WebSocket is unavailable or drops, two interval timers keep data fresh:
- Every **10 seconds** — `refreshPrices()` polls `GET /api/prices/current`
- Every **60 seconds** — `refreshAll()` re-fetches all endpoints

Both intervals are cleared when the component unmounts or when a new connection is established.

---

## 12. Price Chart System

### `usePairChart(pair)` hook — `src/hooks/usePairChart.ts`

Manages chart data in two phases:

**Phase 1 — History (on mount)**
1. Waits for `hydrated && isAuthenticated` before calling the API
2. Fetches `GET /api/prices/history?pair=ETH/USDT&limit=100`
3. Builds a unified time-series: each point has a timestamp and one price per exchange
4. If the API returns no data, generates 60 synthetic history points using the current live prices as the anchor and a mean-reverting random walk to simulate realistic movement

**Phase 2 — Live stream (continuous)**
1. Watches the `prices` map in `useBotStore` for changes to the selected pair
2. On every change, creates a full cross-exchange snapshot point and appends it
3. Deduplicates points that arrive within 1 second of each other
4. Keeps the last 100 points in memory

### `PriceComparisonChart` component — `src/components/dashboard/PriceComparisonChart.tsx`

Renders a Recharts `AreaChart` with gradient fills:

| Exchange | Colour |
|---|---|
| Binance | `#ECBD74` (gold) |
| Kraken | `#7C3AED` (violet) |
| KuCoin | `#10B981` (emerald) |

States: `LoadingSkeleton` (while fetching history), `EmptyState` (no data at all), full chart (normal operation). API errors appear as a dismissible banner above the chart.

---

## 13. Bot Control

The bot control panel on `/dashboard` reads `botState` and exposes three actions:

| Button | Enabled when bot status is |
|---|---|
| Start | IDLE, STOPPED, PAUSED, or ERROR |
| Pause | RUNNING |
| Stop | RUNNING or PAUSED |

All three call the corresponding `POST /api/bot/*` endpoint via `useBotStore`. If the action fails, the error message from the backend is shown inline in the panel.

The live opportunities feed below the controls updates in real time via the `opportunity:new` WebSocket event. Each card shows:
- Trading pair
- Buy exchange → sell exchange route
- Net spread %
- Estimated profit (USD)
- Status pill (NEW / EXECUTED / EXPIRED / REJECTED)

---

## 14. Admin Panel

Accessible only to users with `role: ADMIN`. The admin layout (`src/app/admin/layout.tsx`) applies its own auth guard that redirects non-admin users.

Key admin pages:

| Page | What you can do |
|---|---|
| Users | View all accounts, enable/disable, change roles |
| Bots | See all user bots and their real-time status |
| Trades | Full platform trade log with filters |
| Config | Toggle global kill switch; set platform-wide max trade size, allowed pairs, spread threshold, daily loss limit |
| Logs | Stream DEBUG / INFO / WARN / ERROR system logs in real time |

---

## 15. Architecture Decisions

### Why the `authReady` promise?

Zustand v5's `persist.rehydrate()` uses an internal `toThenable` wrapper (see `middleware.js:307`). Even though `localStorage.getItem` is synchronous, the `.then()` callback that calls `set(state)` — which actually writes the persisted values into the store — is queued as a microtask before executing. Calling `getState().accessToken` synchronously after `rehydrate()` (without `await`) would return `null` because the stored token has not been written yet.

`authReady` is a module-level Promise that only resolves **after** `await persist.rehydrate()` has fully completed and `setState()` has been called with the real token. Every Axios request interceptor does `await authReady` before reading the store, guaranteeing the token is always there.

### Three-layer defence in depth

| Layer | Mechanism | What it prevents |
|---|---|---|
| 1 — Axios gate | `await authReady` in request interceptor | Token-less requests racing ahead of hydration |
| 2 — Render gate | `AuthProvider` blocks children until `ready = true` | Components mounting and firing `useEffect` API calls before auth |
| 3 — Cookie fallback | `readCookieToken()` in interceptor | Covers edge cases where localStorage was cleared but cookie survives |

### Why `skipHydration: true` + manual `hydrateAuthStore()`?

Zustand's default auto-hydration calls `rehydrate()` immediately inside `createStore()`. In Next.js App Router, store modules are evaluated on the server (SSR) where `localStorage` doesn't exist. `skipHydration: true` prevents that error. Manual hydration (`void hydrateAuthStore()` at module level, client-only) runs as early as possible in the browser and fires `authReady` before React renders any component.

### Chart data: synthetic history as fallback

When `GET /api/prices/history` returns an empty array (e.g. the bot has only just started collecting data), the hook generates 60 synthetic data points using the current live prices as the end anchor and a mean-reverting random walk for the preceding points. This ensures the chart is always populated and visually meaningful rather than showing an empty state.

---

## 16. Deployment

### Build for production

```bash
npm run build
npm run start
```

### Required environment variable

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Authorization token is required` on every request after refresh | Token not being attached | Clear `.next` cache (`rm -rf .next`) and restart; verify `NEXT_PUBLIC_API_BASE_URL` is correct |
| `Cannot reach the API — ngrok tunnel may have expired` | ngrok URL changed | Restart ngrok, update `NEXT_PUBLIC_API_BASE_URL` in `.env.local`, restart dev server |
| Charts show only synthetic/flat data | `GET /api/prices/history` returned empty | The backend price poller needs time to accumulate records; check that the bot backend is running |
| Bot stays at IDLE after clicking Start | Backend error | Check the inline error message on the dashboard; it shows the exact backend response |
| Blank page on load for ~100 ms | Normal — `AuthProvider` render gate | The loading shell is shown while localStorage is being read; it disappears in under 10 ms |
| Stale UI after code changes | `.next` cache | `rm -rf .next && npm run dev` |
