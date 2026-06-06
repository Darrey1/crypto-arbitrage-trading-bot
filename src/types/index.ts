// ─── Exchange & Price Types ───────────────────────────────────────────────────

export type ExchangeId = 'okx' | 'kraken' | 'kucoin'

export interface ExchangeInfo {
  id: ExchangeId
  name: string
  logo: string
  color: string
  fee: number // maker/taker fee as decimal
}

export interface PriceTick {
  exchange: ExchangeId
  symbol: string
  bid: number
  ask: number
  last: number
  volume24h: number
  change24h: number
  timestamp: number
}

export interface OrderBook {
  exchange: ExchangeId
  symbol: string
  bids: [number, number][] // [price, amount]
  asks: [number, number][]
  timestamp: number
}

// ─── Arbitrage Types ──────────────────────────────────────────────────────────

export interface ArbitrageOpportunity {
  id: string
  symbol: string
  buyExchange: ExchangeId
  sellExchange: ExchangeId
  buyPrice: number
  sellPrice: number
  grossSpread: number  // %
  fees: number         // %
  netSpread: number    // %
  estimatedProfit: number // in USDT
  tradeSize: number
  detectedAt: number
  expiresAt: number
  status: 'active' | 'executed' | 'expired' | 'missed'
}

// ─── Trade Types ──────────────────────────────────────────────────────────────

export type TradeStatus = 'completed' | 'failed' | 'partial' | 'pending'
export type TradingMode = 'live' | 'paper'

export interface Trade {
  id: string
  userId: string
  mode: TradingMode
  symbol: string
  buyExchange: ExchangeId
  sellExchange: ExchangeId
  buyPrice: number
  sellPrice: number
  amount: number
  grossProfit: number
  fees: number
  netProfit: number
  status: TradeStatus
  buyOrderId?: string
  sellOrderId?: string
  executedAt: string
  createdAt: string
}

// ─── Bot Types ────────────────────────────────────────────────────────────────

export type BotStatus = 'running' | 'idle' | 'paused' | 'error' | 'stopped'
export type ExecutionMode = 'automatic' | 'manual'

export interface BotConfig {
  id: string
  userId: string
  tradingMode: TradingMode
  executionMode: ExecutionMode
  symbol: string
  minSpreadThreshold: number  // %
  maxTradeSize: number        // USDT
  maxDailyTrades: number
  slippageTolerance: number   // %
  dailyLossLimit: number      // USDT
  cooldownSeconds: number
  enabledExchanges: ExchangeId[]
}

export interface BotState {
  status: BotStatus
  tradingMode: TradingMode
  config: BotConfig | null
  opportunitiesDetected: number
  tradesExecuted: number
  totalProfitToday: number
  winRate: number
  lastScan: number | null
  uptime: number
  error?: string
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'

export interface BotLog {
  id: string
  level: LogLevel
  message: string
  timestamp: number
  data?: Record<string, unknown>
}

// ─── Portfolio Types ──────────────────────────────────────────────────────────

export interface ExchangeBalance {
  exchange: ExchangeId
  assets: { symbol: string; free: number; locked: number; usdValue: number }[]
  totalUsd: number
  lastUpdated: number
  isConnected: boolean
}

export interface ApiKeyConfig {
  exchange: ExchangeId
  apiKey: string
  secret: string
  isActive: boolean
  lastTested?: number
  isValid?: boolean
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface DailyPnL {
  date: string
  profit: number
  trades: number
  winRate: number
}

export interface PairPerformance {
  pair: string
  route: string  // e.g. "okx→kraken"
  trades: number
  profit: number
  avgSpread: number
}

export interface HourlyHeatmapCell {
  day: number   // 0=Mon, 6=Sun
  hour: number  // 0–23
  count: number
  profit: number
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  profitToday: number
  profitTodayChange: number
  opportunitiesDetected: number
  tradesExecuted: number
  winRate: number
  portfolioValue: number
  portfolioChange: number
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  createdAt: string
}

// ─── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number
  activeUsersToday: number
  totalBotsRunning: number
  totalTradesAllTime: number
  totalVolumeAllTime: number
  platformProfit: number
  systemHealth: {
    cpu: number
    memory: number
    dbConnections: number
    redisLatency: number
    activeWebSockets: number
  }
}
