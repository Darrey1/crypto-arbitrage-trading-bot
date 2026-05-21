import { TradeMode, TradeStatus } from '@prisma/client'
import { prisma } from '../config/prisma'
import { ApiListResult, ExecuteOpportunityInput, LiveTradeInput, TradeView } from '../types/domain'
import { getPagination } from '../lib/pagination'
import { logService } from './logService'
import { exchangeService, ExchangeKey } from './exchangeService'
import { LogLevel } from '@prisma/client'

class TradeService {
  async executeOpportunity(input: ExecuteOpportunityInput) {
    if (input.config.executionMode === TradeMode.LIVE) {
      return null
    }

    const buyPrice = Math.max(0.000001, input.opportunity.buyPrice)
    const sellPrice = Math.max(buyPrice, input.opportunity.sellPrice)
    const amount = Math.max(0.0001, input.config.maxTradeSize / buyPrice)
    const fees = amount * (buyPrice + sellPrice) * 0.0015
    const netProfit = input.opportunity.estProfit - fees

    const trade = await prisma.trade.create({
      data: {
        userId: input.userId,
        pair: input.opportunity.pair,
        buyExchange: input.opportunity.buyExchange,
        sellExchange: input.opportunity.sellExchange,
        buyPrice,
        sellPrice,
        amount,
        fees,
        netProfit,
        status: TradeStatus.COMPLETED,
        mode: input.config.executionMode,
        route: `${input.opportunity.buyExchange} -> ${input.opportunity.sellExchange}`,
        executedAt: new Date(),
        settledAt: new Date()
      }
    })

    return trade
  }

  async getTradeById(id: string) {
    return prisma.trade.findUnique({ where: { id } })
  }

  async getTrades(params: { userId?: string; page?: number; limit?: number; status?: string; pair?: string } = {}): Promise<ApiListResult<TradeView>> {
    const { page, limit, skip } = getPagination(params.page, params.limit)
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.status ? { status: params.status as TradeStatus } : {}),
      ...(params.pair ? { pair: params.pair } : {})
    }

    const [items, total] = await Promise.all([
      prisma.trade.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.trade.count({ where })
    ])

    return {
      items: items.map((trade) => ({
        id: trade.id,
        pair: trade.pair,
        buyExchange: trade.buyExchange,
        sellExchange: trade.sellExchange,
        buyPrice: trade.buyPrice,
        sellPrice: trade.sellPrice,
        amount: trade.amount,
        fees: trade.fees,
        netProfit: trade.netProfit,
        status: trade.status,
        mode: trade.mode,
        route: trade.route,
        executedAt: trade.executedAt,
        createdAt: trade.createdAt
      })),
      page,
      limit,
      total
    }
  }

  async executeLiveTrade(input: LiveTradeInput) {
    const { userId, opportunity, config, buyCred, sellCred } = input
    const buyPrice = Math.max(0.000001, opportunity.buyPrice)
    const sellPrice = Math.max(buyPrice, opportunity.sellPrice)
    const amount = Math.max(0.0001, config.maxTradeSize / buyPrice)

    const [buyResult, sellResult] = await Promise.allSettled([
      exchangeService.placeOrder(
        opportunity.buyExchange.toLowerCase() as ExchangeKey,
        buyCred,
        opportunity.pair,
        'buy',
        amount
      ),
      exchangeService.placeOrder(
        opportunity.sellExchange.toLowerCase() as ExchangeKey,
        sellCred,
        opportunity.pair,
        'sell',
        amount
      )
    ])

    const buyOrder = buyResult.status === 'fulfilled' ? buyResult.value : null
    const sellOrder = sellResult.status === 'fulfilled' ? sellResult.value : null

    const actualBuyPrice = buyOrder?.price || buyPrice
    const actualSellPrice = sellOrder?.price || sellPrice
    const actualAmount = buyOrder?.amount || amount
    const fees = actualAmount * (actualBuyPrice + actualSellPrice) * 0.001
    const netProfit = actualAmount * (actualSellPrice - actualBuyPrice) - fees
    const status = buyOrder && sellOrder ? TradeStatus.COMPLETED : TradeStatus.FAILED

    const trade = await prisma.trade.create({
      data: {
        userId,
        pair: opportunity.pair,
        buyExchange: opportunity.buyExchange,
        sellExchange: opportunity.sellExchange,
        buyPrice: actualBuyPrice,
        sellPrice: actualSellPrice,
        amount: actualAmount,
        fees,
        netProfit,
        status,
        mode: TradeMode.LIVE,
        route: `${opportunity.buyExchange} → ${opportunity.sellExchange}`,
        executedAt: new Date(),
        settledAt: status === TradeStatus.COMPLETED ? new Date() : null
      }
    })

    if (status === TradeStatus.FAILED) {
      const errors = [
        buyResult.status === 'rejected' ? `Buy (${opportunity.buyExchange}): ${(buyResult.reason as Error)?.message}` : null,
        sellResult.status === 'rejected' ? `Sell (${opportunity.sellExchange}): ${(sellResult.reason as Error)?.message}` : null
      ].filter(Boolean).join('; ')
      await logService.createLog(userId, LogLevel.ERROR, 'Live trade failed', { errors, pair: opportunity.pair })
    } else {
      await logService.createLog(userId, LogLevel.INFO, 'Live trade executed', {
        pair: opportunity.pair,
        buyOrderId: buyOrder?.id,
        sellOrderId: sellOrder?.id,
        netProfit: '$' + netProfit.toFixed(4)
      })
    }

    return trade
  }

  async getStats(params: { userId?: string; period?: '24h' | '7d' | '30d' | 'all' } = {}) {
    const since = params.period === '24h'
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : params.period === '7d'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : params.period === '30d'
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          : undefined

    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(since ? { createdAt: { gte: since } } : {})
    }

    const [trades, totalTrades, wins, totalNetProfit] = await Promise.all([
      prisma.trade.findMany({ where }),
      prisma.trade.count({ where }),
      prisma.trade.count({ where: { ...where, netProfit: { gt: 0 } } }),
      prisma.trade.aggregate({ where, _sum: { netProfit: true } })
    ])

    const avgProfit = totalTrades > 0 ? (totalNetProfit._sum.netProfit ?? 0) / totalTrades : 0
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

    return {
      totalTrades,
      winRate,
      totalNetProfit: totalNetProfit._sum.netProfit ?? 0,
      avgProfit,
      profitableTrades: wins,
      losingTrades: totalTrades - wins,
      largestProfit: trades.reduce((max, trade) => Math.max(max, trade.netProfit), 0),
      largestLoss: trades.reduce((min, trade) => Math.min(min, trade.netProfit), 0)
    }
  }
}

export const tradeService = new TradeService()