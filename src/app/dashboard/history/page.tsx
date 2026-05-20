'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Bot, DollarSign, Search, Target, TrendingUp, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useBotStore } from '@/store/useBotStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import type { Trade, TradeStatus } from '@/api/types'

const PAGE_SIZE = 10

function downloadCSV(trades: Trade[]) {
  const csv = [
    'ID,Pair,Buy Exchange,Sell Exchange,Buy Price,Sell Price,Amount,Fees,Net Profit,Status,Mode,Route,Executed At',
    ...trades.map((trade) => [
      trade.id,
      trade.pair,
      trade.buyExchange,
      trade.sellExchange,
      trade.buyPrice.toFixed(2),
      trade.sellPrice.toFixed(2),
      trade.amount.toFixed(6),
      trade.fees.toFixed(2),
      trade.netProfit.toFixed(2),
      trade.status,
      trade.mode,
      trade.route,
      trade.executedAt ?? trade.createdAt,
    ].join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trade-history.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const { trades, tradeStats, loading, refreshTrades } = useBotStore()
  const now = useState(() => Date.now())[0]
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | TradeStatus>('ALL')
  const [modeFilter, setModeFilter] = useState<'ALL' | 'PAPER' | 'LIVE'>('ALL')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return trades.filter((trade) => {
      if (statusFilter !== 'ALL' && trade.status !== statusFilter) return false
      if (modeFilter !== 'ALL' && trade.mode !== modeFilter) return false
      if (!search) return true
      const query = search.toLowerCase()
      return trade.id.toLowerCase().includes(query) || trade.pair.toLowerCase().includes(query) || trade.route.toLowerCase().includes(query)
    })
  }, [modeFilter, search, statusFilter, trades])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    const last14Days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now - (13 - index) * 86400000)
      const label = date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      map.set(label, 0)
      return label
    })

    filtered.forEach((trade) => {
      const label = new Date(trade.executedAt ?? trade.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      if (map.has(label)) {
        map.set(label, (map.get(label) ?? 0) + trade.netProfit)
      }
    })

    return last14Days.map((day) => ({ day, profit: map.get(day) ?? 0 }))
  }, [filtered, now])

  const stats = useMemo(() => {
    const totalProfit = filtered.reduce((sum, trade) => sum + trade.netProfit, 0)
    const wins = filtered.filter((trade) => trade.netProfit > 0).length
    const avgProfit = filtered.length ? totalProfit / filtered.length : 0

    return {
      total: filtered.length,
      totalProfit,
      wins,
      winRate: filtered.length ? (wins / filtered.length) * 100 : 0,
      avgSpread: filtered.length ? filtered.reduce((sum, trade) => sum + ((trade.sellPrice - trade.buyPrice) / trade.buyPrice) * 100, 0) / filtered.length : 0,
      avgProfit,
    }
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: String(stats.total), icon: Bot, tone: 'text-violet-400' },
          { label: 'Net Profit', value: formatCurrency(stats.totalProfit), icon: DollarSign, tone: stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Win Rate', value: formatPercent(stats.winRate), icon: Target, tone: 'text-cyan-400' },
          { label: 'Avg Profit', value: formatCurrency(stats.avgProfit), icon: TrendingUp, tone: 'text-amber-400' },
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">14-Day Profit Timeline</h3>
          <div className="text-sm font-mono font-semibold text-slate-200">{formatCurrency(stats.totalProfit)}</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ left: -20 }}>
            <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, 'Profit']} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-base pl-8 h-8 text-xs w-48" placeholder="Search ID, pair, route…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="input-base h-8 text-xs cursor-pointer w-40">
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING">Pending</option>
          </select>

          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)} className="input-base h-8 text-xs cursor-pointer w-32">
            <option value="ALL">All Modes</option>
            <option value="PAPER">Paper</option>
            <option value="LIVE">Live</option>
          </select>

          <button onClick={() => downloadCSV(filtered)} className="ml-auto btn-ghost h-8 px-3 rounded-lg text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {['ID', 'Pair', 'Route', 'Buy', 'Sell', 'Amount', 'Fees', 'Net Profit', 'Mode', 'Status', 'Time'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((trade) => (
                <tr key={trade.id} className="border-b border-[rgba(255,255,255,0.03)] table-row-hover">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{trade.id}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">{trade.pair}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400">{trade.buyExchange.slice(0, 3)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--accent)]" />
                      <span className="text-slate-400">{trade.sellExchange.slice(0, 3)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">${trade.buyPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">${trade.sellPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{trade.amount.toFixed(6)}</td>
                  <td className="px-4 py-3 font-mono text-red-400/70">-${trade.fees.toFixed(2)}</td>
                  <td className={cn('px-4 py-3 font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', trade.mode === 'PAPER' ? 'badge-warning' : 'badge-success')}>
                      {trade.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', trade.status === 'COMPLETED' ? 'badge-success' : trade.status === 'FAILED' ? 'badge-danger' : 'badge-warning')}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(trade.executedAt ?? trade.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">← Prev</button>
            <span className="text-xs text-slate-500">{page}/{pageCount}</span>
            <button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
