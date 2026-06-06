'use client'

import { useMemo } from 'react'
import { Link2, RefreshCw, Wallet, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { useBotStore } from '@/store/useBotStore'
import { EXCHANGES, formatCurrency, formatPercent } from '@/lib/utils'

const PIE_COLORS = ['#ECBD74', '#10B981', '#06B6D4']

export default function PortfolioPage() {
  const { portfolioBalances, portfolioHistory, wallet, rotateWallet, loading } = useBotStore()
  console.log('Portfolio balances:', portfolioBalances)
  const totalValue = portfolioBalances.reduce((sum, balance) => sum + balance.totalValue, 0)
  const previousValue = portfolioHistory[portfolioHistory.length - 2]?.totalValue ?? totalValue

  const pieData = useMemo(() => portfolioBalances.map((balance, index) => ({
    name: EXCHANGES[balance.exchange.toLowerCase() as keyof typeof EXCHANGES].name,
    value: balance.totalValue,
    color: PIE_COLORS[index % PIE_COLORS.length],
  })), [portfolioBalances])

  const historyData = portfolioHistory.map((point) => ({
    day: new Date(point.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: point.totalValue,
  }))

  async function handleRotateWallet() {
    try {
      await rotateWallet()
      toast.success('Wallet rotated')
    } catch {
      toast.error('Wallet rotation failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Portfolio Value</p>
            <div className="text-4xl font-extrabold font-mono gradient-text">{formatCurrency(totalValue)}</div>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-mono">
                {formatCurrency(totalValue - previousValue)} ({formatPercent(previousValue ? ((totalValue - previousValue) / previousValue) * 100 : 0)})
              </span>
              <span className="text-xs text-slate-500">latest snapshot</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => toast.success('Portfolio refreshed')} className="btn-ghost px-3 py-2 rounded-lg text-xs flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button onClick={handleRotateWallet} className="btn-primary px-3 py-2 rounded-lg text-xs flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Rotate Wallet
            </button>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {portfolioBalances.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-xs text-slate-500">
              {loading ? 'Loading balances…' : 'No balances available yet.'}
            </div>
          ) : portfolioBalances.map((balance) => {
            const exchangeInfo = EXCHANGES[balance.exchange.toLowerCase() as keyof typeof EXCHANGES]
            const allocation = totalValue > 0 ? (balance.totalValue / totalValue) * 100 : 0
            return (
              <div key={balance.exchange} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: `${exchangeInfo.color}15`, border: `1px solid ${exchangeInfo.color}30`, color: exchangeInfo.color }}>
                      {exchangeInfo.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{exchangeInfo.name}</div>
                      <div className="text-[11px] text-slate-500">{balance.connected ? 'Connected' : 'Not connected'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-slate-100">{formatCurrency(balance.totalValue)}</div>
                    <div className="text-xs text-slate-500">{allocation.toFixed(1)}% of total</div>
                  </div>
                </div>

                <div className="w-full h-1 bg-slate-800 rounded-full mb-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${allocation}%`, background: exchangeInfo.color }} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">USDT</div>
                    <div className="text-sm font-mono font-semibold text-slate-200">${balance.usdt.toFixed(2)}</div>
                  </div>
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">ETH</div>
                    <div className="text-sm font-mono font-semibold text-slate-200">{balance.eth.toFixed(4)}</div>
                  </div>
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">ETH Value</div>
                    <div className="text-sm font-mono font-semibold text-[var(--accent)]">{formatCurrency(balance.ethValue)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Wallet View</h3>
              <Link2 className="w-4 h-4 text-[var(--accent)]" />
            </div>
            {wallet ? (
              <div className="space-y-3 text-xs">
                <div className="glass-subtle rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Address</div>
                  <div className="mt-1 font-mono text-slate-200 break-all">{wallet.address}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-subtle rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Chain ID</div>
                    <div className="mt-1 font-mono text-slate-200">{wallet.chainId}</div>
                  </div>
                  <div className="glass-subtle rounded-xl p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Key Version</div>
                    <div className="mt-1 font-mono text-slate-200">{wallet.keyVersion}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">No wallet configured.</div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Allocation</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, undefined]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                        <span className="text-slate-400">{entry.name}</span>
                      </div>
                      <span className="font-mono text-slate-200">${entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">No allocation data yet.</div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">History</h3>
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={historyData} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Portfolio']} />
                  <Area type="monotone" dataKey="value" stroke="#ECBD74" fill="url(#portfolioGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No history points yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
