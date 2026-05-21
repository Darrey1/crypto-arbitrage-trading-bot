import { ExchangeName } from '@prisma/client'
import { MarketTicker, OpportunityView, BotRuntimeConfig } from '../types/domain'

const feeSchedule: Record<ExchangeName, number> = {
  BINANCE: 0.001,
  KRAKEN: 0.0026,
  KUCOIN: 0.001
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

class ArbitrageService {
  detectOpportunities(prices: MarketTicker[], config: BotRuntimeConfig): OpportunityView[] {
    const relevantPrices = config.tradingPair === 'ALL'
      ? prices
      : prices.filter((price) => price.pair === config.tradingPair)

    const opportunities: OpportunityView[] = []

    const byPair = new Map<string, MarketTicker[]>()
    for (const price of relevantPrices) {
      const current = byPair.get(price.pair) ?? []
      current.push(price)
      byPair.set(price.pair, current)
    }

    for (const [pair, pairPrices] of byPair.entries()) {
      for (const buy of pairPrices) {
        for (const sell of pairPrices) {
          if (buy.exchange === sell.exchange) {
            continue
          }

          if (sell.bid <= buy.ask || buy.ask <= 0) {
            continue
          }
          const grossSpread = (sell.bid - buy.ask) / buy.ask
          const buyFee = feeSchedule[buy.exchange]
          const sellFee = feeSchedule[sell.exchange]
          const netSpread = grossSpread - buyFee - sellFee - config.slippageTolerance

          if (netSpread < config.minSpreadThreshold) {
            continue
          }
          
          const estProfit = config.maxTradeSize * netSpread
          const confidence = clamp(0.55 + netSpread * 12, 0.5, 0.99)

          opportunities.push({
            id: `${pair}-${buy.exchange}-${sell.exchange}-${Date.now()}`,
            pair,
            buyExchange: buy.exchange,
            sellExchange: sell.exchange,
            buyPrice: buy.ask,
            sellPrice: sell.bid,
            spread: grossSpread,
            netSpread,
            estProfit,
            confidence,
            status: 'NEW',
            createdAt: new Date(),
            executedAt: null,
            metadata: {
              buyPrice: buy.ask,
              sellPrice: sell.bid,
              buyLatencyMs: buy.latencyMs,
              sellLatencyMs: sell.latencyMs
            }
          })
        }
      }
    }

    return opportunities.sort((left, right) => right.netSpread - left.netSpread)
  }
}

export const arbitrageService = new ArbitrageService()