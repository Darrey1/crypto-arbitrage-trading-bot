'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Save, AlertTriangle, Power, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminConfigPage() {
  const [maintenance, setMaintenance] = useState(false)
  const [config, setConfig] = useState({
    binanceFee: 0.001, krakenFee: 0.002, kucoinFee: 0.001,
    minTradeSize: 10, maxTradeSize: 10000,
    maxDailyTradesGlobal: 500, rateLimit: 60,
    enabledPairs: ['ETH/USDT', 'BTC/USDT', 'ETH/BTC'],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">System Configuration</h1>
        <button onClick={() => toast.success('Config saved')}
          className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save All
        </button>
      </div>

      {/* Maintenance Mode */}
      <div className={cn('glass rounded-2xl p-5 border', maintenance ? 'border-red-500/40 bg-red-500/5' : 'border-[rgba(124,58,237,0.18)]')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              maintenance ? 'bg-red-500/20' : 'glass-subtle')}>
              <Power className={cn('w-5 h-5', maintenance ? 'text-red-400' : 'text-slate-400')} />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Maintenance Mode</div>
              <div className="text-xs text-slate-500">Shows maintenance page to all non-admin users</div>
            </div>
          </div>
          <button
            onClick={() => { setMaintenance(!maintenance); toast(maintenance ? 'Maintenance mode disabled' : 'Maintenance mode ENABLED') }}
            className={cn('relative w-12 h-6 rounded-full transition-all duration-200',
              maintenance ? 'bg-red-600' : 'bg-slate-700')}>
            <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
              maintenance ? 'translate-x-7' : 'translate-x-1')} />
          </button>
        </div>
        {maintenance && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Platform is in maintenance mode — all users see a maintenance page
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Exchange Fees */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Exchange Fee Configuration</h3>
          <div className="space-y-3">
            {[
              { key: 'binanceFee', label: 'Binance Maker/Taker Fee', color: '#F0B90B' },
              { key: 'krakenFee',  label: 'Kraken Maker/Taker Fee',  color: '#5741D9' },
              { key: 'kucoinFee',  label: 'KuCoin Maker/Taker Fee',  color: '#24AE8F' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" step={0.0001} min={0} max={0.01}
                    value={config[key as keyof typeof config] as number}
                    onChange={e => setConfig(c => ({ ...c, [key]: Number(e.target.value) }))}
                    className="input-base text-xs flex-1" />
                  <span className="text-xs text-slate-500 font-mono">
                    {((config[key as keyof typeof config] as number) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Limits */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Global Trade Limits</h3>
          <div className="space-y-3">
            {[
              { key: 'minTradeSize', label: 'Minimum Trade Size (USDT)', min: 1 },
              { key: 'maxTradeSize', label: 'Maximum Trade Size (USDT)', min: 100 },
              { key: 'maxDailyTradesGlobal', label: 'Max Daily Trades (per user)', min: 1 },
              { key: 'rateLimit', label: 'API Rate Limit (req/min)', min: 10 },
            ].map(({ key, label, min }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 mb-1.5 block">{label}</label>
                <input type="number" min={min}
                  value={config[key as keyof typeof config] as number}
                  onChange={e => setConfig(c => ({ ...c, [key]: Number(e.target.value) }))}
                  className="input-base text-xs" />
              </div>
            ))}
          </div>
        </div>

        {/* Enabled Pairs */}
        <div className="glass rounded-2xl p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Supported Trading Pairs</h3>
          <div className="flex flex-wrap gap-3">
            {['ETH/USDT', 'BTC/USDT', 'ETH/BTC', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'].map(pair => {
              const enabled = config.enabledPairs.includes(pair)
              return (
                <button key={pair}
                  onClick={() => setConfig(c => ({
                    ...c,
                    enabledPairs: enabled
                      ? c.enabledPairs.filter(p => p !== pair)
                      : [...c.enabledPairs, pair]
                  }))}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all',
                    enabled
                      ? 'gradient-bg text-white'
                      : 'glass-subtle text-slate-500 hover:text-slate-300'
                  )}>
                  {pair}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-600 mt-3">Disabled pairs will not be scanned by any bot</p>
        </div>
      </div>
    </div>
  )
}
