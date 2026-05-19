'use client'

import { useState } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { cn, EXCHANGES } from '@/lib/utils'
import { ExchangeId, TradingMode, ExecutionMode } from '@/types'
import {
  Play, Square, Pause, AlertTriangle, Bot, Zap,
  Settings, Terminal, Trash2, Download, FlaskConical,
  CheckCircle2, XCircle, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

const LOG_COLORS = {
  INFO:    'text-slate-400',
  WARN:    'text-amber-400',
  ERROR:   'text-red-400',
  SUCCESS: 'text-emerald-400',
}
const LOG_BG = {
  INFO:    '',
  WARN:    'bg-amber-500/5',
  ERROR:   'bg-red-500/5',
  SUCCESS: 'bg-emerald-500/5',
}

export default function BotPage() {
  const {
    botState, config, logs, opportunities, paperBalance,
    startBot, stopBot, pauseBot, updateConfig, clearLogs, setTradingMode
  } = useBotStore()
  const [showEmergency, setShowEmergency] = useState(false)
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'>('ALL')

  const activeOpps = opportunities.filter(o => o.status === 'active')
  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter(l => l.level === logFilter)

  function handleEmergencyStop() {
    stopBot()
    setShowEmergency(false)
    toast.error('Emergency stop activated', { description: 'All bot activity halted.' })
  }

  const statusConfig = {
    running: { label: 'Running',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    idle:    { label: 'Idle',     color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   dot: 'bg-slate-500'  },
    paused:  { label: 'Paused',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400'  },
    error:   { label: 'Error',    color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400'    },
    stopped: { label: 'Stopped',  color: 'text-slate-500',   bg: 'bg-slate-800',      border: 'border-slate-700',      dot: 'bg-slate-600'  },
  }
  const sc = statusConfig[botState.status]

  return (
    <div className="space-y-6">
      {/* Emergency stop modal */}
      {showEmergency && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Emergency Stop</h3>
                <p className="text-xs text-slate-400">This will halt all bot activity immediately</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-5">
              All active scanning and pending orders will be cancelled. No new trades will be placed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEmergency(false)} className="btn-ghost flex-1 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={handleEmergencyStop} className="btn-danger flex-1 py-2 rounded-lg text-sm font-semibold">
                Stop All Activity
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Bot Control Panel */}
        <div className="xl:col-span-1 space-y-4">
          {/* Status + Controls */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-200">Bot Control</h3>
              <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border', sc.bg, sc.border, sc.color)}>
                <div className={cn('w-1.5 h-1.5 rounded-full', sc.dot,
                  botState.status === 'running' && 'animate-pulse-dot')} />
                {sc.label}
              </div>
            </div>

            {/* Radar animation when running */}
            {botState.status === 'running' && (
              <div className="relative w-24 h-24 mx-auto mb-5">
                <div className="radar-ring w-full h-full absolute inset-0" />
                <div className="radar-ring w-3/4 h-3/4 absolute top-[12.5%] left-[12.5%]" />
                <div className="radar-ring w-1/2 h-1/2 absolute top-1/4 left-1/4" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center glow-purple">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            )}

            {botState.status !== 'running' && (
              <div className="flex items-center justify-center py-4 mb-3">
                <div className="w-16 h-16 rounded-full glass-subtle flex items-center justify-center">
                  <Bot className="w-8 h-8 text-slate-600" />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Opps Found', value: botState.opportunitiesDetected },
                { label: 'Executed', value: botState.tradesExecuted },
                { label: "Today's P&L", value: `$${botState.totalProfitToday.toFixed(2)}`, green: true },
                { label: 'Win Rate', value: botState.winRate > 0 ? `${botState.winRate.toFixed(1)}%` : '—' },
              ].map(({ label, value, green }) => (
                <div key={label} className="glass-subtle rounded-xl p-3 text-center">
                  <div className={cn('text-base font-mono font-bold', green ? 'text-emerald-400' : 'text-slate-200')}>
                    {value}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Control buttons */}
            <div className="space-y-2">
              {botState.status !== 'running' ? (
                <button onClick={startBot}
                  className="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Bot
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={pauseBot}
                    className="btn-ghost flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5">
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                  <button onClick={stopBot}
                    className="btn-ghost flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 text-slate-400">
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowEmergency(true)}
                className="btn-danger w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Emergency Stop
              </button>
            </div>
          </div>

          {/* Trading Mode Switch */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Trading Mode</h3>
            <div className="space-y-2">
              {([
                {
                  mode: 'paper' as TradingMode,
                  label: 'Paper Trading',
                  desc: 'Simulated trades with virtual $10,000',
                  icon: FlaskConical,
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10',
                  border: 'border-amber-500/30',
                },
                {
                  mode: 'live' as TradingMode,
                  label: 'Live Trading',
                  desc: 'Real trades on connected exchanges',
                  icon: Zap,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10',
                  border: 'border-emerald-500/30',
                },
              ]).map(({ mode, label, desc, icon: Icon, color, bg, border }) => (
                <button
                  key={mode}
                  onClick={() => setTradingMode(mode)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all border',
                    config.tradingMode === mode
                      ? cn(bg, border, 'glow-purple')
                      : 'glass-subtle border-transparent hover:border-slate-600'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-xs font-semibold', config.tradingMode === mode ? color : 'text-slate-300')}>
                      {label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
                  </div>
                  {config.tradingMode === mode && (
                    <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', color)} />
                  )}
                </button>
              ))}
            </div>

            {config.tradingMode === 'paper' && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs">
                <span className="text-amber-400/70">Virtual balance: </span>
                <span className="font-mono font-semibold text-amber-400">${paperBalance.toFixed(2)}</span>
              </div>
            )}
            {config.tradingMode === 'live' && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15 text-xs text-red-400/80">
                ⚠ Real funds at risk. Ensure API keys are configured.
              </div>
            )}
          </div>
        </div>

        {/* Strategy Config */}
        <div className="xl:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-200">Strategy Configuration</h3>
            </div>

            <div className="space-y-4">
              {/* Symbol */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Trading Pair</label>
                <select
                  value={config.symbol}
                  onChange={e => updateConfig({ symbol: e.target.value })}
                  className="input-base text-xs cursor-pointer"
                >
                  <option>ETH/USDT</option>
                  <option>ETH/BTC</option>
                  <option>BTC/USDT</option>
                </select>
              </div>

              {/* Execution Mode */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Execution Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['automatic', 'manual'] as ExecutionMode[]).map(m => (
                    <button key={m}
                      onClick={() => updateConfig({ executionMode: m })}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-medium transition-all capitalize',
                        config.executionMode === m
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'glass-subtle text-slate-500 hover:text-slate-300'
                      )}>
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {config.executionMode === 'automatic'
                    ? 'Bot executes trades instantly when spread exceeds threshold'
                    : 'Bot alerts you and waits for manual approval before trading'}
                </p>
              </div>

              {/* Min Spread */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Min Spread Threshold</label>
                  <span className="text-xs font-mono text-violet-400">{config.minSpreadThreshold}%</span>
                </div>
                <input type="range" min={0.1} max={2} step={0.05}
                  value={config.minSpreadThreshold}
                  onChange={e => updateConfig({ minSpreadThreshold: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #7C3AED ${config.minSpreadThreshold / 2 * 100}%, rgba(255,255,255,0.1) 0%)` }}
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>0.1%</span><span>2.0%</span>
                </div>
              </div>

              {/* Max Trade Size */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Max Trade Size (USDT)</label>
                <input type="number" min={10} max={10000}
                  value={config.maxTradeSize}
                  onChange={e => updateConfig({ maxTradeSize: Number(e.target.value) })}
                  className="input-base text-xs" />
              </div>

              {/* Max Daily Trades */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Max Daily Trades</label>
                <input type="number" min={1} max={500}
                  value={config.maxDailyTrades}
                  onChange={e => updateConfig({ maxDailyTrades: Number(e.target.value) })}
                  className="input-base text-xs" />
              </div>

              {/* Slippage */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Slippage Tolerance</label>
                  <span className="text-xs font-mono text-violet-400">{config.slippageTolerance}%</span>
                </div>
                <input type="range" min={0.05} max={1} step={0.05}
                  value={config.slippageTolerance}
                  onChange={e => updateConfig({ slippageTolerance: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #7C3AED ${config.slippageTolerance * 100}%, rgba(255,255,255,0.1) 0%)` }}
                />
              </div>

              {/* Daily Loss Limit */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Daily Loss Limit (USDT)</label>
                <input type="number" min={10}
                  value={config.dailyLossLimit}
                  onChange={e => updateConfig({ dailyLossLimit: Number(e.target.value) })}
                  className="input-base text-xs" />
                <p className="text-[10px] text-slate-600 mt-1">Bot auto-stops if daily loss exceeds this</p>
              </div>

              <button className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Active Opportunities + Logs */}
        <div className="xl:col-span-1 space-y-4">
          {/* Active Opportunities */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Active Opportunities</h3>
              <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full',
                activeOpps.length > 0 ? 'badge-purple' : 'badge-muted'
              )}>
                {activeOpps.length}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeOpps.length === 0 ? (
                <div className="py-8 text-center">
                  <Bot className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">
                    {botState.status === 'running' ? 'No opportunities above threshold' : 'Start bot to scan'}
                  </p>
                </div>
              ) : activeOpps.map(opp => (
                <div key={opp.id} className="glass-subtle rounded-xl p-3 border-l-2 border-violet-500">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold text-slate-200">{opp.symbol}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{opp.netSpread.toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mb-1.5">
                    <span className="text-slate-400 capitalize">{opp.buyExchange}</span>
                    <ArrowRight className="w-3 h-3 text-violet-400" />
                    <span className="text-slate-400 capitalize">{opp.sellExchange}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">+${opp.estimatedProfit.toFixed(2)} est.</span>
                    {config.executionMode === 'manual' && (
                      <button onClick={() => {
                        useBotStore.getState().executeOpportunity(opp.id)
                        toast.success(`Trade executed: +$${opp.estimatedProfit.toFixed(2)}`)
                      }} className="btn-primary text-[10px] px-2 py-1 rounded-md">
                        Execute
                      </button>
                    )}
                    {config.executionMode === 'automatic' && (
                      <span className="badge-cyan text-[10px] px-1.5 py-0.5 rounded-full">Auto</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bot Logs */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-200">Bot Logs</h3>
              </div>
              <div className="flex items-center gap-2">
                <select value={logFilter} onChange={e => setLogFilter(e.target.value as typeof logFilter)}
                  className="input-base text-[10px] h-6 py-0 px-2 cursor-pointer w-24">
                  {['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'].map(l => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <button onClick={clearLogs} className="w-6 h-6 rounded-md glass-subtle text-slate-500 hover:text-slate-300 flex items-center justify-center">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="font-mono text-[11px] space-y-0.5 max-h-64 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-600">No logs yet</div>
              ) : filteredLogs.slice(0, 100).map(log => (
                <div key={log.id} className={cn('px-2 py-1 rounded flex items-start gap-2', LOG_BG[log.level])}>
                  <span className="text-slate-600 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                  </span>
                  <span className={cn('flex-shrink-0 font-bold', LOG_COLORS[log.level])}>[{log.level}]</span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
