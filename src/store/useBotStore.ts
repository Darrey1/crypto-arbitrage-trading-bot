import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BotState, BotConfig, BotLog, BotStatus, TradingMode,
  ArbitrageOpportunity, PriceTick, ExchangeId, Trade
} from '@/types'
import { generateId, EXCHANGES, estimateProfit, calculateNetSpread } from '@/lib/utils'

const DEFAULT_CONFIG: BotConfig = {
  id: 'default',
  userId: 'local',
  tradingMode: 'paper',
  executionMode: 'automatic',
  symbol: 'ETH/USDT',
  minSpreadThreshold: 0.3,
  maxTradeSize: 1000,
  maxDailyTrades: 50,
  slippageTolerance: 0.1,
  dailyLossLimit: 200,
  cooldownSeconds: 5,
  enabledExchanges: ['binance', 'kraken', 'kucoin'],
}

const PAPER_BALANCE = 10000 // $10,000 virtual USDT

interface BotStore {
  // State
  botState: BotState
  config: BotConfig
  logs: BotLog[]
  opportunities: ArbitrageOpportunity[]
  recentTrades: Trade[]
  prices: Record<string, PriceTick>
  paperBalance: number
  paperProfit: number

  // Actions
  setTradingMode: (mode: TradingMode) => void
  startBot: () => void
  stopBot: () => void
  pauseBot: () => void
  updateConfig: (config: Partial<BotConfig>) => void
  addLog: (level: BotLog['level'], message: string, data?: Record<string, unknown>) => void
  addOpportunity: (opp: ArbitrageOpportunity) => void
  executeOpportunity: (id: string) => void
  dismissOpportunity: (id: string) => void
  updatePrice: (tick: PriceTick) => void
  addTrade: (trade: Trade) => void
  clearLogs: () => void
  resetPaperBalance: () => void
}

export const useBotStore = create<BotStore>()(
  persist(
    (set, get) => ({
      botState: {
        status: 'idle',
        tradingMode: 'paper',
        config: null,
        opportunitiesDetected: 0,
        tradesExecuted: 0,
        totalProfitToday: 0,
        winRate: 0,
        lastScan: null,
        uptime: 0,
      },
      config: DEFAULT_CONFIG,
      logs: [],
      opportunities: [],
      recentTrades: [],
      prices: {},
      paperBalance: PAPER_BALANCE,
      paperProfit: 0,

      setTradingMode: (mode) => {
        set(state => ({
          config: { ...state.config, tradingMode: mode },
          botState: { ...state.botState, tradingMode: mode },
        }))
        get().addLog('INFO', `Trading mode switched to ${mode.toUpperCase()}`)
      },

      startBot: () => {
        const { config, addLog } = get()
        set(state => ({
          botState: {
            ...state.botState,
            status: 'running',
            lastScan: Date.now(),
          },
        }))
        addLog('SUCCESS', `Bot started in ${config.tradingMode.toUpperCase()} mode — scanning ${config.symbol} across ${config.enabledExchanges.join(', ')}`)
      },

      stopBot: () => {
        set(state => ({ botState: { ...state.botState, status: 'stopped' } }))
        get().addLog('WARN', 'Bot stopped by user')
      },

      pauseBot: () => {
        set(state => ({ botState: { ...state.botState, status: 'paused' } }))
        get().addLog('WARN', 'Bot paused')
      },

      updateConfig: (partial) => {
        set(state => ({ config: { ...state.config, ...partial } }))
      },

      addLog: (level, message, data) => {
        const log: BotLog = { id: generateId(), level, message, timestamp: Date.now(), data }
        set(state => ({ logs: [log, ...state.logs].slice(0, 500) }))
      },

      addOpportunity: (opp) => {
        set(state => ({
          opportunities: [opp, ...state.opportunities].slice(0, 50),
          botState: {
            ...state.botState,
            opportunitiesDetected: state.botState.opportunitiesDetected + 1,
            lastScan: Date.now(),
          },
        }))

        const { config } = get()
        if (config.executionMode === 'automatic' && config.tradingMode === 'paper') {
          setTimeout(() => get().executeOpportunity(opp.id), 800)
        }
      },

      executeOpportunity: (id) => {
        const { opportunities, config, paperBalance, paperProfit, addLog, addTrade } = get()
        const opp = opportunities.find(o => o.id === id)
        if (!opp || opp.status !== 'active') return

        const trade: Trade = {
          id: generateId(),
          userId: 'local',
          mode: config.tradingMode,
          symbol: opp.symbol,
          buyExchange: opp.buyExchange,
          sellExchange: opp.sellExchange,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          amount: opp.tradeSize / opp.buyPrice,
          grossProfit: opp.estimatedProfit + opp.fees * opp.tradeSize / 100,
          fees: opp.fees * opp.tradeSize / 100,
          netProfit: opp.estimatedProfit,
          status: 'completed',
          executedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        set(state => ({
          opportunities: state.opportunities.map(o =>
            o.id === id ? { ...o, status: 'executed' } : o
          ),
          recentTrades: [trade, ...state.recentTrades].slice(0, 200),
          paperBalance: config.tradingMode === 'paper'
            ? paperBalance + opp.estimatedProfit
            : paperBalance,
          paperProfit: config.tradingMode === 'paper'
            ? paperProfit + opp.estimatedProfit
            : paperProfit,
          botState: {
            ...state.botState,
            tradesExecuted: state.botState.tradesExecuted + 1,
            totalProfitToday: state.botState.totalProfitToday + opp.estimatedProfit,
            winRate: opp.estimatedProfit > 0
              ? ((state.botState.winRate * state.botState.tradesExecuted + 100) /
                  (state.botState.tradesExecuted + 1))
              : state.botState.winRate,
          },
        }))

        addLog(
          opp.estimatedProfit > 0 ? 'SUCCESS' : 'WARN',
          `Trade executed: ${opp.symbol} ${opp.buyExchange}→${opp.sellExchange} | Net: ${opp.estimatedProfit >= 0 ? '+' : ''}$${opp.estimatedProfit.toFixed(2)}`
        )
        addTrade(trade)
      },

      dismissOpportunity: (id) => {
        set(state => ({
          opportunities: state.opportunities.map(o =>
            o.id === id ? { ...o, status: 'expired' } : o
          ),
        }))
      },

      updatePrice: (tick) => {
        set(state => ({
          prices: { ...state.prices, [`${tick.exchange}:${tick.symbol}`]: tick },
        }))
      },

      addTrade: (trade) => {
        set(state => ({ recentTrades: [trade, ...state.recentTrades].slice(0, 200) }))
      },

      clearLogs: () => set({ logs: [] }),

      resetPaperBalance: () => {
        set({ paperBalance: PAPER_BALANCE, paperProfit: 0 })
        get().addLog('INFO', 'Paper trading balance reset to $10,000')
      },
    }),
    {
      name: 'arb-bot-store',
      partialize: (state) => ({
        config: state.config,
        paperBalance: state.paperBalance,
        paperProfit: state.paperProfit,
        recentTrades: state.recentTrades.slice(0, 50),
      }),
    }
  )
)
