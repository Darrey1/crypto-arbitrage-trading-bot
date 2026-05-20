import { PriceTick, ArbitrageOpportunity, ExchangeId } from '@/types'
import { generateId, EXCHANGES, calculateNetSpread, estimateProfit } from './utils'

// Realistic ETH base prices with slight exchange drift
const BASE_ETH_PRICE = 3245.50

interface PriceState {
  binance: number
  kraken: number
  kucoin: number
  trend: number
}

const priceState: PriceState = {
  binance: BASE_ETH_PRICE,
  kraken: BASE_ETH_PRICE * 1.0008,
  kucoin: BASE_ETH_PRICE * 0.9994,
  trend: 0,
}

function nextPrice(current: number, volatility = 0.0015): number {
  const drift = (Math.random() - 0.49) * volatility
  return current * (1 + drift)
}

export function tickPrices(symbol = 'ETH/USDT'): PriceTick[] {
  // Update trend
  priceState.trend += (Math.random() - 0.5) * 0.001
  priceState.trend = Math.max(-0.005, Math.min(0.005, priceState.trend))

  priceState.binance = nextPrice(priceState.binance + priceState.binance * priceState.trend * 0.3)
  priceState.kraken  = nextPrice(priceState.kraken  + priceState.kraken  * priceState.trend * 0.28)
  priceState.kucoin  = nextPrice(priceState.kucoin  + priceState.kucoin  * priceState.trend * 0.32)

  const spread = 0.0002

  const exchanges: ExchangeId[] = ['binance', 'kraken', 'kucoin']
  return exchanges.map(ex => {
    const mid = priceState[ex]
    return {
      exchange: ex,
      symbol,
      bid: mid * (1 - spread),
      ask: mid * (1 + spread),
      last: mid,
      volume24h: ex === 'binance' ? 180000 + Math.random() * 5000
                : ex === 'kraken' ? 42000  + Math.random() * 2000
                : 65000 + Math.random() * 3000,
      change24h: (Math.random() - 0.48) * 4,
      timestamp: Date.now(),
    }
  })
}

export function detectOpportunity(
  ticks: PriceTick[],
  minSpread: number,
  tradeSize: number,
  symbol = 'ETH/USDT',
): ArbitrageOpportunity | null {
  const exchanges: ExchangeId[] = ['binance', 'kraken', 'kucoin']
  let best: ArbitrageOpportunity | null = null

  for (const buyEx of exchanges) {
    for (const sellEx of exchanges) {
      if (buyEx === sellEx) continue

      const buyTick  = ticks.find(t => t.exchange === buyEx)
      const sellTick = ticks.find(t => t.exchange === sellEx)
      if (!buyTick || !sellTick) continue

      const buyPrice  = buyTick.ask
      const sellPrice = sellTick.bid

      const buyFee  = EXCHANGES[buyEx].fee
      const sellFee = EXCHANGES[sellEx].fee

      const { gross, fees, net } = calculateNetSpread(buyPrice, sellPrice, buyFee, sellFee)

      if (net < minSpread) continue

      const profit = estimateProfit(buyPrice, sellPrice, buyFee, sellFee, tradeSize)

      if (!best || net > best.netSpread) {
        best = {
          id: generateId(),
          symbol,
          buyExchange: buyEx,
          sellExchange: sellEx,
          buyPrice,
          sellPrice,
          grossSpread: gross,
          fees,
          netSpread: net,
          estimatedProfit: profit,
          tradeSize,
          detectedAt: Date.now(),
          expiresAt: Date.now() + 15000,
          status: 'active',
        }
      }
    }
  }

  return best
}
