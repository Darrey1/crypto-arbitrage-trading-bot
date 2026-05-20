'use client'

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
import { cn } from '@/lib/utils'
import { useBotStore } from '@/store/useBotStore'
import {
  EXCHANGE_COLORS,
  EXCHANGE_ORDER,
  usePairChart,
  type ChartPoint,
  type ExchangeKey,
} from '@/hooks/usePairChart'

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
              <span className="h-2 w-2 rounded-full" style={{ background: EXCHANGE_COLORS[exchange] }} />
              <span>{exchange}</span>
            </div>
            <span className="font-mono text-slate-100">
              {typeof point[exchange] === 'number' ? formatDollar(point[exchange] as number) : '—'}
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

export function PriceComparisonChart({ pair }: { pair: string }) {
  const socketConnected = useBotStore((state) => state.socketConnected)
  const { chartData, loading, hasLoaded, apiError, livePrices, dismissError } = usePairChart(pair)

  if (loading && chartData.length === 0) return <LoadingSkeleton />
  if (hasLoaded && chartData.length === 0) return <EmptyState pair={pair} error={apiError} />

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      {apiError && <ApiErrorBanner message={apiError} onDismiss={dismissError} />}

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
          <p className="mt-1 text-xs text-slate-500">History + live ticks · Binance, Kraken & KuCoin</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXCHANGE_ORDER.map((exchange) => (
            <div
              key={exchange}
              className="min-w-[120px] rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.025)] px-3 py-2"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: EXCHANGE_COLORS[exchange] }} />
                {exchange}
              </div>
              <div className="mt-1 font-mono text-sm text-slate-100">
                {typeof livePrices[exchange as ExchangeKey] === 'number'
                  ? formatDollar(livePrices[exchange as ExchangeKey] as number)
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
                <linearGradient key={exchange} id={`pcc-grad-${exchange}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXCHANGE_COLORS[exchange]} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={EXCHANGE_COLORS[exchange]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} tick={<AxisTick />} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tick={{ fill: '#8B949E', fontSize: 11 }}
              width={88}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => formatDollar(v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
            {EXCHANGE_ORDER.map((exchange) => (
              <Area
                key={exchange}
                type="monotone"
                dataKey={exchange}
                stroke={EXCHANGE_COLORS[exchange]}
                strokeWidth={2}
                fill={`url(#pcc-grad-${exchange})`}
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
