import { create } from 'zustand'
import {
  botApi,
  portfolioApi,
  pricesApi,
  tradesApi,
  walletApi,
} from '@/api'
import type {
  BotConfig,
  BotLog,
  BotState,
  Opportunity,
  PortfolioBalance,
  PortfolioHistoryPoint,
  PriceData,
  Trade,
  TradeStats,
  WalletPublicView,
} from '@/api/types'

export type RealtimeEventPayloads =
  | { type: 'prices:update'; payload: PriceData[] }
  | { type: 'opportunity:new'; payload: Opportunity }
  | { type: 'trade:new'; payload: Trade }
  | { type: 'bot:status'; payload: BotState }
  | { type: 'bot:log'; payload: BotLog }
  | { type: 'portfolio:update'; payload: PortfolioBalance[] | PortfolioHistoryPoint[] }

const DEFAULT_CONFIG: BotConfig = {
  tradingPair: 'ETH/USDT',
  executionMode: 'PAPER',
  minSpreadThreshold: 0.3,
  maxTradeSize: 1000,
  maxDailyTrades: 50,
  slippageTolerance: 0.1,
  dailyLossLimit: 200,
}

const DEFAULT_BOT_STATE: BotState = {
  status: 'IDLE',
  currentMode: 'PAPER',
  totalOpportunities: 0,
  totalTrades: 0,
  todayPnl: 0,
  winRate: 0,
  lastStartedAt: null,
  lastStoppedAt: null,
}

function priceKey(exchange: string, pair: string) {
  return `${exchange.toLowerCase()}:${pair}`
}

function putNewestFirst<T extends { id: string; createdAt?: string | null }>(items: T[], next: T, limit = 200) {
  const filtered = items.filter((item) => item.id !== next.id)
  return [next, ...filtered].slice(0, limit)
}

function upsertPrices(existing: Record<string, PriceData>, incoming: PriceData[]) {
  const next = { ...existing }
  for (const tick of incoming) {
    next[priceKey(tick.exchange, tick.pair)] = tick
  }
  return next
}

function mergeHistory(existing: PortfolioHistoryPoint[], incoming: PortfolioHistoryPoint[]) {
  const seen = new Set<string>()
  return [...incoming, ...existing].filter((point) => {
    if (seen.has(point.createdAt)) return false
    seen.add(point.createdAt)
    return true
  })
}

interface TradingStore {
  botState: BotState
  config: BotConfig
  logs: BotLog[]
  opportunities: Opportunity[]
  trades: Trade[]
  prices: Record<string, PriceData>
  portfolioBalances: PortfolioBalance[]
  portfolioHistory: PortfolioHistoryPoint[]
  tradeStats: TradeStats | null
  wallet: WalletPublicView | null
  socketConnected: boolean
  loading: boolean
  error: string | null

  refreshAll: () => Promise<void>
  refreshPrices: () => Promise<void>
  refreshTrades: (params?: { page?: number; limit?: number; status?: string; pair?: string }) => Promise<void>
  startBot: () => Promise<void>
  stopBot: () => Promise<void>
  pauseBot: () => Promise<void>
  updateConfig: (partial: Partial<BotConfig>) => Promise<void>
  rotateWallet: () => Promise<void>
  setSocketConnected: (connected: boolean) => void
  applyRealtimeEvent: (event: RealtimeEventPayloads) => void
  clearError: () => void
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unable to load trading data.'
}

export const useBotStore = create<TradingStore>()((set, get) => ({
  botState: DEFAULT_BOT_STATE,
  config: DEFAULT_CONFIG,
  logs: [],
  opportunities: [],
  trades: [],
  prices: {},
  portfolioBalances: [],
  portfolioHistory: [],
  tradeStats: null,
  wallet: null,
  socketConnected: false,
  loading: false,
  error: null,

  refreshAll: async () => {
    set({ loading: true, error: null })
    try {
      const [statusRes, configRes, opportunitiesRes, logsRes, tradesRes, pricesRes, balancesRes, historyRes, statsRes, walletRes] =
        await Promise.all([
          botApi.getStatus(),
          botApi.getConfig(),
          botApi.getOpportunities(),
          botApi.getLogs({ page: 1, limit: 50 }),
          tradesApi.getAll({ page: 1, limit: 50 }),
          pricesApi.getCurrent(),
          portfolioApi.getBalances(),
          portfolioApi.getHistory({ period: '30d' }),
          tradesApi.getStats({ period: '30d' }),
          walletApi.me(),
        ])

      set({
        botState: statusRes.data.data,
        config: configRes.data.data,
        opportunities: opportunitiesRes.data.data,
        logs: logsRes.data.data.items,
        trades: tradesRes.data.data.items,
        prices: upsertPrices({}, pricesRes.data.data),
        portfolioBalances: balancesRes.data.data,
        portfolioHistory: historyRes.data.data,
        tradeStats: statsRes.data.data,
        wallet: walletRes.data.data,
      })
    } catch (error) {
      set({ error: normalizeError(error) })
    } finally {
      set({ loading: false })
    }
  },

  refreshPrices: async () => {
    try {
      const response = await pricesApi.getCurrent()
      set((state) => ({ prices: upsertPrices(state.prices, response.data.data) }))
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  refreshTrades: async (params) => {
    try {
      const response = await tradesApi.getAll(params)
      set({ trades: response.data.data.items })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  startBot: async () => {
    try {
      const response = await botApi.start()
      set({ botState: response.data.data })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  stopBot: async () => {
    try {
      const response = await botApi.stop()
      set({ botState: response.data.data })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  pauseBot: async () => {
    try {
      const response = await botApi.pause()
      set({ botState: response.data.data })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  updateConfig: async (partial) => {
    try {
      const response = await botApi.updateConfig(partial)
      set({ config: response.data.data })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  rotateWallet: async () => {
    try {
      const response = await walletApi.rotate()
      set({ wallet: response.data.data })
    } catch (error) {
      set({ error: normalizeError(error) })
    }
  },

  setSocketConnected: (connected) => set({ socketConnected: connected }),

  applyRealtimeEvent: (event) => {
    if (event.type === 'prices:update') {
      set((state) => ({ prices: upsertPrices(state.prices, event.payload) }))
      return
    }

    if (event.type === 'opportunity:new') {
      set((state) => ({
        opportunities: putNewestFirst(state.opportunities, event.payload, 100),
        botState: {
          ...state.botState,
          totalOpportunities: state.botState.totalOpportunities + 1,
        },
      }))
      return
    }

    if (event.type === 'trade:new') {
      set((state) => ({
        trades: putNewestFirst(state.trades, event.payload, 200),
        botState: {
          ...state.botState,
          totalTrades: state.botState.totalTrades + 1,
        },
      }))
      return
    }

    if (event.type === 'bot:status') {
      set({ botState: event.payload })
      return
    }

    if (event.type === 'bot:log') {
      set((state) => ({ logs: putNewestFirst(state.logs, event.payload, 250) }))
      return
    }

    if (Array.isArray(event.payload)) {
      if (event.type === 'portfolio:update') {
        if (event.payload.length > 0 && 'connected' in event.payload[0]) {
          set({ portfolioBalances: event.payload as PortfolioBalance[] })
        } else {
          set((state) => ({ portfolioHistory: mergeHistory(state.portfolioHistory, event.payload as PortfolioHistoryPoint[]) }))
        }
      }
    }
  },

  clearError: () => set({ error: null }),
}))

export { priceKey }
