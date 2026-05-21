import { BotStatus, LogLevel, TradeMode } from '@prisma/client'
import { ethers } from 'ethers'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { ApiError } from '../lib/errors'
import { arbitrageService } from './arbitrageService'
import { marketDataService } from './marketDataService'
import { portfolioService } from './portfolioService'
import { tradeService } from './tradeService'
import { logService } from './logService'
import { socketService } from './socketService'
import { BotConfigView, BotRuntimeConfig, BotStateView, OpportunityView } from '../types/domain'

class BotService {
  private userTimers = new Map<string, NodeJS.Timeout>()
  private initialized = false

  async bootstrap() {
    if (this.initialized) return
    marketDataService.start()
    this.initialized = true

    // Re-attach timers for bots that were running before server restart
    const runningBots = await prisma.botState.findMany({ where: { status: BotStatus.RUNNING } })
    for (const bot of runningBots) {
      this.startUserTimer(bot.userId)
    }
  }

  private startUserTimer(userId: string) {
    this.stopUserTimer(userId)

    const cycle = async () => {
      try {
        const state = await prisma.botState.findUnique({ where: { userId } })
        if (!state || state.status !== BotStatus.RUNNING) {
          this.stopUserTimer(userId)
          return
        }
        await this.runBotCycle(userId)
      } catch (err) {
        logService.createLog(userId, LogLevel.ERROR, 'Bot cycle error', {
          error: err instanceof Error ? err.message : String(err)
        }).catch(() => {})
      }
    }

    // Run one cycle immediately, then on each interval
    cycle()
    this.userTimers.set(userId, setInterval(cycle, env.BOT_LOOP_INTERVAL_MS))
  }

  private stopUserTimer(userId: string) {
    const existing = this.userTimers.get(userId)
    if (existing) {
      clearInterval(existing)
      this.userTimers.delete(userId)
    }
  }

  async ensureDefaults(userId: string) {
    await prisma.botConfig.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        tradingPair: 'ETH/USDT',
        executionMode: TradeMode.PAPER,
        minSpreadThreshold: env.MIN_SPREAD_THRESHOLD,
        maxTradeSize: env.DEFAULT_MAX_TRADE_SIZE,
        maxDailyTrades: env.DEFAULT_MAX_DAILY_TRADES,
        slippageTolerance: env.DEFAULT_SLIPPAGE_TOLERANCE,
        dailyLossLimit: env.DEFAULT_DAILY_LOSS_LIMIT
      }
    })

    await prisma.botState.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        status: BotStatus.IDLE,
        currentMode: TradeMode.PAPER,
        virtualBalance: 10000
      }
    })
  }

  async getStatus(userId: string): Promise<BotStateView> {
    const state = await prisma.botState.findUnique({ where: { userId } })
    if (!state) throw new ApiError(404, 'Bot state not found')

    return {
      status: state.status,
      currentMode: state.currentMode,
      totalOpportunities: state.totalOpportunities,
      totalTrades: state.totalTrades,
      todayPnl: state.todayPnl,
      winRate: state.winRate,
      virtualBalance: state.virtualBalance,
      lastStartedAt: state.lastStartedAt,
      lastStoppedAt: state.lastStoppedAt
    }
  }

  async getConfig(userId: string): Promise<BotConfigView> {
    const config = await prisma.botConfig.findUnique({ where: { userId } })
    if (!config) throw new ApiError(404, 'Bot configuration not found')

    return {
      tradingPair: config.tradingPair,
      executionMode: config.executionMode,
      minSpreadThreshold: config.minSpreadThreshold,
      maxTradeSize: config.maxTradeSize,
      maxDailyTrades: config.maxDailyTrades,
      slippageTolerance: config.slippageTolerance,
      dailyLossLimit: config.dailyLossLimit
    }
  }

  async updateConfig(userId: string, patch: Partial<BotConfigView>) {
    await prisma.botConfig.update({
      where: { userId },
      data: {
        ...(patch.tradingPair !== undefined && { tradingPair: patch.tradingPair }),
        ...(patch.executionMode !== undefined && { executionMode: patch.executionMode }),
        ...(patch.minSpreadThreshold !== undefined && { minSpreadThreshold: patch.minSpreadThreshold }),
        ...(patch.maxTradeSize !== undefined && { maxTradeSize: patch.maxTradeSize }),
        ...(patch.maxDailyTrades !== undefined && { maxDailyTrades: patch.maxDailyTrades }),
        ...(patch.slippageTolerance !== undefined && { slippageTolerance: patch.slippageTolerance }),
        ...(patch.dailyLossLimit !== undefined && { dailyLossLimit: patch.dailyLossLimit })
      }
    })

    // If switching to LIVE while the bot is running, immediately validate the balance
    if (patch.executionMode === TradeMode.LIVE) {
      const state = await prisma.botState.findUnique({ where: { userId } })
      if (state?.status === BotStatus.RUNNING) {
        const check = await this.checkLiveBalance(userId)
        if (!check.sufficient) {
          await this.pause(userId)
          socketService.emitToUser(userId, 'bot:error', {
            message: `Bot paused after switching to LIVE mode: ${check.message}`
          })
        }
      }
    }

    return this.getConfig(userId)
  }

  async start(userId: string) {
    await this.ensureDefaults(userId)
    const config = await prisma.botConfig.findUnique({ where: { userId } })
    if (!config) throw new ApiError(404, 'Bot configuration not found')

    if (config.executionMode === TradeMode.LIVE) {
      const check = await this.checkLiveBalance(userId)
      if (!check.sufficient) throw new ApiError(400, check.message)
    }

    await prisma.botState.update({
      where: { userId },
      data: {
        status: BotStatus.RUNNING,
        currentMode: config.executionMode,
        lastStartedAt: new Date(),
        lastStoppedAt: null
      }
    })

    this.startUserTimer(userId)

    await logService.createLog(userId, LogLevel.INFO, 'Bot started', {
      tradingPair: config.tradingPair,
      executionMode: config.executionMode
    })

    return this.getStatus(userId)
  }

  async stop(userId: string) {
    await this.ensureDefaults(userId)
    this.stopUserTimer(userId)

    await prisma.botState.update({
      where: { userId },
      data: { status: BotStatus.STOPPED, lastStoppedAt: new Date() }
    })

    await logService.createLog(userId, LogLevel.INFO, 'Bot stopped')
    return this.getStatus(userId)
  }

  async pause(userId: string) {
    await this.ensureDefaults(userId)
    this.stopUserTimer(userId)

    await prisma.botState.update({
      where: { userId },
      data: { status: BotStatus.PAUSED }
    })

    await logService.createLog(userId, LogLevel.INFO, 'Bot paused')
    return this.getStatus(userId)
  }

  // ─── Live balance check ───────────────────────────────────────────────────

  private async checkLiveBalance(userId: string): Promise<{ sufficient: boolean; message: string }> {
    const [wallet, config] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.botConfig.findUnique({ where: { userId } })
    ])

    if (!wallet) {
      return { sufficient: false, message: 'No wallet found. Please create a wallet first.' }
    }

    try {
      const provider = new ethers.JsonRpcProvider(env.ETHEREUM_RPC_URL)
      const balanceWei = await provider.getBalance(wallet.address)
      const balanceEth = parseFloat(ethers.formatEther(balanceWei))

      // Use live ETH/USDT price when available, otherwise fall back to a safe default
      const ethTicker = marketDataService
        .getLatestPrices()
        .find(p => p.pair === 'ETH/USDT' || p.pair === 'ETH/USD')
      const ethPrice = ethTicker?.lastPrice ?? 2500
      const balanceUsd = balanceEth * ethPrice
      const required = config?.maxTradeSize ?? env.DEFAULT_MAX_TRADE_SIZE

      if (balanceUsd < required) {
        return {
          sufficient: false,
          message:
            `Insufficient wallet balance for live trading. ` +
            `Required: $${required.toFixed(2)}, ` +
            `Available: $${balanceUsd.toFixed(2)} (${balanceEth.toFixed(6)} ETH). ` +
            `Please top up your wallet at ${wallet.address}`
        }
      }

      return {
        sufficient: true,
        message: `Balance OK: ${balanceEth.toFixed(6)} ETH ($${balanceUsd.toFixed(2)})`
      }
    } catch (err) {
      return {
        sufficient: false,
        message: `Failed to check wallet balance: ${err instanceof Error ? err.message : 'Unknown error'}`
      }
    }
  }

  // ─── Per-user bot cycle ───────────────────────────────────────────────────

  private async runBotCycle(userId: string) {
    const [config, state] = await Promise.all([
      prisma.botConfig.findUnique({ where: { userId } }),
      prisma.botState.findUnique({ where: { userId } })
    ])
    if (!config || !state) return

    // Enforce daily trade cap
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = await prisma.trade.count({
      where: { userId, createdAt: { gte: todayStart } }
    })
    if (todayCount >= config.maxDailyTrades) return

    // Enforce daily loss cap — auto-pause bot
    if (state.todayPnl <= -config.dailyLossLimit) {
      await this.pause(userId)
      socketService.emitToUser(userId, 'bot:paused', {
        reason: `Daily loss limit of $${config.dailyLossLimit} reached`
      })
      return
    }

    const prices = marketDataService.getLatestPrices()
    if (prices.length === 0) return

    const runtimeConfig: BotRuntimeConfig = {
      userId,
      tradingPair: config.tradingPair,
      executionMode: config.executionMode,
      minSpreadThreshold: config.minSpreadThreshold,
      maxTradeSize: config.maxTradeSize,
      maxDailyTrades: config.maxDailyTrades,
      slippageTolerance: config.slippageTolerance,
      dailyLossLimit: config.dailyLossLimit
    }

    const opportunities = arbitrageService.detectOpportunities(prices, runtimeConfig)
    if (opportunities.length === 0) return

    await prisma.botState.update({
      where: { userId },
      data: { totalOpportunities: { increment: opportunities.length } }
    })

    // Take only the best opportunity per cycle to avoid over-trading
    const best = opportunities[0]

    const savedOpp = await prisma.opportunity.create({
      data: {
        userId,
        pair: best.pair,
        buyExchange: best.buyExchange,
        sellExchange: best.sellExchange,
        spread: best.spread,
        netSpread: best.netSpread,
        estProfit: best.estProfit,
        confidence: best.confidence,
        status: 'NEW',
        metadata: best.metadata as object
      }
    })

    socketService.emitToUser(userId, 'opportunity:new', savedOpp)
    await logService.createLog(userId, LogLevel.INFO, 'Opportunity detected', {
      pair: best.pair,
      buyExchange: best.buyExchange,
      sellExchange: best.sellExchange,
      netSpread: (best.netSpread * 100).toFixed(3) + '%',
      estProfit: '$' + best.estProfit.toFixed(2)
    })

    const trade =
      config.executionMode === TradeMode.PAPER
        ? await this.executePaperTrade(userId, best, runtimeConfig, state.virtualBalance)
        : await this.executeLiveTrade(userId, best, runtimeConfig)

    if (!trade) return

    await prisma.opportunity.update({
      where: { id: savedOpp.id },
      data: { status: 'EXECUTED', executedAt: new Date() }
    })

    // Recompute win rate from DB to stay accurate across restarts
    const [wins, total] = await Promise.all([
      prisma.trade.count({ where: { userId, netProfit: { gt: 0 } } }),
      prisma.trade.count({ where: { userId } })
    ])

    await prisma.botState.update({
      where: { userId },
      data: {
        totalTrades: { increment: 1 },
        todayPnl: { increment: trade.netProfit },
        winRate: total > 0 ? (wins / total) * 100 : 0
      }
    })

    await portfolioService.ensureInitialSnapshot(userId).catch(() => {})
    socketService.emitToUser(userId, 'trade:new', trade)
    socketService.emitToUser(userId, 'bot:status', await this.getStatus(userId))
  }

  // ─── Paper trading ────────────────────────────────────────────────────────

  private async executePaperTrade(
    userId: string,
    opportunity: OpportunityView,
    config: BotRuntimeConfig,
    virtualBalance: number
  ) {
    // Cap trade size to 95% of available virtual balance so it never goes negative
    const tradeSize = Math.min(config.maxTradeSize, virtualBalance * 0.95)
    if (tradeSize < 1) {
      await logService.createLog(userId, LogLevel.WARN, 'Insufficient virtual balance for paper trade', {
        virtualBalance
      })
      return null
    }

    const buyPrice = Math.max(0.000001, opportunity.buyPrice)
    const sellPrice = Math.max(buyPrice, opportunity.sellPrice)
    const amount = tradeSize / buyPrice
    const fees = amount * (buyPrice * 0.001 + sellPrice * 0.001)
    const netProfit = amount * (sellPrice - buyPrice) - fees

    const trade = await prisma.trade.create({
      data: {
        userId,
        pair: opportunity.pair,
        buyExchange: opportunity.buyExchange,
        sellExchange: opportunity.sellExchange,
        buyPrice,
        sellPrice,
        amount,
        fees,
        netProfit,
        status: 'COMPLETED',
        mode: TradeMode.PAPER,
        route: `${opportunity.buyExchange} → ${opportunity.sellExchange}`,
        executedAt: new Date(),
        settledAt: new Date()
      }
    })

    await prisma.botState.update({
      where: { userId },
      data: { virtualBalance: { increment: netProfit } }
    })

    await logService.createLog(userId, LogLevel.INFO, 'Paper trade executed', {
      pair: opportunity.pair,
      amount: amount.toFixed(6),
      netProfit: '$' + netProfit.toFixed(4),
      virtualBalance: (virtualBalance + netProfit).toFixed(2)
    })

    return trade
  }

  // ─── Live trading ─────────────────────────────────────────────────────────

  private async executeLiveTrade(
    userId: string,
    opportunity: OpportunityView,
    config: BotRuntimeConfig
  ) {
    // Re-check balance immediately before each live trade
    const check = await this.checkLiveBalance(userId)
    if (!check.sufficient) {
      await logService.createLog(userId, LogLevel.WARN, 'Live trade skipped: insufficient balance', {
        reason: check.message
      })
      socketService.emitToUser(userId, 'bot:error', { message: check.message })
      return null
    }

    // Fetch both exchange credentials in parallel
    const [buyCred, sellCred] = await Promise.all([
      prisma.exchangeCredential.findUnique({
        where: { userId_exchange: { userId, exchange: opportunity.buyExchange } }
      }),
      prisma.exchangeCredential.findUnique({
        where: { userId_exchange: { userId, exchange: opportunity.sellExchange } }
      })
    ])

    if (!buyCred || !sellCred) {
      const missing = [!buyCred && opportunity.buyExchange, !sellCred && opportunity.sellExchange]
        .filter(Boolean)
        .join(', ')
      const message = `Missing API credentials for: ${missing}. Add your exchange credentials to enable live trading.`
      await logService.createLog(userId, LogLevel.ERROR, 'Live trade skipped: missing credentials', { missing })
      socketService.emitToUser(userId, 'bot:error', { message })
      return null
    }

    return tradeService.executeLiveTrade({
      userId,
      opportunity: {
        pair: opportunity.pair,
        buyExchange: opportunity.buyExchange,
        sellExchange: opportunity.sellExchange,
        buyPrice: opportunity.buyPrice,
        sellPrice: opportunity.sellPrice,
        spread: opportunity.spread,
        netSpread: opportunity.netSpread,
        estProfit: opportunity.estProfit,
        confidence: opportunity.confidence
      },
      config,
      buyCred: {
        apiKey: buyCred.apiKey,
        encryptedSecret: buyCred.encryptedSecret,
        iv: buyCred.iv,
        authTag: buyCred.authTag,
        passphrase: buyCred.passphrase ?? undefined
      },
      sellCred: {
        apiKey: sellCred.apiKey,
        encryptedSecret: sellCred.encryptedSecret,
        iv: sellCred.iv,
        authTag: sellCred.authTag,
        passphrase: sellCred.passphrase ?? undefined
      }
    })
  }

  // ─── Query helpers ────────────────────────────────────────────────────────

  async getOpportunities(userId: string, limit = 20) {
    return prisma.opportunity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  async getLogs(userId: string, page?: number, limit?: number, level?: string) {
    return logService.getLogs({ userId, page, limit, level })
  }
}

export const botService = new BotService()
