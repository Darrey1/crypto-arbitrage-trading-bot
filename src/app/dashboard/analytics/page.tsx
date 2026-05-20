'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Calendar, DollarSign, Target, TrendingUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useBotStore } from '@/store/useBotStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

const PERIODS = ['7d', '30d', '90d', 'all'] as const

type Period = typeof PERIODS[number]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const { tradeStats, trades, portfolioHistory } = useBotStore()
  const now = useState(() => Date.now())[0]

  

  const tradeWindow = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 180
    const cutoff = now - days * 86400000
    return trades.filter((trade) => new Date(trade.executedAt ?? trade.createdAt).getTime() >= cutoff)
  }, [now, period, trades])

  const cumulativeData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 180
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(now - (days - 1 - index) * 86400000)
      const label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      const dayProfit = tradeWindow.filter((trade) => new Date(trade.executedAt ?? trade.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }) === label).reduce((sum, trade) => sum + trade.netProfit, 0)
      return { label, dayProfit }
    }).reduce<{ label: string; cumulative: number }[]>((series, point) => {
      const running = (series[series.length - 1]?.cumulative ?? 0) + point.dayProfit
      series.push({ label: point.label, cumulative: running })
      return series
    }, [])
  }, [now, period, tradeWindow])

  const stats = tradeStats ?? {
    totalTrades: tradeWindow.length,
    winRate: tradeWindow.length ? (tradeWindow.filter((trade) => trade.netProfit > 0).length / tradeWindow.length) * 100 : 0,
    totalNetProfit: tradeWindow.reduce((sum, trade) => sum + trade.netProfit, 0),
    avgProfit: tradeWindow.length ? tradeWindow.reduce((sum, trade) => sum + trade.netProfit, 0) / tradeWindow.length : 0,
    profitableTrades: tradeWindow.filter((trade) => trade.netProfit > 0).length,
    losingTrades: tradeWindow.filter((trade) => trade.netProfit <= 0).length,
    largestProfit: Math.max(0, ...tradeWindow.map((trade) => trade.netProfit)),
    largestLoss: Math.min(0, ...tradeWindow.map((trade) => trade.netProfit)),
  }

  const topRoutes = useMemo(() => {
    const routeMap = new Map<string, { route: string; pair: string; trades: number; profit: number; avgSpread: number }>()
    tradeWindow.forEach((trade) => {
      const current = routeMap.get(trade.route) ?? { route: trade.route, pair: trade.pair, trades: 0, profit: 0, avgSpread: 0 }
      current.trades += 1
      current.profit += trade.netProfit
      current.avgSpread += ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100
      routeMap.set(trade.route, current)
    })
    return [...routeMap.values()].sort((left, right) => right.profit - left.profit).slice(0, 5).map((route) => ({
      ...route,
      avgSpread: route.trades ? route.avgSpread / route.trades : 0,
    }))
  }, [tradeWindow])

  const outcomeData = [
    { name: 'Profitable', value: stats.profitableTrades, color: '#10B981' },
    { name: 'Losing', value: stats.losingTrades, color: '#EF4444' },
    { name: 'Break Even', value: Math.max(0, stats.totalTrades - stats.profitableTrades - stats.losingTrades), color: '#F59E0B' },
  ]

  const spreadBuckets = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, index) => ({ spread: `${(index * 0.1 + 0.1).toFixed(1)}%`, count: 0 }))
    tradeWindow.forEach((trade) => {
      const spread = ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100
      const bucketIndex = Math.max(0, Math.min(buckets.length - 1, Math.floor(spread / 0.1)))
      buckets[bucketIndex].count += 1
    })
    return buckets
  }, [tradeWindow])

  const historySeries = portfolioHistory.slice(-30).map((point) => ({
    day: new Date(point.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: point.totalValue,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-slate-200">Performance Analytics</h2>
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          {PERIODS.map((value) => (
            <button key={value} onClick={() => setPeriod(value)} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all uppercase', period === value ? 'gradient-bg text-[#070707]' : 'text-slate-500 hover:text-slate-300')}>
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total P&L', value: formatCurrency(stats.totalNetProfit), icon: DollarSign, tone: stats.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Win Rate', value: formatPercent(stats.winRate), icon: Target, tone: 'text-violet-400' },
          { label: 'Best Trade', value: formatCurrency(stats.largestProfit), icon: TrendingUp, tone: 'text-cyan-400' },
          { label: 'Worst Trade', value: formatCurrency(stats.largestLoss), icon: BarChart3, tone: 'text-red-400' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', 'bg-[rgba(236,189,116,0.12)]')}>
              <Icon className={cn('w-4 h-4', tone)} />
            </div>
            <div className={cn('text-xl font-mono font-bold', tone)}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-200">Cumulative P&L</h3>
          <div className={cn('text-sm font-mono font-bold', stats.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {stats.totalNetProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalNetProfit)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cumulativeData} margin={{ left: -20 }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(cumulativeData.length / 7))} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey="cumulative" stroke="#ECBD74" fill="url(#cumGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Trade Outcome Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {outcomeData.map((entry) => <Cell key={entry.name} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {outcomeData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-slate-400">{name}</span>
                </div>
                <span className="font-mono text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Routes</h3>
          <div className="space-y-3">
            {topRoutes.length === 0 ? (
              <div className="text-xs text-slate-500">No route data yet.</div>
            ) : topRoutes.map((route) => (
              <div key={route.route} className="glass-subtle rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <div className="text-xs font-mono font-semibold text-slate-200">{route.pair}</div>
                    <div className="text-[10px] text-[var(--accent)]">{route.route}</div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-emerald-400">+{formatCurrency(route.profit)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{route.trades} trades</span>
                  <span>avg {route.avgSpread.toFixed(3)}% spread</span>
                </div>
                <div className="mt-2 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full gradient-bg" style={{ width: `${Math.min(100, (route.profit / Math.max(1, topRoutes[0].profit)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Spread Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={spreadBuckets} margin={{ left: -20 }}>
              <XAxis dataKey="spread" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" fill="#ECBD74" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Distribution is based on your filtered trade window.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-slate-200">Portfolio Value Context</h3>
          <span className="text-xs text-slate-500">Historical reference</span>
        </div>
        {historySeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={historySeries} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="portfolioHistoryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="value" stroke="#ECBD74" fill="url(#portfolioHistoryGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-slate-500">No portfolio history yet.</div>
        )}
      </div>
    </div>
  )
}
