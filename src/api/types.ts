export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export type ApiListResponse<T> = {
  success: boolean
  message: string
  data: {
    items: T[]
    page: number
    limit: number
    total: number
  }
}

export type UserRole = 'USER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'DISABLED'
export type ExchangeName = 'OKX' | 'KRAKEN' | 'KUCOIN'
export type TradeMode = 'PAPER' | 'LIVE'
export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR'
export type TradeStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type OpportunityStatus = 'NEW' | 'EXECUTED' | 'EXPIRED' | 'REJECTED'
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  walletAddress: string | null
  createdAt: string
  updatedAt: string
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type WalletPublicView = {
  address: string
  chainId: number
  keyVersion: number
  createdAt: string
  updatedAt: string
}

export type PriceData = {
  exchange: ExchangeName
  pair: string
  lastPrice: number
  bid: number
  ask: number
  volume24h: number | null
  high24h: number | null
  low24h: number | null
  latencyMs: number | null
  timestamp: string
}

export type Opportunity = {
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
  createdAt: string
  executedAt: string | null
  metadata: unknown
}

export type Trade = {
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
  executedAt: string | null
  createdAt: string
}

export type TradeStats = {
  totalTrades: number
  winRate: number
  totalNetProfit: number
  avgProfit: number
  profitableTrades: number
  losingTrades: number
  largestProfit: number
  largestLoss: number
}

export type BotConfig = {
  tradingPair: string
  executionMode: TradeMode
  minSpreadThreshold: number
  maxTradeSize: number
  maxDailyTrades: number
  slippageTolerance: number
  dailyLossLimit: number
}

export type BotState = {
  status: BotStatus
  currentMode: TradeMode
  totalOpportunities: number
  totalTrades: number
  todayPnl: number
  winRate: number
  virtualBalance?: number | string | null
  lastStartedAt: string | null
  lastStoppedAt: string | null
}

export type BotLog = {
  id: string
  level: LogLevel
  message: string
  metadata: unknown
  createdAt: string
}

export type PortfolioBalance = {
  exchange: ExchangeName
  totalValue: number
  usdt: number
  eth: number
  ethValue: number
  connected: boolean
}

export type PortfolioHistoryPoint = {
  totalValue: number
  dailyChange: number | null
  createdAt: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type AdminStats = {
  totalUsers: number
  activeUsers: number
  totalTrades: number
  totalProfit: number
  activeBots: number
  totalVolume: number
}

export type AdminUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  tradingMode: TradeMode
  walletAddress: string | null
  createdAt: string
  updatedAt: string
}

export type SystemConfig = {
  globalKillSwitch: boolean
  maxTradeSize: number
  minSpreadThreshold: number
  maxDailyTrades: number
  slippageTolerance: number
  dailyLossLimit: number
  allowedPairs: string[]
  allowedExchanges: ExchangeName[]
}


export type RegisterPayload = LoginPayload
