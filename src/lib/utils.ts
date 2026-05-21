import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ExchangeId, ExchangeInfo } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const EXCHANGES: Record<ExchangeId, ExchangeInfo> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    color: '#F0B90B',
    fee: 0.001,
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    logo: '/exchanges/kraken.svg',
    color: '#5741D9',
    fee: 0.002,
  },
  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    logo: '/exchanges/kucoin.svg',
    color: '#24AE8F',
    fee: 0.001,
  },
}

export const SUPPORTED_PAIRS = ['ETH/USDT', 'ETH/BTC', 'BTC/USDT']
export const DEFAULT_PAIR = 'ETH/USDT'

export function formatCurrency(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
  return `$${value.toFixed(decimals)}`
}

export function formatPrice(value: number): string {
  if (!isFinite(value)) return '--'
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value.toFixed(4)
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatProfitColor(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function calculateNetSpread(
  buyPrice: number,
  sellPrice: number,
  buyFee: number,
  sellFee: number,
): { gross: number; fees: number; net: number } {
  const gross = ((sellPrice - buyPrice) / buyPrice) * 100
  const fees = (buyFee + sellFee) * 100
  const net = gross - fees
  return { gross, fees, net }
}

export function estimateProfit(
  buyPrice: number,
  sellPrice: number,
  buyFee: number,
  sellFee: number,
  tradeSize: number,
): number {
  const amount = tradeSize / buyPrice
  const sellRevenue = amount * sellPrice
  const buyFeeCost = tradeSize * buyFee
  const sellFeeCost = sellRevenue * sellFee
  return sellRevenue - tradeSize - buyFeeCost - sellFeeCost
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Sparkline data helper
export function generateSparkline(base: number, points = 20, volatility = 0.02): number[] {
  const data: number[] = [base]
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility
    data.push(data[i - 1] * (1 + change))
  }
  return data
}

// Mock price generator for paper trading
export function getMockPrice(base: number, exchange: ExchangeId): number {
  const offsets: Record<ExchangeId, number> = {
    binance: 0,
    kraken: (Math.random() - 0.5) * 0.003 * base,
    kucoin: (Math.random() - 0.5) * 0.004 * base,
  }
  return base + offsets[exchange]
}
