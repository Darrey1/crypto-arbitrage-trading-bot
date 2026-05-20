'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square, FlaskConical, Settings, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { useBotStore } from '@/store/useBotStore'
import { cn, formatCurrency } from '@/lib/utils'
import type { BotConfig } from '@/api/types'

const LOG_LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const

type LogFilter = typeof LOG_LEVELS[number]

const STATUS_STYLES: Record<string, { label: string; tone: string; bg: string }> = {
  IDLE: { label: 'Idle', tone: 'text-slate-400', bg: 'bg-slate-500/10' },
  RUNNING: { label: 'Running', tone: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PAUSED: { label: 'Paused', tone: 'text-amber-400', bg: 'bg-amber-500/10' },
  STOPPED: { label: 'Stopped', tone: 'text-slate-500', bg: 'bg-slate-700/10' },
  ERROR: { label: 'Error', tone: 'text-red-400', bg: 'bg-red-500/10' },
}

export default function BotPage() {
  const { botState, config, logs, opportunities, prices, loading, error, startBot, stopBot, pauseBot, updateConfig } = useBotStore()
  const [logFilter, setLogFilter] = useState<LogFilter>('ALL')
  const [activeAction, setActiveAction] = useState<'start' | 'pause' | 'stop' | 'mode' | 'pair' | 'config' | null>(null)
  const [draftConfig, setDraftConfig] = useState<BotConfig | null>(config)
  const [configSaving, setConfigSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingConfigRef = useRef<Partial<BotConfig>>({})
  const displayConfig = configSaving ? draftConfig : config
  const filteredLogs = useMemo(() => (logFilter === 'ALL' ? logs : logs.filter((log) => log.level === logFilter)), [logFilter, logs])
  const activeOpps = opportunities.slice(0, 6)
  const status = STATUS_STYLES[botState?.status ?? 'IDLE'] ?? STATUS_STYLES.IDLE
  const availablePairs = useMemo(() => {
    const pairs = new Set(Object.values(prices).map((price) => price.pair))
    if (config?.tradingPair) pairs.add(config.tradingPair)
    return Array.from(pairs).sort((left, right) => left.localeCompare(right))
  }, [config, prices])

  async function handleAction(action: () => Promise<void>, message: string) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    }
  }

  async function runAction(action: 'start' | 'pause' | 'stop' | 'mode', callback: () => Promise<void>, successMessage: string) {
    setActiveAction(action)
    try {
      await handleAction(callback, successMessage)
    } finally {
      setActiveAction((current) => (current === action ? null : current))
    }
  }

  async function handlePairChange(value: string) {
    if (!displayConfig) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    pendingConfigRef.current = {}

    setActiveAction('pair')
    setConfigSaving(true)
    try {
      await updateConfig({ tradingPair: value })
      setDraftConfig((current) => (current ? { ...current, tradingPair: value } : current))
      toast.success('Trading pair updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setConfigSaving(false)
      setActiveAction((current) => (current === 'pair' ? null : current))
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  function queueConfigSave(partial: Partial<BotConfig>) {
    if (!displayConfig) return

    setDraftConfig((current) => (current ? { ...current, ...partial } : current))
    pendingConfigRef.current = { ...pendingConfigRef.current, ...partial }
    setActiveAction('config')
    setConfigSaving(true)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      const payload = pendingConfigRef.current
      pendingConfigRef.current = {}

      try {
        await updateConfig(payload)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save configuration')
      } finally {
        setConfigSaving(false)
        setActiveAction((current) => (current === 'config' ? null : current))
      }
    }, 450)
  }

  async function handleModeChange(mode: 'PAPER' | 'LIVE') {
    if (!displayConfig) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    pendingConfigRef.current = {}

    setActiveAction('mode')
    setConfigSaving(true)
    try {
      await updateConfig({ executionMode: mode })
      setDraftConfig((current) => (current ? { ...current, executionMode: mode } : current))
      toast.success(`${mode.toLowerCase()} mode enabled`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setConfigSaving(false)
      setActiveAction((current) => (current === 'mode' ? null : current))
    }
  }

  function handleNumericConfigChange<K extends keyof BotConfig>(key: K, raw: string) {
    if (!displayConfig) return
    if (raw.trim() === '') return

    const value = Number(raw)
    if (!Number.isFinite(value)) return

    queueConfigSave({ [key]: value } as Partial<BotConfig>)
  }

  if (!botState || !config || !displayConfig) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20">
            {error}
          </div>
        )}
        <div className="glass rounded-2xl p-6 text-sm text-slate-400">Loading bot state from backend...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-200">Bot Control</h3>
              <span className={cn('text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2', status.tone, status.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', botState.status === 'RUNNING' ? 'bg-emerald-400 animate-pulse-dot' : 'bg-current')} />
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Opportunities', value: botState.totalOpportunities },
                { label: 'Trades', value: botState.totalTrades },
                { label: 'Today PnL', value: formatCurrency(botState.todayPnl), tone: botState.todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Win Rate', value: `${botState.winRate.toFixed(1)}%` },
              ].map((item) => (
                <div key={item.label} className="glass-subtle rounded-xl p-3 text-center">
                  <div className={cn('text-base font-mono font-bold', item.tone ?? 'text-slate-200')}>{item.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {botState.status !== 'RUNNING' ? (
                <button onClick={() => runAction('start', startBot, 'Bot started')} className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2" disabled={loading || configSaving || activeAction !== null}>
                  {activeAction === 'start' ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                  {activeAction === 'start' ? 'Starting...' : 'Start Bot'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => runAction('pause', pauseBot, 'Bot paused')} className="btn-ghost flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5" disabled={loading || configSaving || activeAction !== null}>
                    {activeAction === 'pause' ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Pause className="w-4 h-4" />}
                    {activeAction === 'pause' ? 'Pausing...' : 'Pause'}
                  </button>
                  <button onClick={() => runAction('stop', stopBot, 'Bot stopped')} className="btn-ghost flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5" disabled={loading || configSaving || activeAction !== null}>
                    {activeAction === 'stop' ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Square className="w-4 h-4" />}
                    {activeAction === 'stop' ? 'Stopping...' : 'Stop'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Execution Mode</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['PAPER', 'LIVE'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={loading || configSaving || activeAction !== null}
                  className={cn(
                    'py-2.5 rounded-lg text-xs font-medium transition-all capitalize',
                    displayConfig.executionMode === mode ? 'bg-[rgba(236,189,116,0.15)] text-[var(--accent)] border border-[rgba(236,189,116,0.25)]' : 'glass-subtle text-slate-500 hover:text-slate-300',
                  )}
                >
                  {activeAction === 'mode' ? 'Saving...' : mode.toLowerCase()}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">The execution mode controls whether the bot uses simulated or live routes.</p>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-slate-200">Strategy Configuration</h3>
              {configSaving && (
                <span className="ml-auto text-[11px] text-[var(--accent)] flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                  Saving...
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Trading Pair</label>
                <select
                  value={displayConfig.tradingPair}
                  onChange={(e) => handlePairChange(e.target.value)}
                  className="input-base text-xs cursor-pointer"
                  disabled={loading || configSaving || activeAction === 'pair'}
                >
                  {availablePairs.length > 0 ? (
                    availablePairs.map((pair) => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))
                  ) : (
                    <option value={displayConfig.tradingPair}>{displayConfig.tradingPair}</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">Pairs are populated from the backend price stream.</p>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Min Spread Threshold</label>
                  <span className="text-xs font-mono text-[var(--accent)]">{displayConfig.minSpreadThreshold}%</span>
                </div>
                <input type="range" min={0.1} max={2} step={0.05} value={displayConfig.minSpreadThreshold} onChange={(e) => queueConfigSave({ minSpreadThreshold: Number(e.target.value) })} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" disabled={loading || activeAction === 'pair' || activeAction === 'mode'} style={{ background: `linear-gradient(to right, #ECBD74 ${Math.round((displayConfig.minSpreadThreshold / 2) * 100)}%, rgba(255,255,255,0.1) 0%)` }} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Max Trade Size</label>
                <input type="number" min={10} value={displayConfig.maxTradeSize} onChange={(e) => handleNumericConfigChange('maxTradeSize', e.target.value)} className="input-base text-xs" disabled={loading || activeAction === 'pair' || activeAction === 'mode'} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Max Daily Trades</label>
                <input type="number" min={1} value={displayConfig.maxDailyTrades} onChange={(e) => handleNumericConfigChange('maxDailyTrades', e.target.value)} className="input-base text-xs" disabled={loading || activeAction === 'pair' || activeAction === 'mode'} />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Slippage Tolerance</label>
                  <span className="text-xs font-mono text-[var(--accent)]">{displayConfig.slippageTolerance}%</span>
                </div>
                <input type="range" min={0.05} max={1} step={0.05} value={displayConfig.slippageTolerance} onChange={(e) => queueConfigSave({ slippageTolerance: Number(e.target.value) })} className="w-full h-1.5 rounded-full appearance-none cursor-pointer" disabled={loading || activeAction === 'pair' || activeAction === 'mode'} style={{ background: `linear-gradient(to right, #ECBD74 ${Math.round((displayConfig.slippageTolerance / 1) * 100)}%, rgba(255,255,255,0.1) 0%)` }} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Daily Loss Limit</label>
                <input type="number" min={10} value={displayConfig.dailyLossLimit} onChange={(e) => handleNumericConfigChange('dailyLossLimit', e.target.value)} className="input-base text-xs" disabled={loading || activeAction === 'pair' || activeAction === 'mode'} />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Live Opportunities</h3>
                <p className="text-xs text-slate-500 mt-0.5">Newest first</p>
              </div>
              <span className="badge-purple text-[10px] px-2 py-0.5 rounded-full">{activeOpps.length}</span>
            </div>
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              {activeOpps.length === 0 ? (
                <div className="text-xs text-slate-500">No opportunities yet.</div>
              ) : activeOpps.map((opp) => (
                <div key={opp.id} className="glass-subtle rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
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
        </div>

        <div className="xl:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-slate-200">Live Logs</h3>
            </div>
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {LOG_LEVELS.map((level) => (
                <button key={level} onClick={() => setLogFilter(level)} className={cn('text-[10px] px-2 py-0.5 rounded-full transition-all', logFilter === level ? 'badge-purple' : 'badge-muted')}>
                  {level}
                </button>
              ))}
            </div>
            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <div className="text-xs text-slate-500">No logs available.</div>
              ) : filteredLogs.map((log) => (
                <div key={log.id} className="glass-subtle rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={cn('font-semibold', log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : log.level === 'INFO' ? 'text-slate-200' : 'text-slate-500')}>
                        {log.level}
                      </div>
                      <div className="text-slate-400 mt-0.5 break-words">{log.message}</div>
                    </div>
                    <span className="text-[10px] text-slate-600">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
