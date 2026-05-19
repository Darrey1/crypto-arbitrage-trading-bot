'use client'

import { useMemo } from 'react'
import { useBotStore } from '@/store/useBotStore'
import {
  TrendingUp, TrendingDown, Activity, Bot,
  DollarSign, Target, ArrowRight, Zap, Play, Square
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { cn, formatCurrency, formatPercent, formatPrice, formatTimeAgo } from '@/lib/utils'
import { ArbitrageOpportunity, ExchangeId } from '@/types'
import { toast } from 'sonner'

const EXCHANGE_COLORS: Record<ExchangeId, string> = {
  binance: '#F0B90B',
  kraken: '#5741D9',
  kucoin: '#24AE8F',
}

function StatCard({
  label, value, change, icon: Icon, color, suffix = '', prefix = ''
}: {
  label: string; value: string | number; change?: number
  icon: React.ElementType; color: string; suffix?: string; prefix?: string
}) {
  return (
    <div className="glass rounded-2xl p-5 group hover:border-violet-500/25 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', `${color}/15`)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        {change !== undefined && (
          <span className={cn(
            'text-xs font-mono font-semibold flex items-center gap-0.5',
            change >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPercent(Math.abs(change))}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-white mb-1">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function OpportunityCard({ opp, onExecute }: { opp: ArbitrageOpportunity; onExecute: (id: string) => void }) {
  const timeLeft = Math.max(0, Math.floor((opp.expiresAt - Date.now()) / 1000))
  const isExpired = opp.status !== 'active'

  return (
    <div className={cn(
      'glass-subtle rounded-xl p-3.5 border-l-2 transition-all',
      isExpired ? 'opacity-50 border-slate-600' : 'border-violet-500 opportunity-flash'
    )}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono font-semibold text-slate-200">{opp.symbol}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-medium" style={{ color: EXCHANGE_COLORS[opp.buyExchange] }}>
              {opp.buyExchange.charAt(0).toUpperCase() + opp.buyExchange.slice(1)}
            </span>
            <ArrowRight className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] font-medium" style={{ color: EXCHANGE_COLORS[opp.sellExchange] }}>
              {opp.sellExchange.charAt(0).toUpperCase() + opp.sellExchange.slice(1)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-bold text-emerald-400">
            +{opp.netSpread.toFixed(3)}%
          </div>
          <div className="text-[10px] text-slate-500">net spread</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Est. <span className="text-emerald-400 font-mono">+${opp.estimatedProfit.toFixed(2)}</span></span>
          {!isExpired && <span className="text-amber-400 font-mono">{timeLeft}s</span>}
        </div>
        {!isExpired && opp.status === 'active' && (
          <button
            onClick={() => onExecute(opp.id)}
            className="btn-primary text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1"
          >
            <Zap className="w-2.5 h-2.5" />
            Execute
          </button>
        )}
        {opp.status === 'executed' && (
          <span className="badge-success text-[10px] px-2 py-0.5 rounded-full">Executed</span>
        )}
        {opp.status === 'expired' && (
          <span className="badge-muted text-[10px] px-2 py-0.5 rounded-full">Expired</span>
        )}
      </div>
    </div>
  )
}

function PriceChartSection() {
  const { prices } = useBotStore()

  const chartData = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: 20 }, (_, i) => {
      const base = 3245 + Math.sin(i * 0.5) * 8 + (Math.random() - 0.5) * 4
      return {
        time: new Date(now - (20 - i) * 30000).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        binance: +(base + (Math.random() - 0.5) * 3).toFixed(2),
        kraken:  +(base + 1.2 + (Math.random() - 0.5) * 3).toFixed(2),
        kucoin:  +(base - 0.8 + (Math.random() - 0.5) * 3).toFixed(2),
      }
    })
  }, [])

  const binanceLive = prices['binance:ETH/USDT']
  const krakenLive  = prices['kraken:ETH/USDT']
  const kucoinLive  = prices['kucoin:ETH/USDT']

  return (
    <div className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">ETH/USDT — Live Price Comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">All 3 exchanges simultaneously</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {[
            { id: 'binance', tick: binanceLive, color: '#F0B90B' },
            { id: 'kraken',  tick: krakenLive,  color: '#5741D9' },
            { id: 'kucoin',  tick: kucoinLive,  color: '#24AE8F' },
          ].map(({ id, tick, color }) => (
            <div key={id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-slate-400 capitalize">{id}</span>
              <span className="font-mono text-slate-200 ml-1">
                ${tick ? formatPrice(tick.last) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false}
            domain={['auto', 'auto']} tickFormatter={v => `$${v.toFixed(0)}`} />
          <Tooltip
            contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: any) => [`$${v.toFixed(2)}`, undefined]}
            labelStyle={{ color: '#94A3B8' }}
          />
          <Line type="monotone" dataKey="binance" stroke="#F0B90B" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="kraken"  stroke="#5741D9" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="kucoin"  stroke="#24AE8F" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function PnLMiniChart() {
  const data = useMemo(() => {
    let cum = 0
    return Array.from({ length: 14 }, (_, i) => {
      const daily = (Math.random() - 0.3) * 60
      cum += daily
      return {
        day: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
        profit: +daily.toFixed(2),
        cumulative: +cum.toFixed(2),
      }
    })
  }, [])

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">14-Day P&L</h3>
          <p className="text-xs text-slate-500 mt-0.5">Daily net profit</p>
        </div>
        <div className="text-right">
          <div className="text-base font-mono font-bold text-emerald-400">
            +${data.reduce((s, d) => s + d.profit, 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Total</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: any) => [`$${v.toFixed(2)}`, 'Profit']}
          />
          <Area type="monotone" dataKey="profit" stroke="#10B981" fill="url(#pnlGrad)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardPage() {
  const { botState, opportunities, recentTrades, config, startBot, stopBot, executeOpportunity, paperBalance } = useBotStore()

  const activeOpps = opportunities.filter(o => o.status === 'active').slice(0, 6)
  const recentOpps = opportunities.slice(0, 8)

  function handleExecute(id: string) {
    executeOpportunity(id)
    toast.success('Trade executed!', { description: 'Position opened successfully.' })
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={`${config.tradingMode === 'paper' ? 'Paper ' : ''}Profit Today`}
          value={`+$${botState.totalProfitToday.toFixed(2)}`}
          change={12.4}
          icon={DollarSign}
          color="text-emerald-400"
        />
        <StatCard
          label="Opportunities Detected"
          value={botState.opportunitiesDetected}
          change={8.2}
          icon={Activity}
          color="text-violet-400"
        />
        <StatCard
          label="Trades Executed"
          value={botState.tradesExecuted}
          icon={Bot}
          color="text-cyan-400"
        />
        <StatCard
          label="Win Rate"
          value={`${botState.winRate > 0 ? botState.winRate.toFixed(1) : '—'}%`}
          icon={Target}
          color="text-amber-400"
        />
      </div>

      {/* Paper Balance Banner */}
      {config.tradingMode === 'paper' && (
        <div className="glass-subtle rounded-xl px-5 py-3 flex items-center justify-between border border-amber-500/15">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot" />
            <span className="text-xs text-amber-400/80 font-medium">Paper Trading — Virtual Balance</span>
          </div>
          <div className="text-sm font-mono font-bold text-amber-400">
            ${paperBalance.toFixed(2)} <span className="text-amber-500/60 font-normal text-xs">USDT</span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Price Chart — 3 cols */}
        <div className="xl:col-span-3">
          <PriceChartSection />
        </div>

        {/* Opportunity Feed — 2 cols */}
        <div className="xl:col-span-2">
          <div className="glass rounded-2xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Live Opportunities</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeOpps.length > 0 ? `${activeOpps.length} active` : 'Scanning…'}
                </p>
              </div>
              {/* Bot toggle */}
              <button
                onClick={() => botState.status === 'running' ? stopBot() : startBot()}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  botState.status === 'running'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse-glow'
                    : 'btn-primary'
                )}
              >
                {botState.status === 'running'
                  ? <><div className="live-dot" />Running</>
                  : <><Play className="w-3 h-3" />Start Bot</>
                }
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-72 pr-1">
              {recentOpps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Bot className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-600">Start the bot to detect opportunities</p>
                </div>
              ) : (
                recentOpps.map(opp => (
                  <OpportunityCard key={opp.id} opp={opp} onExecute={handleExecute} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Recent Trades — 3 cols */}
        <div className="xl:col-span-3">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Recent Trades</h3>
              <a href="/dashboard/history" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                View all →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    {['Pair', 'Route', 'Amount', 'Net Profit', 'Time', 'Status'].map(h => (
                      <th key={h} className="text-left pb-2.5 text-slate-500 font-medium pr-3 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-600">
                        No trades yet — start the bot
                      </td>
                    </tr>
                  ) : recentTrades.slice(0, 8).map(trade => (
                    <tr key={trade.id} className="border-b border-[rgba(255,255,255,0.03)] table-row-hover">
                      <td className="py-2.5 pr-3 font-mono text-slate-300">{trade.symbol}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 capitalize">{trade.buyExchange.slice(0,3)}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-violet-400" />
                          <span className="text-slate-400 capitalize">{trade.sellExchange.slice(0,3)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-400">{trade.amount.toFixed(4)}</td>
                      <td className={cn('py-2.5 pr-3 font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{formatTimeAgo(new Date(trade.executedAt).getTime())}</td>
                      <td className="py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium',
                          trade.status === 'completed' ? 'badge-success' :
                          trade.status === 'failed' ? 'badge-danger' : 'badge-warning'
                        )}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* P&L Mini Chart — 2 cols */}
        <div className="xl:col-span-2 space-y-4">
          <PnLMiniChart />

          {/* Bot Status Card */}
          <div className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Bot Status</h3>
              <span className={cn('badge-muted text-[10px] px-2 py-0.5 rounded-full capitalize',
                botState.status === 'running' ? 'badge-success' :
                botState.status === 'error' ? 'badge-danger' : ''
              )}>
                {botState.status}
              </span>
            </div>

            {botState.status === 'running' && (
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="radar-ring w-full h-full absolute" />
                <div className="radar-ring w-3/4 h-3/4 absolute top-1/8 left-1/8" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-violet-400" />
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mode</span>
                <span className={cn('font-medium', config.tradingMode === 'paper' ? 'text-amber-400' : 'text-emerald-400')}>
                  {config.tradingMode === 'paper' ? 'Paper' : 'Live'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Strategy</span>
                <span className="text-slate-300">{config.executionMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Min Spread</span>
                <span className="font-mono text-slate-300">{config.minSpreadThreshold}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max Trade</span>
                <span className="font-mono text-slate-300">${config.maxTradeSize}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {botState.status === 'running' ? (
                <button onClick={stopBot}
                  className="btn-danger w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                  <Square className="w-3 h-3" />
                  Stop Bot
                </button>
              ) : (
                <button onClick={startBot}
                  className="btn-primary w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                  <Play className="w-3 h-3" />
                  Start Bot
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
