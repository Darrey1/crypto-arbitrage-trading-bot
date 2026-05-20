'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity } from 'lucide-react'
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
  if (Number.isNaN(parsed)) {
    return Date.now()
  }

  return Math.floor(parsed / 1000) * 1000
}

function buildSeries(history: PriceData[]) {
  const rows = new Map<number, ChartPoint>()

  for (const tick of history.slice().sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())) {
    const ts = normalizeTimestamp(tick.timestamp)
    const existing = rows.get(ts) ?? { time: formatChartTime(ts), ts }
    existing[tick.exchange] = tick.lastPrice
    rows.set(ts, existing)
  }

  return Array.from(rows.values()).sort((left, right) => left.ts - right.ts)
}

function getHistoryTicks(payload: unknown): PriceData[] {
  if (Array.isArray(payload)) {
    return payload as PriceData[]
  }

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

function appendTick(series: ChartPoint[], tick: PriceData) {
  const ts = normalizeTimestamp(tick.timestamp)
  const previous = series[series.length - 1]
  const next: ChartPoint = {
    ...(previous ?? { time: formatChartTime(ts), ts }),
    time: formatChartTime(ts),
    ts,
    [tick.exchange]: tick.lastPrice,
  }

  if (previous && previous.ts === ts) {
    return [...series.slice(0, -1), next].slice(-100)
  }

  return [...series, next].slice(-100)
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
          <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ pair }: { pair: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{pair} Price Comparison</h3>
          <p className="text-xs text-slate-500 mt-1">Waiting for price history</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-slate-400">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          No data
        </div>
      </div>
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] text-center">
        <div>
          <p className="text-sm font-medium text-slate-200">No history available</p>
          <p className="mt-1 text-xs text-slate-500">Try a different pair or wait for the next ticks to arrive.</p>
        </div>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]?.payload

  if (!point) {
    return null
  }

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0B1017] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.4)]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{point.time}</div>
      <div className="mt-3 space-y-2">
        {EXCHANGE_ORDER.map((exchange) => (
          <div key={exchange} className="flex items-center justify-between gap-5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: EXCHANGE_COLORS[exchange] }} />
              <span>{exchange}</span>
            </div>
            <span className="font-mono text-slate-100">{typeof point[exchange] === 'number' ? formatDollar(point[exchange] as number) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AxisTick(props: { x?: number; y?: number; payload?: { value?: string }; index?: number; visibleTicksCount?: number }) {
  const { x, y, payload, index = 0, visibleTicksCount = 1 } = props
  const step = Math.max(1, Math.ceil(visibleTicksCount / 8))
  const showLabel = index % step === 0 || index === visibleTicksCount - 1

  if (!showLabel || x === undefined || y === undefined || !payload?.value) {
    return null
  }

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
  const lastPriceTick = useBotStore((state) => state.lastPriceTick)
  const socketConnected = useBotStore((state) => state.socketConnected)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const lastAppliedTickRef = useRef<string | null>(null)

  const livePrices = useMemo(() => {
    const values: Partial<Record<ExchangeKey, number | null>> = {
      BINANCE: null,
      KRAKEN: null,
      KUCOIN: null,
    }

    for (const tick of Object.values(prices)) {
      if (tick.pair !== pair) {
        continue
      }

      values[tick.exchange] = tick.lastPrice
    }

    const lastChartPoint = chartData[chartData.length - 1]
    for (const exchange of EXCHANGE_ORDER) {
      if (typeof values[exchange] !== 'number' && typeof lastChartPoint?.[exchange] === 'number') {
        values[exchange] = lastChartPoint[exchange] as number
      }
    }

    return values
  }, [chartData, pair, prices])

  useEffect(() => {
    let active = true

    setTimeout(() => {
      if (!active) return
      setLoading(true)
      setHasLoaded(false)
      setChartData([])
      lastAppliedTickRef.current = null
    }, 0)

    pricesApi.getHistory({ pair, limit: 100 })
      .then((response) => {
        if (!active) {
          return
        }

        const ticks = getHistoryTicks(response?.data?.data)
        const series = buildSeries(ticks.filter((tick) => tick.pair === pair))
        setChartData(series.slice(-100))
        setHasLoaded(true)
      })
      .catch((e) => {
        console.error('Failed to load price history:', e)
        if (!active) {
          return
        }

        setChartData([])
        setHasLoaded(true)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [pair])


  useEffect(() => {
    if (!hasLoaded || !lastPriceTick || lastPriceTick.pair !== pair) {
      return
    }

    const tickKey = `${lastPriceTick.timestamp}:${lastPriceTick.exchange}:${lastPriceTick.lastPrice}`
    if (lastAppliedTickRef.current === tickKey) {
      return
    }

    setChartData((current) => appendTick(current, lastPriceTick))
    lastAppliedTickRef.current = tickKey
  }, [hasLoaded, lastPriceTick, pair])

  if (loading && chartData.length === 0) {
    return <LoadingSkeleton />
  }

  if (hasLoaded && chartData.length === 0) {
    return <EmptyState pair={pair} />
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span className={cn('h-2.5 w-2.5 rounded-full', socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
            {socketConnected ? 'Live' : 'Reconnecting'}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-slate-100">{pair} Price Comparison</h3>
          <p className="mt-1 text-xs text-slate-500">Last 100 ticks across Binance, Kraken, and KuCoin.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXCHANGE_ORDER.map((exchange) => (
            <div key={exchange} className="min-w-[120px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: EXCHANGE_COLORS[exchange] }} />
                {exchange}
              </div>
              <div className="mt-1 font-mono text-sm text-slate-100">{typeof livePrices[exchange] === 'number' ? formatDollar(livePrices[exchange] as number) : '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[360px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
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
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
            {EXCHANGE_ORDER.map((exchange) => (
              <Line
                key={exchange}
                type="monotone"
                dataKey={exchange}
                stroke={EXCHANGE_COLORS[exchange]}
                strokeWidth={2.2}
                dot={false}
                connectNulls
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
