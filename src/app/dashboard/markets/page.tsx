'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Activity, Search, TrendingUp, TrendingDown } from 'lucide-react'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES, formatPercent, formatPrice, calculateNetSpread } from '@/lib/utils'
import type { PriceData } from '@/api/types'
import { PriceComparisonChart } from '@/components/dashboard/PriceComparisonChart'

const EXCHANGE_IDS = ['binance', 'kraken', 'kucoin'] as const

type SortKey = 'spread' | 'volume' | 'change'


function pairRows(
  prices: Record<string, PriceData>,
  search: string,
  sort: SortKey
) {
  const priceList = Object.values(prices)

  const grouped = priceList.reduce((acc, price) => {
    if (!acc[price.pair]) acc[price.pair] = []
    acc[price.pair].push(price)
    return acc
  }, {} as Record<string, PriceData[]>)

  const dynamicPairs = Object.keys(grouped)

  return dynamicPairs
    .filter((pair) =>
      pair.toLowerCase().includes(search.toLowerCase())
    )
    .map((pair) => {
      const ticks = grouped[pair] ?? []

      const cheapestAsk = ticks.reduce<PriceData | null>(
        (best, tick) => (!best || tick.ask < best.ask ? tick : best),
        null
      )

      const highestBid = ticks.reduce<PriceData | null>(
        (best, tick) => (!best || tick.bid > best.bid ? tick : best),
        null
      )

      const spreadData =
        cheapestAsk &&
        highestBid &&
        cheapestAsk.exchange !== highestBid.exchange
          ? calculateNetSpread(
              cheapestAsk.ask,
              highestBid.bid,
              EXCHANGES[cheapestAsk.exchange.toLowerCase() as keyof typeof EXCHANGES].fee,
              EXCHANGES[highestBid.exchange.toLowerCase() as keyof typeof EXCHANGES].fee
            )
          : { gross: 0, fees: 0, net: 0 }

      return {
        pair,
        ticks,
        buyOn: cheapestAsk?.exchange,
        sellOn: highestBid?.exchange,
        netSpread: Math.max(0, spreadData.net),
        grossSpread: spreadData.gross,
        volume: ticks.reduce((sum, t) => sum + (t.volume24h ?? 0), 0),
        change: ticks[0]?.lastPrice
          ? ((ticks[0].lastPrice -
              (ticks[0].low24h ?? ticks[0].lastPrice)) /
              ticks[0].lastPrice) *
            100
          : 0,
      }
    })
    .sort((a, b) => {
      if (sort === 'spread') return b.netSpread - a.netSpread
      if (sort === 'volume') return b.volume - a.volume
      return Math.abs(b.change) - Math.abs(a.change)
    })
}


export default function MarketsPage() {
  const { prices, loading } = useBotStore()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('spread')
  const [selected, setSelected] = useState('ETH/USDT')

  const rows = useMemo(() => pairRows(prices, search, sort), [prices, search, sort])
  const selectedRow = rows.find((row) => row.pair === selected) ?? rows[0]

  const calculator = useMemo(() => {
    if (!selectedRow || !selectedRow.buyOn || !selectedRow.sellOn) {
      return null
    }

    const buyTick = prices[`${selectedRow.buyOn.toLowerCase()}:${selectedRow.pair}`]
    const sellTick = prices[`${selectedRow.sellOn.toLowerCase()}:${selectedRow.pair}`]

    if (!buyTick || !sellTick) {
      return null
    }

    const spread = calculateNetSpread(
      buyTick.ask,
      sellTick.bid,
      EXCHANGES[selectedRow.buyOn.toLowerCase() as keyof typeof EXCHANGES].fee,
      EXCHANGES[selectedRow.sellOn.toLowerCase() as keyof typeof EXCHANGES].fee,
    )

    return {
      buyTick,
      sellTick,
      spread,
    }
  }, [prices, selectedRow])

  return (
    <div className="space-y-6">
      <PriceComparisonChart pair={selected} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-base pl-8 h-8 text-xs w-44"
            placeholder="Search pair…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-base h-8 text-xs w-36 cursor-pointer">
          <option value="spread">Sort: Best Spread</option>
          <option value="volume">Sort: Volume</option>
          <option value="change">Sort: Change</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Activity className="w-3.5 h-3.5" />
          <span>{loading ? 'Loading prices…' : 'Live price table'}</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="text-xs font-semibold text-slate-300">Price Comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.05)]">
                  {['Pair', 'Binance', 'Kraken', 'KuCoin', 'Best Spread', 'Route', '24h Vol', 'Net Move'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.pair}
                    onClick={() => setSelected(row.pair)}
                    className={cn(
                      'border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-colors table-row-hover',
                      selected === row.pair && 'bg-[rgba(236,189,116,0.05)]',
                    )}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-200">{row.pair}</td>
                    {EXCHANGE_IDS.map((exchange) => {
                      const tick = row.ticks.find((item) => item.exchange.toLowerCase() === exchange)
                      return (
                        <td key={exchange} className="px-4 py-3 font-mono text-slate-300">
                          {tick ? `$${formatPrice(tick.lastPrice)}` : '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3">
                      <span className={cn('font-mono font-semibold', row.netSpread > 0.3 ? 'text-emerald-400' : 'text-slate-400')}>
                        {row.netSpread > 0 ? `+${row.netSpread.toFixed(3)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {row.buyOn && row.sellOn ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span>{row.buyOn.slice(0, 3)}</span>
                          <ArrowRight className="w-3 h-3 text-[var(--accent)]" />
                          <span>{row.sellOn.slice(0, 3)}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {row.volume > 0 ? `${(row.volume / 1000).toFixed(1)}K` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('font-mono flex items-center gap-1', row.change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {row.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(row.change)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {selectedRow ? (
            <>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">{selectedRow.pair} Detail</h3>
                  {selectedRow.netSpread > 0 && <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">Opportunity</span>}
                </div>

                {EXCHANGE_IDS.map((exchange) => {
                  const tick = selectedRow.ticks.find((item) => item.exchange.toLowerCase() === exchange)
                  const exchangeInfo = EXCHANGES[exchange]
                  return (
                    <div key={exchange} className="glass-subtle rounded-xl p-3 mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: exchangeInfo.color }} />
                          <span className="text-xs font-semibold text-slate-300">{exchangeInfo.name}</span>
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
                            <div className="text-slate-200">${formatPrice(tick.lastPrice)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Ask</div>
                            <div className="text-emerald-400">${formatPrice(tick.ask)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">No data yet</div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-200">Arbitrage Calculator</h3>
                  <span className="text-xs text-slate-500">After fees</span>
                </div>
                {calculator ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Buy on {calculator.buyTick.exchange}</span>
                      <span className="font-mono text-slate-200">${formatPrice(calculator.buyTick.ask)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sell on {calculator.sellTick.exchange}</span>
                      <span className="font-mono text-slate-200">${formatPrice(calculator.sellTick.bid)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-3">
                      <span className="text-slate-500">Net spread</span>
                      <span className="font-mono text-emerald-400 font-semibold">{calculator.spread.net.toFixed(3)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">Select a pair with live data to view the calculator.</div>
                )}
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No pair selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
