'use client'

import { useState, useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Search, Download, ArrowRight, Flag } from 'lucide-react'
import { toast } from 'sonner'

const EXCHANGES = ['binance', 'kraken', 'kucoin'] as const
const PAIRS = ['ETH/USDT', 'BTC/USDT', 'ETH/BTC']
const STATUSES = ['completed', 'failed', 'partial'] as const

function genPlatformTrades() {
  return Array.from({ length: 60 }, (_, i) => {
    const buy = EXCHANGES[Math.floor(Math.random() * 3)]
    let sell = EXCHANGES[Math.floor(Math.random() * 3)]
    while (sell === buy) sell = EXCHANGES[Math.floor(Math.random() * 3)]
    const profit = (Math.random() - 0.1) * 40
    return {
      id: `PT${String(i + 1).padStart(4, '0')}`,
      userId: `U${String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')}`,
      symbol: PAIRS[Math.floor(Math.random() * PAIRS.length)],
      buyExchange: buy,
      sellExchange: sell,
      netProfit: profit,
      mode: Math.random() > 0.6 ? 'live' : 'paper',
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      executedAt: new Date(Date.now() - i * 1800000).toISOString(),
      flagged: i % 20 === 0,
    }
  })
}

const ALL_TRADES = genPlatformTrades()

export default function AdminTradesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [trades, setTrades] = useState(ALL_TRADES)
  const PER_PAGE = 12

  const filtered = useMemo(() => trades.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (modeFilter !== 'all' && t.mode !== modeFilter) return false
    if (search && !t.id.toLowerCase().includes(search.toLowerCase()) &&
        !t.userId.toLowerCase().includes(search.toLowerCase()) &&
        !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [trades, search, statusFilter, modeFilter])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const totalProfit = filtered.reduce((s, t) => s + t.netProfit, 0)
  const liveCount = filtered.filter(t => t.mode === 'live').length

  function downloadCSV() {
    const csv = ['ID,User,Symbol,Buy,Sell,Profit,Mode,Status,Time',
      ...filtered.map(t => `${t.id},${t.userId},${t.symbol},${t.buyExchange},${t.sellExchange},${t.netProfit.toFixed(2)},${t.mode},${t.status},${t.executedAt}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'platform-trades.csv'; a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-100">All Trades — Platform Wide</h1>
        <button onClick={downloadCSV} className="btn-ghost text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-mono font-bold text-violet-400">{filtered.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total Trades</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className={cn('text-2xl font-mono font-bold', totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(totalProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Platform P&L</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-2xl font-mono font-bold text-amber-400">{liveCount}</div>
          <div className="text-xs text-slate-500 mt-1">Live Trades</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-base pl-8 h-8 text-xs w-48" placeholder="ID, user, symbol…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-base h-8 text-xs cursor-pointer w-32">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
          <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}
            className="input-base h-8 text-xs cursor-pointer w-28">
            <option value="all">All Modes</option>
            <option value="live">Live</option>
            <option value="paper">Paper</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {['Trade ID', 'User', 'Pair', 'Route', 'Net P&L', 'Mode', 'Status', 'Time', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(trade => (
                <tr key={trade.id} className={cn('border-b border-[rgba(255,255,255,0.03)] table-row-hover', trade.flagged && 'bg-amber-500/3')}>
                  <td className="px-4 py-3 font-mono text-violet-400 text-[11px]">{trade.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{trade.userId}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-200">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400 capitalize">{trade.buyExchange.slice(0, 3)}</span>
                      <ArrowRight className="w-3 h-3 text-violet-400" />
                      <span className="text-slate-400 capitalize">{trade.sellExchange.slice(0, 3)}</span>
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', trade.mode === 'live' ? 'badge-success' : 'badge-warning')}>
                      {trade.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                      trade.status === 'completed' ? 'badge-success' :
                      trade.status === 'failed' ? 'badge-danger' : 'badge-warning'
                    )}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(trade.executedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {trade.flagged && <Flag className="w-3.5 h-3.5 text-amber-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span className="text-xs text-slate-500">{filtered.length} trades</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">← Prev</button>
            <span className="text-xs text-slate-500">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
