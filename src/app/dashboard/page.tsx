'use client'

import { useMemo } from 'react'
import { Activity, DollarSign, Target, Bot, Wallet, AlertTriangle, X } from 'lucide-react'
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES, formatCurrency, formatPercent, formatPrice } from '@/lib/utils'
import { priceKey } from '@/store/useBotStore'
import {
  EXCHANGE_ORDER,
  EXCHANGE_COLORS,
  usePairChart,
  type ChartPoint,
  type ExchangeKey,
} from '@/hooks/usePairChart'

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'text-slate-200',
}: {
  label: string
  value: string
  icon: React.ElementType
  tone?: string
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-bg)' }}
        >
          <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
      </div>
      <div className={cn('text-lg font-mono font-bold', tone)}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// ─── empty / error helpers ───────────────────────────────────────────────────

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
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
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── chart tooltip ───────────────────────────────────────────────────────────

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
              {typeof point[exchange] === 'number'
                ? `$${formatPrice(point[exchange] as number)}`
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── axis tick ───────────────────────────────────────────────────────────────

function AxisTick(props: {
  x?: number
  y?: number
  payload?: { value?: string }
  index?: number
  visibleTicksCount?: number
}) {
  const { x, y, payload, index = 0, visibleTicksCount = 1 } = props
  const step = Math.max(1, Math.ceil(visibleTicksCount / 6))
  const show = index % step === 0 || index === visibleTicksCount - 1
  if (!show || x === undefined || y === undefined || !payload?.value) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text fill="#64748B" fontSize={10} textAnchor="middle" dy={14}>
        {payload.value}
      </text>
    </g>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    botState,
    config,
    opportunities,
    trades,
    prices,
    portfolioBalances,
    portfolioHistory,
    tradeStats,
    loading,
    error,
    socketConnected,
  } = useBotStore()

  const selectedPair = config?.tradingPair || opportunities[0]?.pair || ''

  // All current prices for the selected pair (for the Live Prices sidebar card)
  const comparisonRows = useMemo(
    () => Object.values(prices).filter((tick) => tick.pair === selectedPair),
    [prices, selectedPair],
  )

  // ── chart data via shared hook (history + live stream) ──────────────────────
  const {
    chartData,
    loading: chartLoading,
    hasLoaded: chartHasLoaded,
    apiError: chartError,
    livePrices,
    dismissError: dismissChartError,
  } = usePairChart(selectedPair)

  // ── rest of page data ───────────────────────────────────────────────────────
  const latestOpportunity = opportunities[0]
  const recentTrades = trades.slice(0, 5)
  const totalPortfolioValue = portfolioBalances.reduce((sum, b) => sum + b.totalValue, 0)
  const portfolioHistoryData = portfolioHistory.slice(-14).map((point) => ({
    date: new Date(point.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: point.totalValue,
  }))

  return (
    <div className="space-y-6">
      {/* ── page header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live arbitrage overview {socketConnected ? '• connected' : '• reconnecting'}
          </p>
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg max-w-[420px]">
            {error}
          </div>
        )}
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Bot PnL Today"
          value={formatCurrency(botState?.todayPnl ?? 0)}
          icon={DollarSign}
          tone={(botState?.todayPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          label="Opportunities"
          value={String(botState?.totalOpportunities ?? 0)}
          icon={Activity}
          tone="text-violet-400"
        />
        <StatCard
          label="Trades"
          value={String(botState?.totalTrades ?? 0)}
          icon={Bot}
          tone="text-cyan-400"
        />
        <StatCard
          label="Win Rate"
          value={formatPercent(botState?.winRate ?? 0)}
          icon={Target}
          tone="text-amber-400"
        />
      </div>

      {/* ── main grid ── */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">

          {/* ── Live Price Comparison Chart ── */}
          <div className="glass rounded-2xl p-5">
            {chartError && (
              <ApiErrorBanner message={chartError} onDismiss={dismissChartError} />
            )}

            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
                    )}
                  />
                  {socketConnected ? 'Live stream' : 'Reconnecting'}
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-200">
                  {selectedPair || 'Loading pair…'} — Price Comparison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">History + live ticks · all 3 exchanges</p>
              </div>

              {/* per-exchange live price badges */}
              <div className="flex flex-wrap items-center gap-3">
                {EXCHANGE_ORDER.map((ex) => {
                  const price = livePrices[ex as ExchangeKey]
                  return typeof price === 'number' ? (
                    <div key={ex} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: EXCHANGE_COLORS[ex] }}
                      />
                      <span className="text-xs text-slate-400">
                        {ex.charAt(0) + ex.slice(1).toLowerCase()}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        ${formatPrice(price)}
                      </span>
                    </div>
                  ) : null
                })}
              </div>
            </div>

            {/* chart body */}
            {chartLoading && chartData.length === 0 ? (
              <div className="h-[240px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] flex items-center justify-center">
                <div className="space-y-2 w-2/3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${[100, 75, 85, 60][i]}%` }} />
                  ))}
                </div>
              </div>
            ) : chartHasLoaded && chartData.length === 0 ? (
              <div className="h-[240px] rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0A0E14] flex items-center justify-center text-center">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {loading ? 'Loading market data…' : 'No price data yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    The chart will populate once the backend starts streaming ticks.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    {EXCHANGE_ORDER.map((ex) => (
                      <linearGradient key={ex} id={`dash-grad-${ex}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={EXCHANGE_COLORS[ex]} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={EXCHANGE_COLORS[ex]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={<AxisTick />}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    domain={['auto', 'auto']}
                    width={72}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.10)', strokeWidth: 1 }}
                  />
                  {EXCHANGE_ORDER.map((ex) => (
                    <Area
                      key={ex}
                      type="monotone"
                      dataKey={ex}
                      stroke={EXCHANGE_COLORS[ex]}
                      strokeWidth={2}
                      fill={`url(#dash-grad-${ex})`}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      activeDot={{ r: 3, strokeWidth: 0, fill: EXCHANGE_COLORS[ex] }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── opportunities + trades ── */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Recent Opportunities</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Newest first</p>
                </div>
                {latestOpportunity && (
                  <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">
                    {latestOpportunity.status}
                  </span>
                )}
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {opportunities.length === 0 ? (
                  <EmptyCard
                    title="No opportunities"
                    description="Arbitrage alerts will appear here when the bot detects a spread."
                  />
                ) : (
                  opportunities.slice(0, 5).map((opp) => (
                    <div key={opp.id} className="glass-subtle rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{opp.pair}</div>
                          <div className="text-[11px] text-slate-500">
                            {opp.buyExchange} → {opp.sellExchange}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-emerald-400">
                            +{opp.netSpread.toFixed(3)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatCurrency(opp.estProfit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Recent Trades</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Latest executions</p>
                </div>
                <div className="text-xs text-slate-500">
                  {tradeStats?.totalTrades ?? trades.length} total
                </div>
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {recentTrades.length === 0 ? (
                  <EmptyCard
                    title="No trades yet"
                    description="Trades will be listed here after bot execution."
                  />
                ) : (
                  recentTrades.map((trade) => (
                    <div key={trade.id} className="glass-subtle rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{trade.pair}</div>
                          <div className="text-[11px] text-slate-500">{trade.route}</div>
                        </div>
                        <div
                          className={cn(
                            'text-sm font-mono font-semibold',
                            trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {trade.netProfit >= 0 ? '+' : ''}
                          {formatCurrency(trade.netProfit)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{trade.mode}</span>
                        <span>{trade.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── right sidebar ── */}
        <div className="space-y-4">
          {/* portfolio snapshot */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Portfolio Snapshot</h3>
                <p className="text-xs text-slate-500 mt-0.5">Across connected exchanges</p>
              </div>
              <Wallet className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="text-3xl font-black font-mono" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totalPortfolioValue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {portfolioBalances.filter((b) => b.connected).length} exchanges connected
            </div>
          </div>

          {/* live prices */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Live Prices</h3>
            <div className="space-y-2">
              {comparisonRows.length === 0 ? (
                <p className="text-xs text-slate-600">No prices yet — waiting for stream…</p>
              ) : (
                comparisonRows.map((tick) => (
                  <div
                    key={priceKey(tick.exchange, tick.pair)}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: EXCHANGE_COLORS[tick.exchange.toUpperCase() as ExchangeKey] }}
                      />
                      <div>
                        <div className="text-slate-300">
                          {EXCHANGES[tick.exchange.toLowerCase() as keyof typeof EXCHANGES]?.name ?? tick.exchange}
                        </div>
                        <div className="text-[11px] text-slate-500">{tick.pair}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-slate-200">${formatPrice(tick.lastPrice)}</div>
                      <div className="text-emerald-400">
                        {formatPercent(((tick.ask - tick.bid) / tick.lastPrice) * 100)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* portfolio trend */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Portfolio Trend</h3>
            {portfolioHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={portfolioHistoryData}>
                  <defs>
                    <linearGradient id="dash-port-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748B', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: '#0D1117',
                      border: '1px solid rgba(236,189,116,0.2)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Value']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#ECBD74"
                    fill="url(#dash-port-grad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCard
                title="No history"
                description="Portfolio history will appear once the backend provides points."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
