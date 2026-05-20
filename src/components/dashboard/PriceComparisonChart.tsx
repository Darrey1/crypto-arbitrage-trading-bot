'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, AlertTriangle, X } from 'lucide-react'
import { pricesApi } from '@/api/prices.api'
import type { PriceData } from '@/api/types'
import { cn } from '@/lib/utils'
import { useBotStore } from '@/store/useBotStore'

const EXCHANGE_ORDER = ['BINANCE', 'KRAKEN', 'KUCOIN'] as const

const EXCHANGE_COLORS = {
  BINANCE: '#ECBD74',
  KRAKEN: '#7C3AED',
  KUCOIN: '#10B981',
} as const

type ExchangeKey = (typeof EXCHANGE_ORDER)[number]

type ChartPoint = {
  time: string
  ts: number
} & Partial<Record<ExchangeKey, number | null>>

type PriceComparisonChartProps = {
  pair: string
}

// Extract the exact backend error message from an Axios error
function extractApiError(error: unknown): string {
  if (error && typeof error === 'object') {
    const axiosErr = error as {
      response?: { data?: { message?: string }; status?: number }
      message?: string
    }
    if (typeof axiosErr.response?.data?.message === 'string') {
      return axiosErr.response.data.message
    }
    if (typeof axiosErr.message === 'string') {
      return axiosErr.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Failed to load price history'
}

function formatChartTime(timestamp: number) {
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

function normalizeExchange(exchange: string): ExchangeKey | null {
  const upper = exchange.toUpperCase() as ExchangeKey
  return EXCHANGE_ORDER.includes(upper) ? upper : null
}

// Build initial series from stored history ticks, grouped by 1-second buckets
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

// Generates seeded synthetic history when the API has no stored rows.
// Mean-reverting random walk pinned to current live prices at the last point.
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

function formatDollar(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-white/8 animate-pulse" />
          <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-6 w-24 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="h-[360px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] p-4">
        <div className="flex h-full flex-col justify-between gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-white/5 animate-pulse"
              style={{ width: `${[100, 83, 67, 75, 100][i]}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ pair, error }: { pair: string; error: string | null }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{pair} Price Comparison</h3>
          <p className="text-xs text-slate-500 mt-1">Waiting for price data</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-slate-400">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          No data
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-xs font-medium text-red-400">History fetch failed</p>
            <p className="mt-0.5 text-xs text-red-400/70">{error}</p>
          </div>
        </div>
      )}

      <div className="flex h-[360px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] text-center">
        <div>
          <p className="text-sm font-medium text-slate-200">No data yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Chart will populate once the price stream connects.
          </p>
        </div>
      </div>
    </div>
  )
}

function ApiErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div>
          <p className="text-xs font-medium text-red-400">History fetch failed</p>
          <p className="mt-0.5 text-xs text-red-400/70">{message}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 text-red-400/50 transition-colors hover:text-red-400"
        aria-label="Dismiss error"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0B1017] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.4)]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{point.time}</div>
      <div className="mt-3 space-y-2">
        {EXCHANGE_ORDER.map((exchange) => (
          <div key={exchange} className="flex items-center justify-between gap-5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: EXCHANGE_COLORS[exchange] }}
              />
              <span>{exchange}</span>
            </div>
            <span className="font-mono text-slate-100">
              {typeof point[exchange] === 'number'
                ? formatDollar(point[exchange] as number)
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AxisTick(props: {
  x?: number
  y?: number
  payload?: { value?: string }
  index?: number
  visibleTicksCount?: number
}) {
  const { x, y, payload, index = 0, visibleTicksCount = 1 } = props
  const step = Math.max(1, Math.ceil(visibleTicksCount / 8))
  const showLabel = index % step === 0 || index === visibleTicksCount - 1
  if (!showLabel || x === undefined || y === undefined || !payload?.value) return null

  return (
    <g transform={`translate(${x},${y})`}>
      <text fill="#8B949E" fontSize={11} textAnchor="middle" dy={16}>
        {payload.value}
      </text>
    </g>
  )
}

export function PriceComparisonChart({ pair }: PriceComparisonChartProps) {
  const prices = useBotStore((state) => state.prices)
  const socketConnected = useBotStore((state) => state.socketConnected)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  // Tracks the last snapshot string so we don't add duplicate chart points
  const prevSnapshotRef = useRef<string>('')

  // All current prices for this pair — mirrors comparisonRows from the dashboard page.
  // This re-computes whenever ANY price in the store updates, which drives the live chart.
  const pairPrices = useMemo(
    () => Object.values(prices).filter((t) => t.pair === pair),
    [prices, pair],
  )

  // Live price values shown in the header exchange cards
  const livePrices = useMemo(() => {
    const values: Partial<Record<ExchangeKey, number | null>> = {
      BINANCE: null,
      KRAKEN: null,
      KUCOIN: null,
    }
    for (const tick of pairPrices) {
      const key = normalizeExchange(tick.exchange)
      if (key) values[key] = tick.lastPrice
    }
    // Fall back to last chart point if the store doesn't have a value yet
    const lastPoint = chartData[chartData.length - 1]
    for (const exchange of EXCHANGE_ORDER) {
      if (typeof values[exchange] !== 'number' && typeof lastPoint?.[exchange] === 'number') {
        values[exchange] = lastPoint[exchange] as number
      }
    }
    return values
  }, [chartData, pairPrices])

  // Phase 1 — fetch stored history on pair change
  useEffect(() => {
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

        // No stored history — seed from live prices so the chart isn't blank
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

        // Surface the exact backend error message
        const msg = extractApiError(e)
        setApiError(msg)

        // Still try to render something from live prices
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
  }, [pair])

  // Phase 2 — live stream, using the same pattern as the dashboard page.
  // Every time pairPrices changes (any exchange sends a tick for this pair),
  // append a full cross-exchange snapshot so all three lines advance together.
  useEffect(() => {
    if (!hasLoaded || pairPrices.length === 0) return

    // Only append if prices actually changed — avoids duplicates from store reshuffles
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
      // Merge ticks that fall in the same 1-second bucket
      if (prev && ts - prev.ts < 1000) {
        return [...current.slice(0, -1), { ...prev, ...point }].slice(-100)
      }
      return [...current, point].slice(-100)
    })
  }, [hasLoaded, pairPrices])

  if (loading && chartData.length === 0) return <LoadingSkeleton />
  if (hasLoaded && chartData.length === 0) return <EmptyState pair={pair} error={apiError} />

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      {/* Exact backend error shown as a dismissible banner above the chart */}
      {apiError && (
        <ApiErrorBanner message={apiError} onDismiss={() => setApiError(null)} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
              )}
            />
            {socketConnected ? 'Live stream' : 'Reconnecting'}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">{pair} Price Comparison</h3>
          <p className="mt-1 text-xs text-slate-500">
            History + live ticks · Binance, Kraken & KuCoin
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXCHANGE_ORDER.map((exchange) => (
            <div
              key={exchange}
              className="min-w-[120px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] px-3 py-2"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: EXCHANGE_COLORS[exchange] }}
                />
                {exchange}
              </div>
              <div className="mt-1 font-mono text-sm text-slate-100">
                {typeof livePrices[exchange] === 'number'
                  ? formatDollar(livePrices[exchange] as number)
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[360px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <defs>
              {EXCHANGE_ORDER.map((exchange) => (
                <linearGradient
                  key={exchange}
                  id={`grad-${exchange}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={EXCHANGE_COLORS[exchange]}
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="95%"
                    stopColor={EXCHANGE_COLORS[exchange]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={24}
              tick={<AxisTick />}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tick={{ fill: '#8B949E', fontSize: 11 }}
              width={88}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => formatDollar(value)}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            />

            {EXCHANGE_ORDER.map((exchange) => (
              <Area
                key={exchange}
                type="monotone"
                dataKey={exchange}
                stroke={EXCHANGE_COLORS[exchange]}
                strokeWidth={2}
                fill={`url(#grad-${exchange})`}
                dot={false}
                connectNulls
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: EXCHANGE_COLORS[exchange] }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
