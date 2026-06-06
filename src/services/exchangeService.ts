import * as ccxt from 'ccxt'
import { ExchangeName } from '@prisma/client'
import { supportedExchanges } from '../config/env'
import { decryptSecret } from '../lib/crypto'
import { ExchangeCredInput, MarketTicker } from '../types/domain'

export type ExchangeKey = 'binance' | 'kucoin' | 'kraken'

const exchangeFactories: Record<ExchangeKey, () => any> = {
  binance: () => new ccxt.binance({
    enableRateLimit: true,
    httpsProxy: process.env.HTTPS_PROXY,
    options: {
      defaultType: 'spot',
      adjustForTimeDifference: true,
    }
  }),
  kucoin: () => new ccxt.kucoin({ enableRateLimit: true }),
  kraken: () => new ccxt.kraken({ enableRateLimit: true })
}

const toExchangeName = (exchange: string): ExchangeName => {
  switch (exchange) {
    case 'binance':
      return ExchangeName.BINANCE
    case 'kucoin':
      return ExchangeName.KUCOIN
    default:
      return ExchangeName.KRAKEN
  }
}

class ExchangeService {
  private exchanges = new Map<ExchangeKey, any>()

  private getExchange(exchange: ExchangeKey) {
    const cached = this.exchanges.get(exchange)
    if (cached) {
      return cached
    }

    const instance = exchangeFactories[exchange]()
    this.exchanges.set(exchange, instance)
    return instance
  }

  getAvailableExchanges() {
    return supportedExchanges
      .map((exchange) => exchange.toLowerCase())
      .filter((exchange): exchange is ExchangeKey => exchange in exchangeFactories)
  }

  async fetchTicker(exchange: ExchangeKey, pair: string): Promise<MarketTicker | null> {
    const client = this.getExchange(exchange)
    const startedAt = Date.now()

    try {
      const ticker = await client.fetchTicker(pair)
      const latencyMs = Date.now() - startedAt

      const lastPrice = Number(ticker.last ?? ticker.close ?? ticker.bid ?? ticker.ask ?? 0)
      const bid = Number(ticker.bid ?? lastPrice)
      const ask = Number(ticker.ask ?? lastPrice)

      if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
        return null
      }

      return {
        exchange: toExchangeName(exchange),
        pair,
        lastPrice,
        bid,
        ask,
        volume24h: typeof ticker.baseVolume === 'number' ? ticker.baseVolume : typeof ticker.quoteVolume === 'number' ? ticker.quoteVolume : null,
        high24h: typeof ticker.high === 'number' ? ticker.high : null,
        low24h: typeof ticker.low === 'number' ? ticker.low : null,
        latencyMs,
        timestamp: new Date()
      }
    } catch (error) {
      console.error(`[${exchange.toUpperCase()}] Failed to fetch ticker for ${pair}:`, {
        message: (error as any)?.message,
        type: (error as any)?.constructor?.name,
        url: (error as any)?.url,
      })
  return null
}
  }

  async fetchCurrentPrices(pairs: string[], exchanges: string[]): Promise<MarketTicker[]> {
    const validExchanges = exchanges.filter((exchange): exchange is ExchangeKey => exchange in exchangeFactories)
    const requests: Promise<MarketTicker | null>[] = []

    for (const exchange of validExchanges) {
      for (const pair of pairs) {
        requests.push(this.fetchTicker(exchange, pair))
      }
    }

    const results = await Promise.all(requests)
    return results.filter((result): result is MarketTicker => Boolean(result))
  }

  async placeOrder(
    exchangeName: ExchangeKey,
    cred: ExchangeCredInput,
    pair: string,
    side: 'buy' | 'sell',
    amount: number
  ): Promise<{ id: string; price: number; amount: number } | null> {
    try {
      const secret = decryptSecret(cred.encryptedSecret, cred.iv, cred.authTag)
      const client = exchangeFactories[exchangeName]()
      client.apiKey = cred.apiKey
      client.secret = secret
      if (cred.passphrase) client.password = cred.passphrase

      const order = await client.createMarketOrder(pair, side, amount)
      return {
        id: String(order.id),
        price: Number(order.price ?? order.average ?? 0),
        amount: Number(order.filled ?? order.amount ?? amount)
      }
    } catch {
      return null
    }
  }
}

export const exchangeService = new ExchangeService()