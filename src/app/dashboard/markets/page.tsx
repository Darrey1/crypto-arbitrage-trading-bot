'use client'

import { useMemo, useState } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { ExchangeId } from '@/types'
import { cn, formatPrice, formatPercent, EXCHANGES, calculateNetSpread } from '@/lib/utils'
import { TrendingUp, TrendingDown, Search, RefreshCw, ArrowRight, Activity } from 'lucide-react'

const PAIRS = ['ETH/USDT', 'ETH/BTC', 'BTC/USDT']

type SortKey = 'spread' | 'volume' | 'change'

export default function MarketsPage() {
  const { prices } = useBotStore()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('spread')
  const [selected, setSelected] = useState<string | null>('ETH/USDT')
  const [activeTab, setActiveTab] = useState<'all' | ExchangeId>('all')

  const EXCHANGES_LIST: ExchangeId[] = ['binance', 'kraken', 'kucoin']

  const rows = useMemo(() => {
    return PAIRS.filter(p => p.toLowerCase().includes(search.toLowerCase())).map(pair => {
      const ticks = EXCHANGES_LIST.map(ex => ({
        ex,
        tick: prices[`${ex}:${pair}`],
      })).filter(t => t.tick)

      const asks = ticks.map(t => ({ ex: t.ex, price: t.tick!.ask }))
      const bids = ticks.map(t => ({ ex: t.ex, price: t.tick!.bid }))

      const cheapest = asks.sort((a, b) => a.price - b.price)[0]
      const priciest = bids.sort((a, b) => b.price - a.price)[0]

      let netSpread = 0
      if (cheapest && priciest && cheapest.ex !== priciest.ex) {
        const { net } = calculateNetSpread(
          cheapest.price, priciest.price,
          EXCHANGES[cheapest.ex].fee, EXCHANGES[priciest.ex].fee
        )
        netSpread = Math.max(0, net)
      }

      const binanceTick = prices[`binance:${pair}`]
      const krakenTick  = prices[`kraken:${pair}`]
      const kucoinTick  = prices[`kucoin:${pair}`]

      return {
        pair,
        binance: binanceTick?.last,
        kraken:  krakenTick?.last,
        kucoin:  kucoinTick?.last,
        netSpread,
        buyOn: cheapest?.ex,
        sellOn: priciest?.ex,
        volume: (binanceTick?.volume24h ?? 0) + (krakenTick?.volume24h ?? 0) + (kucoinTick?.volume24h ?? 0),
        change: binanceTick?.change24h ?? 0,
      }
    }).sort((a, b) => {
      if (sort === 'spread') return b.netSpread - a.netSpread
      if (sort === 'volume') return b.volume - a.volume
      return Math.abs(b.change) - Math.abs(a.change)
    })
  }, [prices, search, sort])

  const selRow = rows.find(r => r.pair === selected)

  // Heatmap data — 6×3 grid of pairs × exchanges
  const heatmapData = useMemo(() => {
    return PAIRS.flatMap(pair =>
      EXCHANGES_LIST.map(ex => {
        const tick = prices[`${ex}:${pair}`]
        return { pair, ex, price: tick?.last, change: tick?.change24h ?? 0 }
      })
    )
  }, [prices])

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Exchange tabs */}
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          {(['all', 'binance', 'kraken', 'kucoin'] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                activeTab === tab ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-500 hover:text-slate-300'
              )}>
              {tab === 'all' ? 'All Exchanges' : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-base pl-8 h-8 text-xs w-40" placeholder="Search pair…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="input-base h-8 text-xs w-36 cursor-pointer"
        >
          <option value="spread">Sort: Best Spread</option>
          <option value="volume">Sort: Volume</option>
          <option value="change">Sort: 24h Change</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <div className="live-dot" />
          <span>Live · updates every 1s</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Price Table */}
        <div className="xl:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="text-xs font-semibold text-slate-300">Price Comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.05)]">
                  {['Pair', 'Binance', 'Kraken', 'KuCoin', 'Best Spread', 'Route', '24h Vol', '24h Change'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.pair}
                    onClick={() => setSelected(row.pair)}
                    className={cn(
                      'border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-colors',
                      selected === row.pair ? 'bg-violet-500/8' : 'table-row-hover',
                      row.netSpread > 0.3 && 'border-l-2 border-l-violet-500/50'
                    )}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-200">{row.pair}</td>
                    <td className="px-4 py-3 font-mono text-yellow-400/90">
                      {row.binance ? `$${formatPrice(row.binance)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-400/90">
                      {row.kraken ? `$${formatPrice(row.kraken)}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400/90">
                      {row.kucoin ? `$${formatPrice(row.kucoin)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('font-mono font-semibold',
                        row.netSpread > 0.3 ? 'text-violet-400' :
                        row.netSpread > 0 ? 'text-slate-300' : 'text-slate-600'
                      )}>
                        {row.netSpread > 0 ? `+${row.netSpread.toFixed(3)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.buyOn && row.sellOn && row.netSpread > 0 ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="capitalize text-slate-400">{row.buyOn.slice(0,3)}</span>
                          <ArrowRight className="w-3 h-3 text-violet-400" />
                          <span className="capitalize text-slate-400">{row.sellOn.slice(0,3)}</span>
                        </div>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {row.volume > 0 ? `${(row.volume / 1000).toFixed(0)}K` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('font-mono flex items-center gap-1',
                        row.change > 0 ? 'text-emerald-400' : row.change < 0 ? 'text-red-400' : 'text-slate-500'
                      )}>
                        {row.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(row.change)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Pair Detail */}
        <div className="space-y-4">
          {selRow ? (
            <>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">{selRow.pair} Detail</h3>
                  {selRow.netSpread > 0 && (
                    <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">
                      Opportunity
                    </span>
                  )}
                </div>

                {/* Price per exchange */}
                {EXCHANGES_LIST.map(ex => {
                  const tick = prices[`${ex}:${selRow.pair}`]
                  return (
                    <div key={ex} className="glass-subtle rounded-xl p-3 mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: EXCHANGES[ex].color }} />
                          <span className="text-xs font-semibold text-slate-300 capitalize">{EXCHANGES[ex].name}</span>
                        </div>
                        <div className={cn('w-1.5 h-1.5 rounded-full', tick ? 'bg-emerald-400' : 'bg-slate-600')} />
                      </div>
                      {tick ? (
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                          <div>
                            <div className="text-slate-500 mb-0.5">Bid</div>
                            <div className="text-red-400">${formatPrice(tick.bid)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Last</div>
                            <div className="text-slate-200">${formatPrice(tick.last)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Ask</div>
                            <div className="text-emerald-400">${formatPrice(tick.ask)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">No data — bot not running</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Arbitrage Calculator */}
              <ArbitrageCalculator pair={selRow.pair} netSpread={selRow.netSpread}
                buyOn={selRow.buyOn} sellOn={selRow.sellOn}
                buyPrice={selRow.buyOn ? prices[`${selRow.buyOn}:${selRow.pair}`]?.ask : undefined}
                sellPrice={selRow.sellOn ? prices[`${selRow.sellOn}:${selRow.pair}`]?.bid : undefined}
              />
            </>
          ) : (
            <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center text-center h-48">
              <Activity className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">Select a pair to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Spread Heatmap — Exchange × Pair</h3>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* Header */}
          <div className="text-slate-500 font-medium">Pair / Exchange</div>
          {EXCHANGES_LIST.map(ex => (
            <div key={ex} className="text-center font-semibold capitalize text-slate-300">{ex}</div>
          ))}
          {/* Rows */}
          {PAIRS.map(pair => (
            <>
              <div key={pair} className="flex items-center text-slate-400 font-mono">{pair}</div>
              {EXCHANGES_LIST.map(ex => {
                const tick = prices[`${ex}:${pair}`]
                const change = tick?.change24h ?? 0
                const intensity = Math.min(Math.abs(change) / 5, 1)
                return (
                  <div key={`${pair}-${ex}`}
                    className="rounded-lg py-2 px-3 text-center font-mono transition-all"
                    style={{
                      background: tick
                        ? change > 0
                          ? `rgba(16,185,129,${0.08 + intensity * 0.15})`
                          : `rgba(239,68,68,${0.08 + intensity * 0.15})`
                        : 'rgba(255,255,255,0.02)',
                      border: tick ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.02)',
                    }}>
                    <div className={cn('font-semibold text-[11px]', change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-500')}>
                      {tick ? formatPercent(change) : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {tick ? `$${formatPrice(tick.last)}` : 'No data'}
                    </div>
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}

function ArbitrageCalculator({
  pair, netSpread, buyOn, sellOn, buyPrice, sellPrice
}: {
  pair: string; netSpread: number; buyOn?: ExchangeId; sellOn?: ExchangeId
  buyPrice?: number; sellPrice?: number
}) {
  const [amount, setAmount] = useState(1000)

  const profit = useMemo(() => {
    if (!buyPrice || !sellPrice || !buyOn || !sellOn) return null
    const eth = amount / buyPrice
    const revenue = eth * sellPrice
    const buyFee = amount * EXCHANGES[buyOn].fee
    const sellFee = revenue * EXCHANGES[sellOn].fee
    return revenue - amount - buyFee - sellFee
  }, [amount, buyPrice, sellPrice, buyOn, sellOn])

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-slate-300 mb-3">Profit Calculator</h3>
      <div className="mb-3">
        <label className="text-[11px] text-slate-500 mb-1.5 block">Trade Size (USDT)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="input-base text-xs"
          min={10}
          max={100000}
        />
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Net Spread</span>
          <span className={cn('font-mono', netSpread > 0 ? 'text-violet-400' : 'text-slate-500')}>
            {netSpread > 0 ? `+${netSpread.toFixed(3)}%` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Est. Profit</span>
          <span className={cn('font-mono font-semibold', profit !== null && profit > 0 ? 'text-emerald-400' : 'text-red-400')}>
            {profit !== null ? `${profit > 0 ? '+' : ''}$${profit.toFixed(3)}` : '—'}
          </span>
        </div>
        {buyOn && sellOn && (
          <div className="flex justify-between">
            <span className="text-slate-500">Route</span>
            <span className="text-slate-300 capitalize">{buyOn}→{sellOn}</span>
          </div>
        )}
      </div>
    </div>
  )
}
