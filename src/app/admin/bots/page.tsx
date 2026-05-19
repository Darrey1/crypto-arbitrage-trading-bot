'use client'

import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Bot, Square, AlertTriangle, Activity } from 'lucide-react'
import { toast } from 'sonner'

const MOCK_BOTS = Array.from({ length: 14 }, (_, i) => ({
  id: `BOT-${String(i + 1).padStart(3, '0')}`,
  userId: `U${String(i + 10).padStart(3, '0')}`,
  userName: `Trader ${i + 1}`,
  status: i % 5 === 3 ? 'paused' : i % 7 === 0 ? 'error' : 'running',
  mode: i % 3 === 0 ? 'live' : 'paper',
  symbol: i % 2 === 0 ? 'ETH/USDT' : 'BTC/USDT',
  exchanges: 'Binance→Kraken',
  tradesToday: Math.floor(Math.random() * 25),
  profitToday: (Math.random() - 0.1) * 120,
  uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
}))

export default function AdminBotsPage() {
  const [bots, setBots] = useState(MOCK_BOTS)
  const [globalKillConfirm, setGlobalKillConfirm] = useState(false)

  const running = bots.filter(b => b.status === 'running').length

  function killBot(id: string) {
    setBots(bs => bs.map(b => b.id === id ? { ...b, status: 'stopped' } : b))
    toast.error(`Bot ${id} stopped`)
  }

  function globalKill() {
    setBots(bs => bs.map(b => ({ ...b, status: 'stopped' })))
    setGlobalKillConfirm(false)
    toast.error('All bots stopped by administrator')
  }

  return (
    <div className="space-y-6">
      {/* Global Kill modal */}
      {globalKillConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border border-red-500/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-white">Global Kill Switch</h3>
            </div>
            <p className="text-sm text-slate-300 mb-5">
              This will immediately stop <strong className="text-red-400">ALL {running} running bots</strong> across the entire platform.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setGlobalKillConfirm(false)} className="btn-ghost flex-1 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={globalKill} className="btn-danger flex-1 py-2 rounded-lg text-sm font-bold">KILL ALL BOTS</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Bot Monitor</h1>
          <p className="text-xs text-slate-500 mt-0.5">{running} bots currently running</p>
        </div>
        <button onClick={() => setGlobalKillConfirm(true)}
          className="btn-danger px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Global Kill Switch
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Running', value: bots.filter(b => b.status === 'running').length, color: 'text-emerald-400' },
          { label: 'Paused / Error', value: bots.filter(b => b.status !== 'running' && b.status !== 'stopped').length, color: 'text-amber-400' },
          { label: 'Stopped', value: bots.filter(b => b.status === 'stopped').length, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center">
            <div className={cn('text-3xl font-mono font-bold', color)}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Bots Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {['Bot ID', 'User', 'Status', 'Mode', 'Pair', 'Route', 'Trades Today', "Today's P&L", 'Uptime', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bots.map(bot => (
                <tr key={bot.id} className="border-b border-[rgba(255,255,255,0.03)] table-row-hover">
                  <td className="px-4 py-3 font-mono text-violet-400 text-[11px]">{bot.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-300">{bot.userName}</div>
                    <div className="text-[10px] text-slate-600">{bot.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {bot.status === 'running' && <div className="live-dot" />}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                        bot.status === 'running' ? 'badge-success' :
                        bot.status === 'error' ? 'badge-danger' :
                        bot.status === 'paused' ? 'badge-warning' : 'badge-muted'
                      )}>
                        {bot.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                      bot.mode === 'live' ? 'badge-success' : 'badge-warning'
                    )}>{bot.mode}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{bot.symbol}</td>
                  <td className="px-4 py-3 text-slate-400">{bot.exchanges}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{bot.tradesToday}</td>
                  <td className={cn('px-4 py-3 font-mono font-semibold', bot.profitToday >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(bot.profitToday)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">{bot.uptime}</td>
                  <td className="px-4 py-3">
                    {bot.status === 'running' && (
                      <button onClick={() => killBot(bot.id)}
                        className="btn-danger text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                        <Square className="w-2.5 h-2.5" />
                        Stop
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
