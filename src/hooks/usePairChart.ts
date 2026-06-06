'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { pricesApi } from '@/api/prices.api'
import type { PriceData } from '@/api/types'
import { useBotStore } from '@/store/useBotStore'
import { useAuthStore } from '@/store/useAuthStore'

export const EXCHANGE_ORDER = ['OKX', 'KRAKEN', 'KUCOIN'] as const

export const EXCHANGE_COLORS = {
  OKX: '#ECBD74',
  KRAKEN: '#7C3AED',
  KUCOIN: '#10B981',
} as const

export type ExchangeKey = (typeof EXCHANGE_ORDER)[number]

export type ChartPoint = {
  time: string
  ts: number
} & Partial<Record<ExchangeKey, number | null>>

// ─── pure helpers ────────────────────────────────────────────────────────────

export function formatChartTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function normalizeTimestamp(timestamp: string) {
  const parsed = new Date(timestamp).getTime()
  return Number.isNaN(parsed) ? Date.now() : Math.floor(parsed / 1000) * 1000
}

export function normalizeExchange(exchange: string): ExchangeKey | null {
  const upper = exchange.toUpperCase() as ExchangeKey
  return EXCHANGE_ORDER.includes(upper) ? upper : null
}

export function extractApiError(error: unknown): string {
  if (error && typeof error === 'object') {
    const axiosErr = error as {
      response?: { data?: unknown; status?: number }
      message?: string
    }

    const data = axiosErr.response?.data

    if (data !== undefined && data !== null) {
      // Standard backend JSON: { success: false, message: "...", data: null }
      if (typeof data === 'object' && 'message' in (data as object)) {
        const msg = (data as Record<string, unknown>).message
        if (typeof msg === 'string' && msg.trim()) return msg.trim()
      }

      // Axios may return the body as a plain string when Content-Type is not JSON
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>
          if (typeof parsed.message === 'string' && parsed.message.trim()) {
            return parsed.message.trim()
          }
        } catch {
          // Ngrok free-tier interstitial page — HTML instead of JSON
          if (/<html/i.test(data)) {
            return 'Cannot reach the API — your ngrok tunnel may have expired. Restart ngrok and update NEXT_PUBLIC_API_BASE_URL in .env.local.'
          }
          if (data.trim()) return data.slice(0, 200)
        }
      }
    }

    if (typeof axiosErr.message === 'string' && axiosErr.message) {
      return axiosErr.message
    }
  }

  if (error instanceof Error) return error.message
  return 'Request failed — check your connection and try again.'
}

function buildSeries(history: PriceData[]): ChartPoint[] {
  const rows = new Map<number, ChartPoint>()

  for (const tick of history
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
    const key = normalizeExchange(tick.exchange)
    if (!key) continue
    const ts = normalizeTimestamp(tick.timestamp)
    const existing = rows.get(ts) ?? { time: formatChartTime(ts), ts }
    existing[key] = tick.lastPrice
    rows.set(ts, existing)
  }

  return Array.from(rows.values()).sort((a, b) => a.ts - b.ts)
}

function getHistoryTicks(payload: unknown): PriceData[] {
  if (Array.isArray(payload)) return payload as PriceData[]
  if (
    payload &&
    typeof payload === 'object' &&
    'items' in payload &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: PriceData[] }).items
  }
  return []
}

function generateSyntheticHistory(
  currentPrices: Partial<Record<ExchangeKey, number | null>>,
  count = 60,
): ChartPoint[] {
  const INTERVAL = 5_000
  const now = Date.now()

  const exchanges = EXCHANGE_ORDER.filter(
    (ex) => typeof currentPrices[ex] === 'number' && (currentPrices[ex] as number) > 0,
  )
  if (exchanges.length === 0) return []

  const track: Partial<Record<ExchangeKey, number>> = {}
  for (const ex of exchanges) {
    const price = currentPrices[ex] as number
    track[ex] = price * (1 + (Math.random() - 0.5) * 0.004)
  }

  const points: ChartPoint[] = []
  for (let i = 0; i < count; i++) {
    const ts = now - (count - 1 - i) * INTERVAL
    const point: ChartPoint = { time: formatChartTime(ts), ts }

    for (const ex of exchanges) {
      if (i === count - 1) {
        point[ex] = currentPrices[ex] as number
      } else {
        const base = currentPrices[ex] as number
        const cur = track[ex]!
        const meanReversion = (base - cur) * 0.15 * (i / count)
        const noise = base * 0.00025 * (Math.random() - 0.5) * 2
        track[ex] = cur + meanReversion + noise
        point[ex] = Math.round(track[ex]! * 100) / 100
      }
    }

    points.push(point)
  }
  return points
}

// ─── hook ────────────────────────────────────────────────────────────────────

export interface PairChartState {
  chartData: ChartPoint[]
  loading: boolean
  hasLoaded: boolean
  apiError: string | null
  livePrices: Partial<Record<ExchangeKey, number | null>>
  dismissError: () => void
}

/**
 * Manages price chart data for a single trading pair.
 *
 * Phase 1 – fetches stored history from the API on mount / pair change.
 *            Falls back to synthetic seeded data when the API returns nothing.
 * Phase 2 – watches live prices from the store (same pattern as dashboard
 *            comparisonRows) and appends a full cross-exchange snapshot point
 *            on every tick, so all three lines advance together.
 */
export function usePairChart(pair: string): PairChartState {
  const prices = useBotStore((state) => state.prices)
  // Auth guard — prevents API calls (and backend 401 floods) before the store is hydrated
  const hydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const prevSnapshotRef = useRef<string>('')

  // All current prices for this pair — re-computed on every store tick
  const pairPrices = useMemo(
    () => Object.values(prices).filter((t) => t.pair === pair),
    [prices, pair],
  )

  // Live header-card prices (with last chart point as fallback)
  const livePrices = useMemo<Partial<Record<ExchangeKey, number | null>>>(() => {
    const values: Partial<Record<ExchangeKey, number | null>> = {
      OKX: null,
      KRAKEN: null,
      KUCOIN: null,
    }
    for (const tick of pairPrices) {
      const key = normalizeExchange(tick.exchange)
      if (key) values[key] = tick.lastPrice
    }
    const lastPoint = chartData[chartData.length - 1]
    for (const exchange of EXCHANGE_ORDER) {
      if (typeof values[exchange] !== 'number' && typeof lastPoint?.[exchange] === 'number') {
        values[exchange] = lastPoint[exchange] as number
      }
    }
    return values
  }, [chartData, pairPrices])

  // Phase 1 — history fetch (only after auth store is hydrated and user is logged in)
  useEffect(() => {
    if (!pair || !hydrated || !isAuthenticated) return
    let active = true

    setTimeout(() => {
      if (!active) return
      setLoading(true)
      setHasLoaded(false)
      setChartData([])
      setApiError(null)
      prevSnapshotRef.current = ''
    }, 0)

    pricesApi
      .getHistory({ pair, limit: 100 })
      .then((response) => {
        if (!active) return

        const ticks = getHistoryTicks(response?.data?.data)
        let series = buildSeries(ticks.filter((t) => t.pair === pair))

        if (series.length === 0) {
          const storePrices = useBotStore.getState().prices
          const current: Partial<Record<ExchangeKey, number | null>> = {}
          for (const tick of Object.values(storePrices)) {
            if (tick.pair !== pair) continue
            const key = normalizeExchange(tick.exchange)
            if (key) current[key] = tick.lastPrice
          }
          series = generateSyntheticHistory(current)
        }

        setChartData(series.slice(-100))
        setHasLoaded(true)
      })
      .catch((e) => {
        if (!active) return
        setApiError(extractApiError(e))

        const storePrices = useBotStore.getState().prices
        const current: Partial<Record<ExchangeKey, number | null>> = {}
        for (const tick of Object.values(storePrices)) {
          if (tick.pair !== pair) continue
          const key = normalizeExchange(tick.exchange)
          if (key) current[key] = tick.lastPrice
        }
        setChartData(generateSyntheticHistory(current))
        setHasLoaded(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [pair, hydrated, isAuthenticated])

  // Phase 2 — live stream: append a full cross-exchange snapshot on every tick
  useEffect(() => {
    if (!hasLoaded || pairPrices.length === 0) return

    const snapshotKey = pairPrices
      .map((t) => `${t.exchange}:${t.lastPrice}:${t.timestamp}`)
      .sort()
      .join('|')
    if (prevSnapshotRef.current === snapshotKey) return
    prevSnapshotRef.current = snapshotKey

    const ts = Date.now()
    const point: ChartPoint = { time: formatChartTime(ts), ts }
    for (const tick of pairPrices) {
      const key = normalizeExchange(tick.exchange)
      if (key) point[key] = tick.lastPrice
    }

    setChartData((current) => {
      const prev = current[current.length - 1]
      if (prev && ts - prev.ts < 1000) {
        return [...current.slice(0, -1), { ...prev, ...point }].slice(-100)
      }
      return [...current, point].slice(-100)
    })
  }, [hasLoaded, pairPrices])

  return {
    chartData,
    loading,
    hasLoaded,
    apiError,
    livePrices,
    dismissError: () => setApiError(null),
  }
}
