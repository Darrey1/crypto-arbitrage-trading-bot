import { ExchangeName, Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { marketDataService } from './marketDataService'
import { PortfolioBalance, PortfolioHistoryPoint } from '../types/domain'
import { env, supportedExchanges } from '../config/env'

const defaultPaperBalance = 10000

const exchangeWeights: Record<ExchangeName, number> = {
  BINANCE: 0.563,
  KRAKEN: 0.258,
  KUCOIN: 0.179
}

class PortfolioService {
  private getReferenceEthPrice(exchange: ExchangeName) {
    const current = marketDataService.getLatestPrices().find((price) => price.exchange === exchange && price.pair === 'ETH/USDT')
    return current?.lastPrice ?? 3200
  }

  async ensureInitialSnapshot(userId: string) {
    const existing = await prisma.portfolioSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
    if (existing) {
      return existing
    }
    
    const balances = this.buildDefaultBalances()
    return prisma.portfolioSnapshot.create({
      data: {
        userId,
        totalValue: balances.reduce((sum, balance) => sum + balance.totalValue, 0),
        dailyChange: 0,
        allocations: balances as unknown as Prisma.InputJsonValue
      }
    })
  }

  private buildDefaultBalances(): PortfolioBalance[] {
    return supportedExchanges.map((exchangeKey) => {
      const exchange = exchangeKey.toUpperCase() as ExchangeName
      const weight = exchangeWeights[exchange]
      const totalValue = defaultPaperBalance * weight
      const ethPrice = this.getReferenceEthPrice(exchange)
      const ethValue = totalValue * 0.35
      const usdt = totalValue - ethValue
      const eth = ethValue / ethPrice

      return {
        exchange,
        totalValue,
        usdt,
        eth,
        ethValue,
        connected: true
      }
    })
  }

  async getBalances(userId: string): Promise<PortfolioBalance[]> {
    const snapshot = await this.ensureInitialSnapshot(userId)
    const allocations = snapshot.allocations as PortfolioBalance[] | null
    if (Array.isArray(allocations) && allocations.length > 0) {
      return allocations
    }

    return this.buildDefaultBalances()
  }

  async getHistory(userId: string, period: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<PortfolioHistoryPoint[]> {
    const limitMap = {
      '24h': 24,
      '7d': 7,
      '30d': 30,
      '90d': 90
    } as const

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limitMap[period]
    })

    return snapshots.map((snapshot) => ({
      totalValue: snapshot.totalValue,
      dailyChange: snapshot.dailyChange,
      createdAt: snapshot.createdAt
    }))
  }
}

export const portfolioService = new PortfolioService()