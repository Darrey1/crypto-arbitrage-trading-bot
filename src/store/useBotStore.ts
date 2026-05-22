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
  PortfolioBalancesResponse,
  PortfolioExchangeBalance,
  PortfolioHistoryPoint,
  PriceData,
  Trade,
  TradeStats,
  TradeMode,
  WalletPublicView,
} from '@/api/types'

export type RealtimeEventPayloads =
  | { type: 'prices:update'; payload: PriceData[] }
  | { type: 'price:tick'; payload: PriceData }
  | { type: 'opportunity:new'; payload: Opportunity }
  | { type: 'trade:new'; payload: Trade }
  | { type: 'bot:status'; payload: BotState }
  | { type: 'bot:log'; payload: BotLog }
  | { type: 'portfolio:update'; payload: PortfolioBalancesResponse | PortfolioExchangeBalance[] | PortfolioHistoryPoint[] }

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

function sumPortfolioValue(exchanges: PortfolioExchangeBalance[]) {
  return exchanges.reduce((sum, exchange) => sum + exchange.totalUsdValue, 0)
}

function normalizePortfolioSnapshot(
  payload: PortfolioBalancesResponse | PortfolioExchangeBalance[],
  mode: TradeMode,
): PortfolioBalancesResponse {
  if (Array.isArray(payload)) {
    return {
      mode,
      exchanges: payload,
      totalUsdValue: sumPortfolioValue(payload),
    }
  }

  return payload
}

interface TradingStore {
  botState: BotState | null
  config: BotConfig | null
  logs: BotLog[]
  opportunities: Opportunity[]
  trades: Trade[]
  prices: Record<string, PriceData>
  portfolioBalances: PortfolioBalancesResponse | null
  portfolioHistory: PortfolioHistoryPoint[]
  tradeStats: TradeStats | null
  wallet: WalletPublicView | null
  socketConnected: boolean
  lastPriceTick: PriceData | null
  loading: boolean
  error: string | null

  refreshAll: (options?: { silent?: boolean }) => Promise<void>
  refreshPortfolioBalances: (mode?: TradeMode) => Promise<void>
  refreshPrices: (options?: { silent?: boolean }) => Promise<void>
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
  if (error instanceof Error) {
    return error?.message
  }
  return 'Unable to load trading data.'
}

export const useBotStore = create<TradingStore>()((set, get) => ({
  botState: null,
  config: null,
  logs: [],
  opportunities: [],
  trades: [],
  prices: {},
  portfolioBalances: null,
  portfolioHistory: [],
  tradeStats: null,
  wallet: null,
  socketConnected: false,
  lastPriceTick: null,
  loading: false,
  error: null,

  refreshAll: async (options) => {
    const silent = options?.silent ?? false
    if (!silent) {
      set({ loading: true, error: null })
    }
    try {
      const [statusRes, configRes, opportunitiesRes, logsRes, tradesRes, pricesRes, historyRes, statsRes, walletRes] =
        await Promise.all([
          botApi.getStatus(),
          botApi.getConfig(),
          botApi.getOpportunities(),
          botApi.getLogs({ page: 1, limit: 50 }),
          tradesApi.getAll({ page: 1, limit: 50 }),
          pricesApi.getCurrent(),
          portfolioApi.getHistory({ period: '30d' }),
          tradesApi.getStats({ period: '30d' }),
          walletApi.me(),
        ])

      const balancesRes = await portfolioApi.getBalances({ mode: configRes.data.data.executionMode })

      set({
        botState: statusRes.data.data,
        config: configRes.data.data,
        opportunities: opportunitiesRes.data.data,
        logs: logsRes.data.data?.items,
        trades: tradesRes.data.data.items,
        prices: upsertPrices({}, pricesRes.data.data),
        portfolioBalances: balancesRes.data.data,
        portfolioHistory: historyRes.data.data,
        tradeStats: statsRes.data.data,
        wallet: walletRes.data.data,
      })
    } catch (error) {
      const message = normalizeError(error)
      if (!silent) {
        set({ error: message })
      }
      throw new Error(message)
    } finally {
      if (!silent) {
        set({ loading: false })
      }
    }
  },

  refreshPortfolioBalances: async (mode) => {
    try {
      const nextMode = mode ?? get().config?.executionMode ?? get().portfolioBalances?.mode ?? 'PAPER'
      const response = await portfolioApi.getBalances({ mode: nextMode })
      set({ portfolioBalances: response.data.data, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  refreshPrices: async (options) => {
    const silent = options?.silent ?? false
    try {
      const response = await pricesApi.getCurrent()
      set((state) => ({ prices: upsertPrices(state.prices, response.data.data), error: silent ? state.error : null }))
    } catch (error) {
      const message = normalizeError(error)
      if (!silent) {
        set({ error: message })
        throw new Error(message)
      }
    }
  },

  refreshTrades: async (params) => {
    try {
      const response = await tradesApi.getAll(params)
      set({ trades: response.data.data.items, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  startBot: async () => {
    try {
      const response = await botApi.start()
      set({ botState: response.data.data, error: null })
    } catch (error) {
      console.log(error)
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  stopBot: async () => {
    try {
      const response = await botApi.stop()
      set({ botState: response.data.data, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  pauseBot: async () => {
    try {
      const response = await botApi.pause()
      set({ botState: response.data.data, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  updateConfig: async (partial) => {
    if (!partial || Object.keys(partial).length === 0) {
      return
    }
    try {
      const response = await botApi.updateConfig(partial)
      set({ config: response.data.data, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  rotateWallet: async () => {
    try {
      const response = await walletApi.rotate()
      set({ wallet: response.data.data, error: null })
    } catch (error) {
      const message = normalizeError(error)
      set({ error: message })
      throw new Error(message)
    }
  },

  setSocketConnected: (connected) => set({ socketConnected: connected }),

  applyRealtimeEvent: (event) => {
    if (event.type === 'prices:update') {
      set((state) => ({ prices: upsertPrices(state.prices, event.payload) }))
      return
    }

    if (event.type === 'price:tick') {
      set((state) => ({
        prices: upsertPrices(state.prices, [event.payload]),
        lastPriceTick: event.payload,
      }))
      return
    }

    if (event.type === 'opportunity:new') {
      set((state) => ({
        opportunities: putNewestFirst(state.opportunities, event.payload, 100),
        botState: state.botState
          ? {
              ...state.botState,
              totalOpportunities: state.botState.totalOpportunities + 1,
            }
          : state.botState,
      }))
      return
    }

    if (event.type === 'trade:new') {
      set((state) => ({
        trades: putNewestFirst(state.trades, event.payload, 200),
        botState: state.botState
          ? {
              ...state.botState,
              totalTrades: state.botState.totalTrades + 1,
            }
          : state.botState,
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
          const mode = get().portfolioBalances?.mode ?? get().config?.executionMode ?? 'PAPER'
          set({ portfolioBalances: normalizePortfolioSnapshot(event.payload as PortfolioExchangeBalance[], mode) })
        } else {
          set((state) => ({ portfolioHistory: mergeHistory(state.portfolioHistory, event.payload as PortfolioHistoryPoint[]) }))
        }
      }
      return
    }

    if (event.type === 'portfolio:update' && 'exchanges' in event.payload) {
      set({ portfolioBalances: normalizePortfolioSnapshot(event.payload, event.payload.mode) })
    }
  },

  clearError: () => set({ error: null }),
}))

export { priceKey }
