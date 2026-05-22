'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  DollarSign,
  Target,
  Bot,
  Wallet,
  Play,
  Square,
  Pause,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES, formatCurrency, formatPercent, formatPrice } from '@/lib/utils'
import { priceKey } from '@/store/useBotStore'
import {
  EXCHANGE_COLORS,
  type ExchangeKey,
} from '@/hooks/usePairChart'
import type { BotStatus, OpportunityStatus } from '@/api/types'

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

// ─── empty card ───────────────────────────────────────────────────────────────

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
      <div className="text-sm font-semibold text-slate-400">{title}</div>
      <div className="text-xs text-slate-600 mt-1">{description}</div>
    </div>
  )
}

// ─── bot status badge ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BotStatus,
  { dot: string; label: string; text: string; border: string; bg: string }
> = {
  RUNNING: {
    dot: 'bg-emerald-400 animate-pulse',
    label: 'Running',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/10',
  },
  PAUSED: {
    dot: 'bg-amber-400',
    label: 'Paused',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/10',
  },
  IDLE: {
    dot: 'bg-slate-500',
    label: 'Idle',
    text: 'text-slate-400',
    border: 'border-slate-700',
    bg: 'bg-slate-800/40',
  },
  STOPPED: {
    dot: 'bg-slate-500',
    label: 'Stopped',
    text: 'text-slate-400',
    border: 'border-slate-700',
    bg: 'bg-slate-800/40',
  },
  ERROR: {
    dot: 'bg-red-400 animate-pulse',
    label: 'Error',
    text: 'text-red-400',
    border: 'border-red-500/25',
    bg: 'bg-red-500/10',
  },
}

function BotStatusBadge({ status }: { status: BotStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.IDLE
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold',
        cfg.text,
        cfg.border,
        cfg.bg,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── opportunity status pill ──────────────────────────────────────────────────

const OPP_STATUS_STYLE: Record<OpportunityStatus, string> = {
  NEW: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  EXECUTED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  EXPIRED: 'bg-slate-700/40 text-slate-500 border-slate-700',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/20',
}

function OppStatusPill({ status }: { status: OpportunityStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
        OPP_STATUS_STYLE[status] ?? OPP_STATUS_STYLE.NEW,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

// ─── opportunity card ─────────────────────────────────────────────────────────

function exchangeLabel(ex: string) {
  const info = EXCHANGES[ex.toLowerCase() as keyof typeof EXCHANGES]
  return info?.name ?? (ex.charAt(0) + ex.slice(1).toLowerCase())
}

function OpportunityCard({
  opp,
}: {
  opp: {
    id: string
    pair: string
    buyExchange: string
    sellExchange: string
    netSpread: number
    estProfit: number
    status: OpportunityStatus
    createdAt: string
  }
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3.5 transition-colors hover:bg-[rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-200">{opp.pair}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span
              className="font-medium"
              style={{ color: EXCHANGE_COLORS[opp.buyExchange.toUpperCase() as ExchangeKey] ?? '#94a3b8' }}
            >
              {exchangeLabel(opp.buyExchange)}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-slate-600" />
            <span
              className="font-medium"
              style={{ color: EXCHANGE_COLORS[opp.sellExchange.toUpperCase() as ExchangeKey] ?? '#94a3b8' }}
            >
              {exchangeLabel(opp.sellExchange)}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Est.{' '}
            <span className="font-mono font-semibold text-emerald-400">
              +{formatCurrency(opp.estProfit)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="font-mono text-sm font-bold text-emerald-400">
            +{opp.netSpread.toFixed(3)}%
          </div>
          <div className="text-[10px] text-slate-600">net spread</div>
          <OppStatusPill status={opp.status} />
        </div>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

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
    error,
    socketConnected,
    startBot,
    stopBot,
    pauseBot,
  } = useBotStore()

  const [botActionLoading, setBotActionLoading] = useState(false)
  const [botActionError, setBotActionError] = useState<string | null>(null)

  const status = botState?.status ?? 'IDLE'
  const isRunning = status === 'RUNNING'
  const isPaused = status === 'PAUSED'
  const canStart = status === 'IDLE' || status === 'STOPPED' || status === 'ERROR' || isPaused
  const canPause = isRunning
  const canStop = isRunning || isPaused

  async function handleBotAction(action: () => Promise<void>, label: string) {
    setBotActionLoading(true)
    setBotActionError(null)
    try {
      await action()
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : `Failed to ${label} bot`
      setBotActionError(msg)
    } finally {
      setBotActionLoading(false)
    }
  }

  const selectedPair = config?.tradingPair || opportunities[0]?.pair || ''

  const comparisonRows = useMemo(
    () => Object.values(prices).filter((tick) => tick.pair === selectedPair),
    [prices, selectedPair],
  )

  const recentTrades = trades.slice(0, 5)
  const totalPortfolioValue = portfolioBalances?.totalUsdValue ?? 0
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

          {/* ── Bot Control + Live Opportunities ── */}
          <div className="glass rounded-2xl p-5">
            {/* header */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Live Opportunities</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRunning
                    ? `Scanning${selectedPair ? ` · ${selectedPair}` : ''}…`
                    : isPaused
                    ? 'Paused — resume to continue scanning'
                    : 'Start the bot to begin scanning for spreads'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <BotStatusBadge status={status} />

                {canStart && (
                  <button
                    onClick={() => handleBotAction(startBot, 'start')}
                    disabled={botActionLoading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 transition-colors',
                      'hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {botActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-emerald-400" />
                    )}
                    Start
                  </button>
                )}

                {canPause && (
                  <button
                    onClick={() => handleBotAction(pauseBot, 'pause')}
                    disabled={botActionLoading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 transition-colors',
                      'hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {botActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Pause className="h-3.5 w-3.5 fill-amber-400" />
                    )}
                    Pause
                  </button>
                )}

                {canStop && (
                  <button
                    onClick={() => handleBotAction(stopBot, 'stop')}
                    disabled={botActionLoading}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400 transition-colors',
                      'hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {botActionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Square className="h-3.5 w-3.5 fill-red-400" />
                    )}
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* bot action error */}
            {botActionError && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs text-red-400">
                <span>{botActionError}</span>
                <button
                  onClick={() => setBotActionError(null)}
                  className="shrink-0 text-red-400/50 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )}

            {/* opportunities feed */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
              {opportunities.length === 0 ? (
                <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] text-center">
                  <Activity className="mb-2 h-8 w-8 text-slate-700" />
                  <p className="text-sm font-medium text-slate-500">No opportunities yet</p>
                  <p className="mt-1 text-xs text-slate-700">
                    {isRunning
                      ? 'The bot is scanning — spreads will appear here in real time.'
                      : 'Start the bot to begin scanning for arbitrage opportunities.'}
                  </p>
                </div>
              ) : (
                opportunities.map((opp) => <OpportunityCard key={opp.id} opp={opp} />)
              )}
            </div>
          </div>

          {/* ── recent trades ── */}
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
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
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

        {/* ── right sidebar ── */}
        <div className="space-y-4">
          {/* portfolio snapshot */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Portfolio Snapshot</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {portfolioBalances?.mode ?? 'PAPER'} mode across connected exchanges
                </p>
              </div>
              <Wallet className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="text-3xl font-black font-mono" style={{ color: 'var(--accent)' }}>
              {formatCurrency(totalPortfolioValue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {portfolioBalances?.exchanges.filter((b) => b.connected).length ?? 0} exchanges connected
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
                        style={{
                          background:
                            EXCHANGE_COLORS[tick.exchange.toUpperCase() as ExchangeKey] ?? '#64748b',
                        }}
                      />
                      <div>
                        <div className="text-slate-300">
                          {EXCHANGES[tick.exchange.toLowerCase() as keyof typeof EXCHANGES]?.name ??
                            tick.exchange}
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
