'use client'

import { useMemo } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES, formatCurrency, formatPercent, formatPrice } from '@/lib/utils'
import { ExchangeId } from '@/types'
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Link2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'

const EXCHANGE_IDS: ExchangeId[] = ['binance', 'kraken', 'kucoin']

const MOCK_BALANCES = {
  binance: { usdt: 4820.50, eth: 0.8432, total: 7558.10, connected: true },
  kraken:  { usdt: 2100.00, eth: 0.4210, total: 3468.25, connected: true },
  kucoin:  { usdt: 1500.00, eth: 0.2800, total: 2419.60, connected: false },
}

const PORTFOLIO_HISTORY = Array.from({ length: 30 }, (_, i) => {
  const base = 12000 + i * 120 + (Math.random() - 0.3) * 400
  return {
    day: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: +base.toFixed(2),
  }
})

const PIE_COLORS = ['#7C3AED', '#06B6D4', '#10B981']

export default function PortfolioPage() {
  const { prices, config } = useBotStore()

  const ethPrice = prices['binance:ETH/USDT']?.last ?? 3245

  const exchangeData = useMemo(() => EXCHANGE_IDS.map(ex => {
    const bal = MOCK_BALANCES[ex]
    const liveTotal = bal.usdt + bal.eth * ethPrice
    return { ex, ...bal, liveTotal }
  }), [ethPrice])

  const totalValue = exchangeData.reduce((s, e) => s + e.liveTotal, 0)
  const prevValue = totalValue * 0.97

  const pieData = exchangeData.map(e => ({
    name: EXCHANGES[e.ex].name,
    value: +e.liveTotal.toFixed(2),
    color: e.ex === 'binance' ? '#F0B90B' : e.ex === 'kraken' ? '#5741D9' : '#24AE8F',
  }))

  return (
    <div className="space-y-6">
      {/* Total Value Banner */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Total Portfolio Value</p>
            <div className="text-4xl font-extrabold font-mono gradient-text">
              {formatCurrency(totalValue, 2)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-mono">
                +{formatCurrency(totalValue - prevValue)} ({formatPercent((totalValue - prevValue) / prevValue * 100)})
              </span>
              <span className="text-xs text-slate-500">today</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.tradingMode === 'paper' && (
              <span className="badge-warning text-xs px-3 py-1 rounded-full">Paper Mode</span>
            )}
            <button className="btn-ghost px-3 py-2 rounded-lg text-xs flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Exchange Breakdown */}
        <div className="xl:col-span-2 space-y-4">
          {exchangeData.map(({ ex, usdt, eth, liveTotal, connected }) => {
            const exInfo = EXCHANGES[ex]
            const pct = (liveTotal / totalValue) * 100
            return (
              <div key={ex} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{ background: `${exInfo.color}15`, border: `1px solid ${exInfo.color}30`, color: exInfo.color }}>
                      {exInfo.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{exInfo.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-600')} />
                        <span className="text-[11px] text-slate-500">{connected ? 'Connected' : 'Not connected'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-white">{formatCurrency(liveTotal)}</div>
                    <div className="text-xs text-slate-500">{pct.toFixed(1)}% of portfolio</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full mb-4 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: exInfo.color }} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">USDT</div>
                    <div className="text-sm font-mono font-semibold text-slate-200">${usdt.toFixed(2)}</div>
                  </div>
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">ETH</div>
                    <div className="text-sm font-mono font-semibold text-slate-200">{eth.toFixed(4)}</div>
                  </div>
                  <div className="glass-subtle rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-500 mb-1">ETH Value</div>
                    <div className="text-sm font-mono font-semibold text-violet-400">{formatCurrency(eth * ethPrice)}</div>
                  </div>
                </div>

                {!connected && (
                  <button className="mt-3 btn-primary w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Connect {exInfo.name}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Donut Chart */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Allocation by Exchange</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`$${v.toLocaleString()}`, undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {pieData.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-slate-400">{name}</span>
                  </div>
                  <span className="font-mono text-slate-200">${value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Day History Chart */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">30-Day Value History</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={PORTFOLIO_HISTORY} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} interval={9} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0D1117', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [formatCurrency(v), 'Portfolio']}
                />
                <Area type="monotone" dataKey="value" stroke="#7C3AED" fill="url(#portfolioGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
