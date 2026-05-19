'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Terminal, RefreshCw, Download, Trash2 } from 'lucide-react'

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

interface SystemLog {
  id: number; level: Level; service: string; message: string; timestamp: string
}

const SERVICES = ['bot-engine', 'price-feed', 'api-gateway', 'auth', 'db', 'scheduler']

function genLogs(count = 80): SystemLog[] {
  const levels: Level[] = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG']
  const msgs = {
    INFO:  ['Price tick received ETH/USDT', 'Trade executed successfully', 'User session started', 'Bot started for user#142', 'WebSocket connected', 'Config saved'],
    WARN:  ['High latency on Kraken API: 420ms', 'Rate limit approaching: 80%', 'Slippage exceeded threshold 0.15%', 'Retrying failed request'],
    ERROR: ['Kraken connection timeout', 'Order placement failed: insufficient balance', 'Redis connection lost — reconnecting', 'JWT verification failed'],
    DEBUG: ['Scanning ETH/USDT spreads…', 'Cache hit for price#binance', 'Worker heartbeat OK', 'Queue depth: 3 jobs'],
  }
  return Array.from({ length: count }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)]
    return {
      id: count - i,
      level,
      service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
      message: msgs[level][Math.floor(Math.random() * msgs[level].length)],
      timestamp: new Date(Date.now() - i * 12000 - Math.random() * 8000).toISOString(),
    }
  })
}

const LOG_STYLE: Record<Level, string> = {
  INFO:  'text-slate-300',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-slate-600',
}
const LEVEL_BADGE: Record<Level, string> = {
  INFO:  'badge-muted',
  WARN:  'badge-warning',
  ERROR: 'badge-danger',
  DEBUG: '',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>(() => genLogs())
  const [filter, setFilter] = useState<'ALL' | Level>('ALL')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [serviceFilter, setServiceFilter] = useState('all')

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      const level = (['INFO', 'INFO', 'WARN', 'ERROR'] as Level[])[Math.floor(Math.random() * 4)]
      const msgs = { INFO: 'Opportunity detected: ETH/USDT 0.38%', WARN: 'Spread dropped below threshold', ERROR: 'Exchange timeout — retrying', DEBUG: 'Heartbeat OK' }
      setLogs(prev => [{
        id: prev[0].id + 1, level, service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
        message: msgs[level], timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 200))
    }, 3000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.level !== filter) return false
    if (serviceFilter !== 'all' && l.service !== serviceFilter) return false
    return true
  })

  function downloadLogs() {
    const txt = filtered.map(l => `${l.timestamp} [${l.level}] [${l.service}] ${l.message}`).join('\n')
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'system-logs.txt'; a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-100">System Logs</h1>
        <div className="flex items-center gap-2">
          <button onClick={downloadLogs} className="btn-ghost text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button onClick={() => setLogs([])} className="btn-ghost text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map(l => (
            <button key={l} onClick={() => setFilter(l)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                filter === l ? 'gradient-bg text-white' : 'text-slate-500 hover:text-slate-300'
              )}>
              {l}
            </button>
          ))}
        </div>

        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
          className="input-base h-8 text-xs cursor-pointer w-36">
          <option value="all">All Services</option>
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all',
              autoRefresh ? 'badge-success' : 'btn-ghost'
            )}>
            <RefreshCw className={cn('w-3 h-3', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <span className="text-xs text-slate-500">{filtered.length} entries</span>
        </div>
      </div>

      {/* Log Console */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2 bg-[#080A12]">
          <Terminal className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-mono text-slate-400">system-log-stream</span>
          {autoRefresh && <div className="live-dot ml-1" />}
        </div>
        <div className="font-mono text-[11px] max-h-[calc(100vh-280px)] overflow-y-auto bg-[#060810]">
          {filtered.map(log => (
            <div key={log.id} className={cn(
              'px-4 py-1.5 flex items-start gap-3 border-b border-[rgba(255,255,255,0.02)] hover:bg-white/[0.02] transition-colors',
              log.level === 'ERROR' && 'bg-red-500/3'
            )}>
              <span className="text-slate-700 flex-shrink-0 text-[10px] mt-0.5">
                {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
              </span>
              <span className={cn('text-[10px] font-bold flex-shrink-0 uppercase w-12', LOG_STYLE[log.level])}>
                {log.level}
              </span>
              <span className="text-slate-600 flex-shrink-0 w-20 truncate text-[10px]">[{log.service}]</span>
              <span className={cn('flex-1 break-all', LOG_STYLE[log.level])}>{log.message}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-700">No logs match filter</div>
          )}
        </div>
      </div>
    </div>
  )
}
