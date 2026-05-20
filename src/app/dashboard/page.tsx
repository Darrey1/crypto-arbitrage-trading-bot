// 'use client'

// import { useMemo } from 'react'
// import { Activity, DollarSign, Target, Bot, Wallet } from 'lucide-react'
// import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
// import { useBotStore } from '@/store/useBotStore'
// import { cn, EXCHANGES, formatCurrency, formatPercent, formatPrice } from '@/lib/utils'
// import { priceKey } from '@/store/useBotStore'

// function StatCard({ label, value, icon: Icon, tone = 'text-slate-200' }: { label: string; value: string; icon: React.ElementType; tone?: string }) {
//   return (
//     <div className="glass rounded-2xl p-5">
//       <div className="flex items-start justify-between mb-3">
//         <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
//           <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
//         </div>
//       </div>
//       <div className={cn('text-lg font-mono font-bold', tone)}>{value}</div>
//       <div className="text-xs text-slate-500 mt-0.5">{label}</div>
//     </div>
//   )
// }

// function EmptyState({ title, description }: { title: string; description: string }) {
//   return (
//     <div className="glass rounded-2xl p-6 text-center">
//       <div className="text-sm font-semibold text-slate-200">{title}</div>
//       <div className="text-xs text-slate-500 mt-1">{description}</div>
//     </div>
//   )
// }

// export default function DashboardPage() {
//   const { botState, config, opportunities, trades, prices, portfolioBalances, portfolioHistory, tradeStats, loading, error, socketConnected } = useBotStore()

//   const selectedPair = config.tradingPair || opportunities[0]?.pair || ''
//   const comparisonRows = useMemo(
//     () => Object.values(prices).filter((tick) => tick.pair === selectedPair),
//     [prices, selectedPair],
//   )
//   const latestOpportunity = opportunities[0]
//   const recentTrades = trades.slice(0, 5)
//   const totalPortfolioValue = portfolioBalances.reduce((sum, balance) => sum + balance.totalValue, 0)
//   const historyData = portfolioHistory.slice(-14).map((point) => ({
//     date: new Date(point.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
//     value: point.totalValue,
//   }))

//   console.log("comparisonRows", comparisonRows)

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between gap-3 flex-wrap">
//         <div>
//           <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
//           <p className="text-xs text-slate-500 mt-0.5">
//             Live arbitrage overview {socketConnected ? '• connected' : '• reconnecting'}
//           </p>
//         </div>
//         {error && (
//           <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg max-w-[420px]">
//             {error}
//           </div>
//         )}
//       </div>

//       <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
//         <StatCard label="Bot PnL Today" value={formatCurrency(botState.todayPnl)} icon={DollarSign} tone={botState.todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
//         <StatCard label="Opportunities" value={String(botState.totalOpportunities)} icon={Activity} tone="text-violet-400" />
//         <StatCard label="Trades" value={String(botState.totalTrades)} icon={Bot} tone="text-cyan-400" />
//         <StatCard label="Win Rate" value={formatPercent(botState.winRate)} icon={Target} tone="text-amber-400" />
//       </div>

//       <div className="grid xl:grid-cols-3 gap-6">
//         <div className="xl:col-span-2 space-y-4">
//           <div className="glass rounded-2xl p-5">
//             <div className="flex items-center justify-between mb-4">
//               <div>
//                 <h3 className="text-sm font-semibold text-slate-200">{selectedPair || 'Selected Pair'} Live Comparison</h3>
//                 <p className="text-xs text-slate-500 mt-0.5">Prices streamed from the backend for the bot-selected pair</p>
//               </div>
//               <div className="flex items-center gap-2 text-xs text-slate-500">
//                 <div className={cn('w-2 h-2 rounded-full', socketConnected ? 'bg-emerald-400' : 'bg-amber-400')} />
//                 {socketConnected ? 'Live' : 'Disconnected'}
//               </div>
//             </div>

//             {comparisonRows.length > 0 ? (
//               <ResponsiveContainer width="100%" height={220}>
//                 <LineChart data={comparisonRows.map((tick) => ({
//                   name: EXCHANGES[tick.exchange.toLowerCase() as keyof typeof EXCHANGES].name,
//                   bid: tick.bid,
//                   ask: tick.ask,
//                   last: tick.lastPrice,
//                 }))}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
//                   <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} />
//                   <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
//                   <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [`$${formatPrice(Number(value ?? 0))}`, undefined]} />
//                   <Line type="monotone" dataKey="bid" stroke="#10B981" strokeWidth={2} dot={false} />
//                   <Line type="monotone" dataKey="last" stroke="#ECBD74" strokeWidth={2} dot={false} />
//                   <Line type="monotone" dataKey="ask" stroke="#EF4444" strokeWidth={2} dot={false} />
//                 </LineChart>
//               </ResponsiveContainer>
//             ) : (
//               <EmptyState title={loading ? 'Loading market data…' : 'No price data yet'} description="The price stream will populate here once the backend starts sending ticks." />
//             )}
//           </div>

//           <div className="grid md:grid-cols-2 gap-4">
//             <div className="glass rounded-2xl p-5">
//               <div className="flex items-center justify-between mb-4">
//                 <div>
//                   <h3 className="text-sm font-semibold text-slate-200">Recent Opportunities</h3>
//                   <p className="text-xs text-slate-500 mt-0.5">Newest first</p>
//                 </div>
//                 {latestOpportunity && (
//                   <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">{latestOpportunity.status}</span>
//                 )}
//               </div>
//               <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
//                 {opportunities.length === 0 ? (
//                   <EmptyState title="No opportunities" description="Arbitrage alerts will appear here when the bot detects a spread." />
//                 ) : opportunities.slice(0, 5).map((opp) => (
//                   <div key={opp.id} className="glass-subtle rounded-xl p-3">
//                     <div className="flex items-center justify-between mb-1.5">
//                       <div>
//                         <div className="text-xs font-semibold text-slate-200">{opp.pair}</div>
//                         <div className="text-[11px] text-slate-500">{opp.buyExchange} → {opp.sellExchange}</div>
//                       </div>
//                       <div className="text-right">
//                         <div className="text-sm font-mono font-semibold text-emerald-400">+{opp.netSpread.toFixed(3)}%</div>
//                         <div className="text-[10px] text-slate-500">{formatCurrency(opp.estProfit)}</div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div className="glass rounded-2xl p-5">
//               <div className="flex items-center justify-between mb-4">
//                 <div>
//                   <h3 className="text-sm font-semibold text-slate-200">Recent Trades</h3>
//                   <p className="text-xs text-slate-500 mt-0.5">Latest executions</p>
//                 </div>
//                 <div className="text-xs text-slate-500">{tradeStats?.totalTrades ?? trades.length} total</div>
//               </div>
//               <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
//                 {recentTrades.length === 0 ? (
//                   <EmptyState title="No trades yet" description="Trades will be listed here after bot execution." />
//                 ) : recentTrades.map((trade) => (
//                   <div key={trade.id} className="glass-subtle rounded-xl p-3">
//                     <div className="flex items-center justify-between mb-1.5">
//                       <div>
//                         <div className="text-xs font-semibold text-slate-200">{trade.pair}</div>
//                         <div className="text-[11px] text-slate-500">{trade.route}</div>
//                       </div>
//                       <div className={cn('text-sm font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
//                         {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
//                       </div>
//                     </div>
//                     <div className="flex items-center justify-between text-[11px] text-slate-500">
//                       <span>{trade.mode}</span>
//                       <span>{trade.status}</span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="space-y-4">
//           <div className="glass rounded-2xl p-5">
//             <div className="flex items-center justify-between mb-4">
//               <div>
//                 <h3 className="text-sm font-semibold text-slate-200">Portfolio Snapshot</h3>
//                 <p className="text-xs text-slate-500 mt-0.5">Across connected exchanges</p>
//               </div>
//               <Wallet className="w-4 h-4 text-[var(--accent)]" />
//             </div>
//             <div className="text-3xl font-black font-mono" style={{ color: 'var(--accent)' }}>
//               {formatCurrency(totalPortfolioValue)}
//             </div>
//             <div className="text-xs text-slate-500 mt-1">
//               {portfolioBalances.filter((item) => item.connected).length} exchanges connected
//             </div>
//           </div>

//           <div className="glass rounded-2xl p-5">
//             <h3 className="text-sm font-semibold text-slate-200 mb-4">Live Prices</h3>
//             <div className="space-y-2">
//               {comparisonRows.map((tick) => (
//                 <div key={priceKey(tick.exchange, tick.pair)} className="flex items-center justify-between text-xs">
//                   <div>
//                     <div className="text-slate-300">{EXCHANGES[tick.exchange.toLowerCase() as keyof typeof EXCHANGES].name}</div>
//                     <div className="text-[11px] text-slate-500">{tick.pair}</div>
//                   </div>
//                   <div className="text-right font-mono">
//                     <div className="text-slate-200">${formatPrice(tick.lastPrice)}</div>
//                     <div className="text-emerald-400">{formatPercent(((tick.ask - tick.bid) / tick.lastPrice) * 100)}</div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="glass rounded-2xl p-5">
//             <h3 className="text-sm font-semibold text-slate-200 mb-4">Portfolio Trend</h3>
//             {historyData.length > 0 ? (
//               <ResponsiveContainer width="100%" height={160}>
//                 <AreaChart data={historyData}>
//                   <defs>
//                     <linearGradient id="portfolioDashGrad" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.3} />
//                       <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
//                     </linearGradient>
//                   </defs>
//                   <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
//                   <YAxis hide />
//                   <Tooltip contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Value']} />
//                   <Area type="monotone" dataKey="value" stroke="#ECBD74" fill="url(#portfolioDashGrad)" strokeWidth={2} dot={false} />
//                 </AreaChart>
//               </ResponsiveContainer>
//             ) : (
//               <EmptyState title="No history" description="Portfolio history will appear once the backend provides points." />
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { Activity, DollarSign, Target, Bot, Wallet } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES, formatCurrency, formatPercent, formatPrice } from '@/lib/utils'
import { priceKey } from '@/store/useBotStore'

const EXCHANGE_COLORS: Record<string, string> = {
  BINANCE: '#ECBD74',
  KRAKEN: '#7C3AED',
  KUCOIN: '#10B981',
}

function StatCard({ label, value, icon: Icon, tone = 'text-slate-200' }: { label: string; value: string; icon: React.ElementType; tone?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
      </div>
      <div className={cn('text-lg font-mono font-bold', tone)}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  )
}

type ChartPoint = {
  time: string
  BINANCE?: number
  KRAKEN?: number
  KUCOIN?: number
}

export default function DashboardPage() {
  const { botState, config, opportunities, trades, prices, portfolioBalances, portfolioHistory, tradeStats, loading, error, socketConnected } = useBotStore()

  const selectedPair = config?.tradingPair || opportunities[0]?.pair || ''
  const comparisonRows = useMemo(
    () => Object.values(prices).filter((tick) => tick.pair === selectedPair),
    [prices, selectedPair],
  )

  // accumulate ticks over time to build chart history
  const historyRef = useRef<ChartPoint[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  useEffect(() => {
    if (comparisonRows.length === 0) return

    const now = new Date()
    const timeLabel = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const point: ChartPoint = { time: timeLabel }
    for (const tick of comparisonRows) {
      const key = tick.exchange.toUpperCase() as keyof Omit<ChartPoint, 'time'>
      point[key] = tick.lastPrice
    }

    historyRef.current = [...historyRef.current.slice(-59), point] // keep last 60 points
    setChartData([...historyRef.current])
  }, [comparisonRows])

  const latestPrices = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tick of comparisonRows) {
      map[tick.exchange.toUpperCase()] = tick.lastPrice
    }
    return map
  }, [comparisonRows])

  const latestOpportunity = opportunities[0]
  const recentTrades = trades.slice(0, 5)
  const totalPortfolioValue = portfolioBalances.reduce((sum, balance) => sum + balance.totalValue, 0)
  const portfolioHistoryData = portfolioHistory.slice(-14).map((point) => ({
    date: new Date(point.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: point.totalValue,
  }))

  const exchanges = ['BINANCE', 'KRAKEN', 'KUCOIN']

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Bot PnL Today" value={formatCurrency(botState?.todayPnl ?? 0)} icon={DollarSign} tone={(botState?.todayPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Opportunities" value={String(botState?.totalOpportunities ?? 0)} icon={Activity} tone="text-violet-400" />
        <StatCard label="Trades" value={String(botState?.totalTrades ?? 0)} icon={Bot} tone="text-cyan-400" />
        <StatCard label="Win Rate" value={formatPercent(botState?.winRate ?? 0)} icon={Target} tone="text-amber-400" />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">

          {/* Live Price Comparison Chart */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {selectedPair || 'Selected Pair'} — Live Price Comparison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">All {exchanges.length} exchanges simultaneously</p>
              </div>
              <div className="flex items-center gap-4">
                {exchanges.map((ex) => (
                  latestPrices[ex] !== undefined && (
                    <div key={ex} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: EXCHANGE_COLORS[ex] }} />
                      <span className="text-xs text-slate-400">{ex.charAt(0) + ex.slice(1).toLowerCase()}</span>
                      <span className="text-xs font-mono font-semibold text-slate-200">${formatPrice(latestPrices[ex])}</span>
                    </div>
                  )
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <div className={cn('w-2 h-2 rounded-full', socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
                  <span className="text-xs text-slate-500">{socketConnected ? 'Live' : 'Disconnected'}</span>
                </div>
              </div>
            </div>

            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(1, Math.floor(chartData.length / 6))}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    domain={['auto', 'auto']}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                    formatter={(value, name) => [`$${formatPrice(Number(value ?? 0))}`, String(name).charAt(0) + String(name).slice(1).toLowerCase()]}
                    labelStyle={{ color: '#94A3B8', marginBottom: 4 }}
                  />
                  {exchanges.map((ex) => (
                    <Line
                      key={ex}
                      type="monotone"
                      dataKey={ex}
                      stroke={EXCHANGE_COLORS[ex]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title={loading ? 'Loading market data…' : chartData.length === 1 ? 'Collecting data points…' : 'No price data yet'}
                description="The chart will populate once the backend starts streaming ticks."
              />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Recent Opportunities</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Newest first</p>
                </div>
                {latestOpportunity && (
                  <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">{latestOpportunity.status}</span>
                )}
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {opportunities.length === 0 ? (
                  <EmptyState title="No opportunities" description="Arbitrage alerts will appear here when the bot detects a spread." />
                ) : opportunities.slice(0, 5).map((opp) => (
                  <div key={opp.id} className="glass-subtle rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{opp.pair}</div>
                        <div className="text-[11px] text-slate-500">{opp.buyExchange} → {opp.sellExchange}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-semibold text-emerald-400">+{opp.netSpread.toFixed(3)}%</div>
                        <div className="text-[10px] text-slate-500">{formatCurrency(opp.estProfit)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Recent Trades</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Latest executions</p>
                </div>
                <div className="text-xs text-slate-500">{tradeStats?.totalTrades ?? trades.length} total</div>
              </div>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {recentTrades.length === 0 ? (
                  <EmptyState title="No trades yet" description="Trades will be listed here after bot execution." />
                ) : recentTrades.map((trade) => (
                  <div key={trade.id} className="glass-subtle rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{trade.pair}</div>
                        <div className="text-[11px] text-slate-500">{trade.route}</div>
                      </div>
                      <div className={cn('text-sm font-mono font-semibold', trade.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {trade.netProfit >= 0 ? '+' : ''}{formatCurrency(trade.netProfit)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{trade.mode}</span>
                      <span>{trade.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
              {portfolioBalances.filter((item) => item.connected).length} exchanges connected
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Live Prices</h3>
            <div className="space-y-2">
              {comparisonRows.map((tick) => (
                <div key={priceKey(tick.exchange, tick.pair)} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: EXCHANGE_COLORS[tick.exchange.toUpperCase()] }} />
                    <div>
                      <div className="text-slate-300">{EXCHANGES[tick.exchange.toLowerCase() as keyof typeof EXCHANGES].name}</div>
                      <div className="text-[11px] text-slate-500">{tick.pair}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-slate-200">${formatPrice(tick.lastPrice)}</div>
                    <div className="text-emerald-400">{formatPercent(((tick.ask - tick.bid) / tick.lastPrice) * 100)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Portfolio Trend</h3>
            {portfolioHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={portfolioHistoryData}>
                  <defs>
                    <linearGradient id="portfolioDashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ECBD74" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ECBD74" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0D1117', border: '1px solid rgba(236,189,116,0.2)', borderRadius: 8, fontSize: 11 }}
                    formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#ECBD74" fill="url(#portfolioDashGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No history" description="Portfolio history will appear once the backend provides points." />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
