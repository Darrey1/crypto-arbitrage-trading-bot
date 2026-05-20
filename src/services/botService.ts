import { BotStatus, LogLevel, TradeMode } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { ApiError } from '../lib/errors'
import { arbitrageService } from './arbitrageService'
import { marketDataService } from './marketDataService'
import { portfolioService } from './portfolioService'
import { tradeService } from './tradeService'
import { logService } from './logService'
import { socketService } from './socketService'
import { BotConfigView, BotStateView, BotRuntimeConfig, OpportunityView } from '../types/domain'

class BotService {
  private initialized = false

  async bootstrap() {
    if (this.initialized) {
      return
    }

    marketDataService.on('tick', (prices) => {
      this.handleMarketTick(prices).catch((error) => {
        logService.createLog(null, LogLevel.ERROR, 'Market tick processing failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        }).catch(() => undefined)
      })
    })

    marketDataService.start()
    this.initialized = true
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
        currentMode: TradeMode.PAPER
      }
    })
  }

  async getStatus(userId: string): Promise<BotStateView> {
    const state = await prisma.botState.findUnique({ where: { userId } })
    if (!state) {
      throw new ApiError(404, 'Bot state not found')
    }

    return {
      status: state.status,
      currentMode: state.currentMode,
      totalOpportunities: state.totalOpportunities,
      totalTrades: state.totalTrades,
      todayPnl: state.todayPnl,
      winRate: state.winRate,
      lastStartedAt: state.lastStartedAt,
      lastStoppedAt: state.lastStoppedAt
    }
  }

  async getConfig(userId: string): Promise<BotConfigView> {
    const config = await prisma.botConfig.findUnique({ where: { userId } })
    if (!config) {
      throw new ApiError(404, 'Bot configuration not found')
    }

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
    const updated = await prisma.botConfig.update({
      where: { userId },
      data: {
        ...(patch.tradingPair ? { tradingPair: patch.tradingPair } : {}),
        ...(patch.executionMode ? { executionMode: patch.executionMode } : {}),
        ...(patch.minSpreadThreshold !== undefined ? { minSpreadThreshold: patch.minSpreadThreshold } : {}),
        ...(patch.maxTradeSize !== undefined ? { maxTradeSize: patch.maxTradeSize } : {}),
        ...(patch.maxDailyTrades !== undefined ? { maxDailyTrades: patch.maxDailyTrades } : {}),
        ...(patch.slippageTolerance !== undefined ? { slippageTolerance: patch.slippageTolerance } : {}),
        ...(patch.dailyLossLimit !== undefined ? { dailyLossLimit: patch.dailyLossLimit } : {})
      }
    })

    return this.getConfig(userId)
  }

  async start(userId: string) {
    await this.ensureDefaults(userId)
    const config = await prisma.botConfig.findUnique({ where: { userId } })
    if (!config) {
      throw new ApiError(404, 'Bot configuration not found')
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

    await logService.createLog(userId, LogLevel.INFO, 'Bot started', {
      tradingPair: config.tradingPair,
      executionMode: config.executionMode
    })

    return this.getStatus(userId)
  }

  async stop(userId: string) {
    await this.ensureDefaults(userId)
    await prisma.botState.update({
      where: { userId },
      data: {
        status: BotStatus.STOPPED,
        lastStoppedAt: new Date()
      }
    })

    await logService.createLog(userId, LogLevel.INFO, 'Bot stopped')
    return this.getStatus(userId)
  }

  async pause(userId: string) {
    await this.ensureDefaults(userId)
    await prisma.botState.update({
      where: { userId },
      data: { status: BotStatus.PAUSED }
    })

    await logService.createLog(userId, LogLevel.INFO, 'Bot paused')
    return this.getStatus(userId)
  }

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

  private async handleMarketTick(prices: Awaited<ReturnType<typeof marketDataService.tick>>) {
    const runningBots = await prisma.botState.findMany({ where: { status: BotStatus.RUNNING } })
    if (runningBots.length === 0) {
      return
    }

    for (const bot of runningBots) {
      const config = await prisma.botConfig.findUnique({ where: { userId: bot.userId } })
      if (!config) {
        continue
      }

      const runtimeConfig: BotRuntimeConfig = {
        userId: bot.userId,
        tradingPair: config.tradingPair,
        executionMode: config.executionMode,
        minSpreadThreshold: config.minSpreadThreshold,
        maxTradeSize: config.maxTradeSize,
        maxDailyTrades: config.maxDailyTrades,
        slippageTolerance: config.slippageTolerance,
        dailyLossLimit: config.dailyLossLimit
      }

      const opportunities = arbitrageService.detectOpportunities(prices ?? [], runtimeConfig)

      if (opportunities.length === 0) {
        continue
      }

      await prisma.botState.update({
        where: { userId: bot.userId },
        data: {
          totalOpportunities: { increment: opportunities.length }
        }
      })

      for (const opportunity of opportunities) {
        const savedOpportunity = await prisma.opportunity.create({
          data: {
            userId: bot.userId,
            pair: opportunity.pair,
            buyExchange: opportunity.buyExchange,
            sellExchange: opportunity.sellExchange,
            spread: opportunity.spread,
            netSpread: opportunity.netSpread,
            estProfit: opportunity.estProfit,
            confidence: opportunity.confidence,
            status: 'NEW',
            metadata: opportunity.metadata as any
          }
        })

        socketService.emitToUser(bot.userId, 'opportunity:new', savedOpportunity)
        await logService.createLog(bot.userId, LogLevel.INFO, 'Opportunity detected', opportunity)

        if (config.executionMode === TradeMode.PAPER) {
          const trade = await tradeService.executeOpportunity({
            userId: bot.userId,
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
            config: runtimeConfig
          })

          if (trade) {
            await prisma.opportunity.update({
              where: { id: savedOpportunity.id },
              data: { status: 'EXECUTED', executedAt: new Date() }
            })

            await prisma.botState.update({
              where: { userId: bot.userId },
              data: {
                totalTrades: { increment: 1 },
                todayPnl: { increment: trade.netProfit }
              }
            })

            await portfolioService.ensureInitialSnapshot(bot.userId)
            socketService.emitToUser(bot.userId, 'trade:new', trade)
          }
        }
      }
    }
  }
}

export const botService = new BotService()