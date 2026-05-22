import { BotStatus, ExchangeName, LogLevel, OpportunityStatus, TradeMode, TradeStatus, UserRole } from '@prisma/client'

export interface JwtUser {
  id: string
  email: string
  role: UserRole
}

export interface AuthPayload {
  email: string
  password: string
}

export interface RegisterPayload extends AuthPayload {}

export interface LoginPayload extends AuthPayload {}

export interface WalletPublicView {
  address: string
  chainId: number
  keyVersion: number
  createdAt: Date
  updatedAt: Date
}

export interface MarketTicker {
  exchange: ExchangeName
  pair: string
  lastPrice: number
  bid: number
  ask: number
  volume24h: number | null
  high24h: number | null
  low24h: number | null
  latencyMs: number | null
  timestamp: Date
}

export interface OpportunityView {
  id: string
  pair: string
  buyExchange: ExchangeName
  sellExchange: ExchangeName
  buyPrice: number
  sellPrice: number
  spread: number
  netSpread: number
  estProfit: number
  confidence: number
  status: OpportunityStatus
  createdAt: Date
  executedAt: Date | null
  metadata: unknown
}

export interface TradeView {
  id: string
  pair: string
  buyExchange: ExchangeName
  sellExchange: ExchangeName
  buyPrice: number
  sellPrice: number
  amount: number
  fees: number
  netProfit: number
  status: TradeStatus
  mode: TradeMode
  route: string
  executedAt: Date | null
  createdAt: Date
}

export interface BotConfigView {
  tradingPair: string
  executionMode: TradeMode
  minSpreadThreshold: number
  maxTradeSize: number
  maxDailyTrades: number
  slippageTolerance: number
  dailyLossLimit: number
}

export interface BotStateView {
  status: BotStatus
  currentMode: TradeMode
  totalOpportunities: number
  totalTrades: number
  todayPnl: number
  winRate: number
  virtualBalance: number
  lastStartedAt: Date | null
  lastStoppedAt: Date | null
}

export interface AssetBalance {
  asset: string
  free: number
  price: number
  usdValue: number
}

export interface ExchangePortfolio {
  exchange: ExchangeName
  connected: boolean
  error?: string
  assets: AssetBalance[]
  totalUsdValue: number
}

export interface PortfolioView {
  mode: TradeMode
  exchanges: ExchangePortfolio[]
  totalUsdValue: number
  walletAddress?: string
  walletEthBalance?: number
  walletUsdValue?: number
}

export interface PortfolioHistoryPoint {
  totalValue: number
  dailyChange: number | null
  createdAt: Date
}

export interface BotLogView {
  id: string
  level: LogLevel
  message: string
  metadata: unknown
  createdAt: Date
}

export interface PriceQueryResult {
  pair: string
  exchange: ExchangeName
  bid: number
  ask: number
  lastPrice: number
  volume24h: number | null
  high24h: number | null
  low24h: number | null
  timestamp: Date
}

export interface BotRuntimeConfig {
  userId: string
  tradingPair: string
  executionMode: TradeMode
  minSpreadThreshold: number
  maxTradeSize: number
  maxDailyTrades: number
  slippageTolerance: number
  dailyLossLimit: number
}

export interface ExecuteOpportunityInput {
  userId: string
  opportunity: {
    pair: string
    buyExchange: ExchangeName
    sellExchange: ExchangeName
    buyPrice: number
    sellPrice: number
    spread: number
    netSpread: number
    estProfit: number
    confidence: number
  }
  config: BotRuntimeConfig
}

export interface ApiListResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

export interface ExchangeCredInput {
  apiKey: string
  encryptedSecret: string
  iv: string
  authTag: string
  passphrase?: string
}

export interface LiveTradeInput {
  userId: string
  opportunity: {
    pair: string
    buyExchange: ExchangeName
    sellExchange: ExchangeName
    buyPrice: number
    sellPrice: number
    spread: number
    netSpread: number
    estProfit: number
    confidence: number
  }
  config: BotRuntimeConfig
  buyCred: ExchangeCredInput
  sellCred: ExchangeCredInput
}