'use client'

import { useMemo, useState } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, DollarSign, Target, Zap, BarChart3, Calendar } from 'lucide-react'

type Period = '7d' | '30d' | '90d' | 'all'

function generateCumPnL(days: number) {
  let cum = 0
  return Array.from({ length: days }, (_, i) => {
    const daily = (Math.random() - 0.28) * 45
    cum += daily
    return {
      date: new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      daily: +daily.toFixed(2),
      cumulative: +cum.toFixed(2),
    }
  })
}

const HOURLY_DATA = Array.from({ length: 7 * 24 }, (_, i) => ({
  day: Math.floor(i / 24),
  hour: i % 24,
  count: Math.floor(Math.random() * 8),
  profit: (Math.random() - 0.2) * 30,
}))

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 180

  const data = useMemo(() => generateCumPnL(days), [days])
  const totalProfit = data.reduce((s, d) => s + d.daily, 0)
  const wins = data.filter(d => d.daily > 0).length
  const maxDrawdown = Math.min(...data.map(d => d.cumulative))
  const bestDay = Math.max(...data.map(d => d.daily))

  const pairPerf = [
    { pair: 'ETH/USDT', route: 'Binance→Kraken', trades: 48, profit: 142.50, avgSpread: 0.42 },
    { pair: 'ETH/USDT', route: 'KuCoin→Kraken',  trades: 31, profit: 98.20,  avgSpread: 0.38 },
    { pair: 'BTC/USDT', route: 'Binance→KuCoin',  trades: 22, profit: 87.40,  avgSpread: 0.31 },
    { pair: 'ETH/BTC',  route: 'Kraken→Binance',  trades: 15, profit: 45.10,  avgSpread: 0.29 },
  ]

  const outcomeData = [
    { name: 'Profitable',  value: wins,        color: '#10B981' },
    { name: 'Break-even',  value: Math.floor(data.length * 0.05), color: '#F59E0B' },
    { name: 'Loss',        value: data.length - wins - Math.floor(data.length * 0.05), color: '#EF4444' },
  ]

  const spreadDist = Array.from({ length: 10 }, (_, i) => ({
    spread: `${(i * 0.1 + 0.1).toFixed(1)}%`,
    count: Math.floor(Math.random() * 20 + 2),
  }))

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-slate-200">Performance Analytics</h2>
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all uppercase',
                period === p ? 'gradient-bg text-white' : 'text-slate-500 hover:text-slate-300'
              )}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total P&L', value: formatCurrency(totalProfit), icon: DollarSign, color: totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Win Rate', value: `${((wins / data.length) * 100).toFixed(1)}%`, icon: Target, color: 'text-violet-400' },
          { label: 'Best Day', value: formatCurrency(bestDay), icon: TrendingUp, color: 'text-cyan-400' },
          { label: 'Max Drawdown', value: formatCurrency(maxDrawdown), icon: BarChart3, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', `${color}/15`)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className={cn('text-xl font-mono font-bold', color)}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Cumulative P&L Chart */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-200">Cumulative P&L</h3>
          <div className={cn('text-sm font-mono font-bold', totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false}
              interval={Math.floor(days / 7)} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={v => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any) => [`$${v.toFixed(2)}`, undefined]}
            />
            <Area type="monotone" dataKey="cumulative" stroke="#7C3AED" fill="url(#cumGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Trade Outcomes Pie */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Trade Outcome Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                paddingAngle={3} dataKey="value">
                {outcomeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {outcomeData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-slate-400">{name}</span>
                </div>
                <span className="font-mono text-slate-300">{value} ({((value / data.length) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pair Performance */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Performing Routes</h3>
          <div className="space-y-3">
            {pairPerf.map((p, i) => (
              <div key={i} className="glass-subtle rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-mono font-semibold text-slate-200">{p.pair}</span>
                    <span className="text-[10px] text-violet-400 ml-2">{p.route}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-emerald-400">+${p.profit.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{p.trades} trades</span>
                  <span>avg {p.avgSpread}% spread</span>
                </div>
                <div className="mt-2 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full gradient-bg transition-all"
                    style={{ width: `${(p.profit / pairPerf[0].profit) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spread Distribution */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Spread Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={spreadDist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="spread" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [v, 'Trades']}
              />
              <Bar dataKey="count" fill="#7C3AED" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Most opportunities cluster between 0.2%–0.5%</p>
        </div>
      </div>

      {/* Hourly Opportunity Heatmap */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Hourly Opportunity Heatmap</h3>
          <span className="text-xs text-slate-500">— when arb opportunities occur most</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex mb-1 ml-10">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-600 font-mono">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
            {/* Heatmap grid */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-10 text-[10px] text-slate-500 flex-shrink-0">{day}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const cell = HOURLY_DATA.find(d => d.day === dayIdx && d.hour === hour)
                  const intensity = cell ? Math.min(cell.count / 8, 1) : 0
                  return (
                    <div
                      key={hour}
                      title={`${day} ${hour}:00 — ${cell?.count ?? 0} opportunities`}
                      className="flex-1 aspect-square rounded-sm mx-px transition-all hover:scale-110 cursor-pointer"
                      style={{
                        background: intensity > 0
                          ? `rgba(124,58,237,${0.1 + intensity * 0.75})`
                          : 'rgba(255,255,255,0.03)',
                      }}
                    />
                  )
                })}
              </div>
            ))}
            <div className="flex items-center justify-end gap-3 mt-3 text-[10px] text-slate-600">
              <span>Low</span>
              {[0.1, 0.3, 0.55, 0.8, 1].map(o => (
                <div key={o} className="w-4 h-4 rounded-sm" style={{ background: `rgba(124,58,237,${o})` }} />
              ))}
              <span>High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
