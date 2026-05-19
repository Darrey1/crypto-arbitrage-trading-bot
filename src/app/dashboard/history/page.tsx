'use client'

import { useMemo, useState } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { Trade, TradeStatus } from '@/types'
import { Search, Download, ArrowRight, Filter, TrendingUp, DollarSign, Bot, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Generate rich demo trades for visual effect
function genDemoTrades(): Trade[] {
  const exchanges = ['binance', 'kraken', 'kucoin'] as const
  const pairs = ['ETH/USDT', 'ETH/BTC', 'BTC/USDT']
  const statuses: TradeStatus[] = ['completed', 'completed', 'completed', 'failed', 'completed']
  return Array.from({ length: 40 }, (_, i) => {
    const buy = exchanges[Math.floor(Math.random() * 3)]
    let sell = exchanges[Math.floor(Math.random() * 3)]
    while (sell === buy) sell = exchanges[Math.floor(Math.random() * 3)]
    const netProfit = (Math.random() - 0.15) * 30
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const buyPrice = 3200 + Math.random() * 100
    return {
      id: `T${(1000 + i).toString()}`,
      userId: 'local',
      mode: Math.random() > 0.5 ? 'paper' : 'live',
      symbol: pairs[Math.floor(Math.random() * pairs.length)],
      buyExchange: buy,
      sellExchange: sell,
      buyPrice,
      sellPrice: buyPrice * (1 + netProfit / 1000 / buyPrice),
      amount: 0.1 + Math.random() * 0.5,
      grossProfit: netProfit + Math.random() * 3,
      fees: Math.random() * 2,
      netProfit,
      status,
      executedAt: new Date(Date.now() - i * 3600000 * 1.5).toISOString(),
      createdAt: new Date(Date.now() - i * 3600000 * 1.5).toISOString(),
    }
  })
}

export default function HistoryPage() {
  const { recentTrades } = useBotStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TradeStatus>('all')
  const [modeFilter, setModeFilter] = useState<'all' | 'paper' | 'live'>('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const allTrades = useMemo(() => {
    const demo = genDemoTrades()
    return [...recentTrades, ...demo].sort(
      (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    )
  }, [recentTrades])

  const filtered = allTrades.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (modeFilter !== 'all' && t.mode !== modeFilter) return false
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) &&
        !t.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const stats = useMemo(() => ({
    total: filtered.length,
    profit: filtered.reduce((s, t) => s + t.netProfit, 0),
    wins: filtered.filter(t => t.netProfit > 0).length,
    avgSpread: filtered.length > 0 ? filtered.reduce((s, t) => s + ((t.sellPrice - t.buyPrice) / t.buyPrice * 100), 0) / filtered.length : 0,
  }), [filtered])

  // Chart data — last 14 days
  const chartData = useMemo(() => {
    const days: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      days[d] = 0
    }
    filtered.forEach(t => {
      const d = new Date(t.executedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      if (d in days) days[d] += t.netProfit
    })
    return Object.entries(days).map(([day, profit]) => ({ day, profit: +profit.toFixed(2) }))
  }, [filtered])

  function downloadCSV() {
    const csv = [
      'ID,Symbol,Buy Exchange,Sell Exchange,Buy Price,Sell Price,Amount,Net Profit,Status,Mode,Time',
      ...filtered.map(t =>
        `${t.id},${t.symbol},${t.buyExchange},${t.sellExchange},${t.buyPrice.toFixed(2)},${t.sellPrice.toFixed(2)},${t.amount.toFixed(4)},${t.netProfit.toFixed(2)},${t.status},${t.mode},${t.executedAt}`
      )
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'trades.csv'; a.click()
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: stats.total, icon: Bot, color: 'text-violet-400' },
          { label: 'Total Net Profit', value: formatCurrency(stats.profit), icon: DollarSign, color: stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Win Rate', value: stats.total > 0 ? `${((stats.wins / stats.total) * 100).toFixed(1)}%` : '—', icon: Target, color: 'text-cyan-400' },
          { label: 'Avg Spread', value: `${stats.avgSpread.toFixed(3)}%`, icon: TrendingUp, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', `${color}/15`)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className="text-xl font-mono font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* P&L Chart */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">14-Day P&L Timeline</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={v => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: any) => [`$${v.toFixed(2)}`, 'Profit']}
            />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'}
                  fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters & Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-base pl-8 h-8 text-xs w-44" placeholder="Search ID or pair…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input-base h-8 text-xs cursor-pointer w-36">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>

          <select value={modeFilter} onChange={e => setModeFilter(e.target.value as typeof modeFilter)}
            className="input-base h-8 text-xs cursor-pointer w-32">
            <option value="all">All Modes</option>
            <option value="paper">Paper</option>
            <option value="live">Live</option>
          </select>

          <span className="text-xs text-slate-500">{filtered.length} trades</span>

          <button onClick={downloadCSV}
            className="ml-auto btn-ghost h-8 px-3 rounded-lg text-xs flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {['ID', 'Pair', 'Route', 'Buy Price', 'Sell Price', 'Amount', 'Fees', 'Net Profit', 'Mode', 'Time', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(trade => (
                <tr key={trade.id} className="border-b border-[rgba(255,255,255,0.03)] table-row-hover">
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{trade.id}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 capitalize">{trade.buyExchange.slice(0,3)}</span>
                      <ArrowRight className="w-3 h-3 text-violet-400" />
                      <span className="text-slate-400 capitalize">{trade.sellExchange.slice(0,3)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">${trade.buyPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">${trade.sellPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{trade.amount.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-red-400/70">-${trade.fees.toFixed(3)}</td>
                  <td className={cn('px-4 py-3 font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', trade.mode === 'paper' ? 'badge-warning' : 'badge-success')}>
                      {trade.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(trade.executedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full',
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

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('w-7 h-7 rounded-lg text-xs transition-all',
                  p === page ? 'gradient-bg text-white' : 'btn-ghost'
                )}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
