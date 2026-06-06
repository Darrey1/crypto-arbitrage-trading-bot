'use client'

import { useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Users, Bot, TrendingUp, Activity, Cpu, Database,
  Wifi, DollarSign, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const SYSTEM_HEALTH = {
  cpu: 34,
  memory: 61,
  dbConnections: 12,
  redisLatency: 2.4,
  activeWebSockets: 8,
}

const PLATFORM_STATS = [
  { label: 'Total Users', value: '247', icon: Users, color: 'text-violet-400', change: +12 },
  { label: 'Active Today', value: '38', icon: Activity, color: 'text-cyan-400', change: +5 },
  { label: 'Bots Running', value: '24', icon: Bot, color: 'text-emerald-400', change: +3 },
  { label: 'Total Volume', value: '$2.4M', icon: DollarSign, color: 'text-amber-400', change: +18 },
]

const RECENT_ACTIVITY = [
  { type: 'register', msg: 'New user registered: trader@gmail.com', time: '2m ago', icon: Users, color: 'text-violet-400' },
  { type: 'bot_start', msg: 'Bot started: user#142 — ETH/USDT paper mode', time: '5m ago', icon: Bot, color: 'text-emerald-400' },
  { type: 'trade', msg: 'Trade executed: ETH/USDT OKX→Kraken +$4.82', time: '7m ago', icon: TrendingUp, color: 'text-cyan-400' },
  { type: 'error', msg: 'API error: user#89 Kraken connection timeout', time: '12m ago', icon: AlertTriangle, color: 'text-red-400' },
  { type: 'bot_stop', msg: 'Bot stopped: user#201 — daily limit reached', time: '18m ago', icon: Bot, color: 'text-amber-400' },
  { type: 'register', msg: 'New user registered: arb_pro@mail.com', time: '25m ago', icon: Users, color: 'text-violet-400' },
]

const VOLUME_DATA = Array.from({ length: 14 }, (_, i) => ({
  day: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
  volume: Math.floor(80000 + Math.random() * 120000),
  trades: Math.floor(20 + Math.random() * 60),
}))

function HealthBar({ label, value, max = 100, unit = '%', color = '#7C3AED' }: {
  label: string; value: number; max?: number; unit?: string; color?: string
}) {
  const pct = (value / max) * 100
  const barColor = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : color
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">{value}{unit}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Admin Overview</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {PLATFORM_STATS.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', `${color}/15`)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <span className={cn('text-xs font-mono', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="xl:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-200">Platform Volume — 14 Days</h3>
            <span className="text-xs text-slate-500 font-mono">All users combined</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={VOLUME_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#0D1117', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11 }}
                formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Volume']}
              />
              <Bar dataKey="volume" fill="#7C3AED" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System Health */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-200">System Health</h3>
            <span className="ml-auto badge-success text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Healthy
            </span>
          </div>

          <HealthBar label="CPU Usage" value={SYSTEM_HEALTH.cpu} color="#7C3AED" />
          <HealthBar label="Memory" value={SYSTEM_HEALTH.memory} color="#06B6D4" />
          <HealthBar label="DB Connections" value={SYSTEM_HEALTH.dbConnections} max={50} unit="" color="#10B981" />
          <HealthBar label="Redis Latency" value={SYSTEM_HEALTH.redisLatency} max={10} unit="ms" color="#F59E0B" />

          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Wifi className="w-3.5 h-3.5" />
                Active WebSockets
              </div>
              <span className="font-mono text-emerald-400 font-semibold">{SYSTEM_HEALTH.activeWebSockets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h3 className="text-sm font-semibold text-slate-200">Recent Platform Activity</h3>
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.04)]">
          {RECENT_ACTIVITY.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
              <div className={cn('w-7 h-7 rounded-lg glass-subtle flex items-center justify-center flex-shrink-0', `${item.color}/15`)}>
                <item.icon className={cn('w-3.5 h-3.5', item.color)} />
              </div>
              <span className="text-xs text-slate-300 flex-1">{item.msg}</span>
              <span className="text-[11px] text-slate-600 font-mono flex-shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
