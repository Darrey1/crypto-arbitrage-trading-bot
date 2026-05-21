import { EventEmitter } from 'events'
import { ExchangeName, Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { env, supportedExchanges, supportedPairs } from '../config/env'
import { exchangeService } from './exchangeService'
import { MarketTicker } from '../types/domain'
import { socketService } from './socketService'

class MarketDataService extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private latest = new Map<string, MarketTicker>()

  start() {
    if (this.timer) {
      return
    }

    this.tick().catch(() => undefined)
    this.timer = setInterval(() => {
      this.tick().catch(() => undefined)
    }, env.MARKET_POLL_INTERVAL_MS)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private key(exchange: ExchangeName, pair: string) {
    return `${exchange}:${pair}`
  }

  getLatestPrices() {
    return Array.from(this.latest.values())
  }

  async getCurrentPrices(pairs?: string[], exchanges?: string[]) {
    if (this.latest.size === 0) {
      await this.tick()
    }

    const prices = this.getLatestPrices()
    return prices.filter((price) => {
      const pairMatch = !pairs || pairs.length === 0 || pairs.includes(price.pair)
      const exchangeMatch = !exchanges || exchanges.length === 0 || exchanges.includes(price.exchange.toLowerCase())
      return pairMatch && exchangeMatch
    })
  }

  getLatestByPair(pair: string) {
    return this.getLatestPrices().filter((item) => item.pair === pair)
  }

  async tick() {
    const prices = await exchangeService.fetchCurrentPrices(supportedPairs, supportedExchanges)

    if (prices.length === 0) {
      return []
    }

    await prisma.priceSnapshot.createMany({
      data: prices.map((price) => ({
        exchange: price.exchange,
        pair: price.pair,
        lastPrice: price.lastPrice,
        bid: price.bid,
        ask: price.ask,
        volume24h: price.volume24h,
        high24h: price.high24h,
        low24h: price.low24h,
        latencyMs: price.latencyMs,
        timestamp: price.timestamp
      }))
    })

    for (const price of prices) {
      this.latest.set(this.key(price.exchange, price.pair), price)
    }
    socketService.emitToAll('prices:update', prices)
    this.emit('tick', prices)
    return prices
  }

  async getHistory(pair: string, exchange?: ExchangeName, limit = 100) {
  return prisma.priceSnapshot.findMany({
    where: {
      pair,
      ...(exchange && { exchange })
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  })
}
}

export const marketDataService = new MarketDataService()