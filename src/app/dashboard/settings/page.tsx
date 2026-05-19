'use client'

import { useState } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { ExchangeId } from '@/types'
import { cn, EXCHANGES } from '@/lib/utils'
import {
  Key, Bell, Shield, User, Palette, Eye, EyeOff,
  CheckCircle2, XCircle, RefreshCw, Trash2, Save, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

type SettingsTab = 'api' | 'notifications' | 'risk' | 'profile' | 'appearance'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'risk', label: 'Risk Management', icon: Shield },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const EXCHANGE_IDS: ExchangeId[] = ['binance', 'kraken', 'kucoin']

function ApiKeySection() {
  const [keys, setKeys] = useState<Record<ExchangeId, { key: string; secret: string; show: boolean; testing: boolean; status: 'none' | 'valid' | 'invalid' }>>({
    binance: { key: '', secret: '', show: false, testing: false, status: 'none' },
    kraken:  { key: '', secret: '', show: false, testing: false, status: 'none' },
    kucoin:  { key: '', secret: '', show: false, testing: false, status: 'none' },
  })

  async function testConnection(ex: ExchangeId) {
    setKeys(k => ({ ...k, [ex]: { ...k[ex], testing: true } }))
    await new Promise(r => setTimeout(r, 1500))
    const valid = keys[ex].key.length > 5 && keys[ex].secret.length > 5
    setKeys(k => ({ ...k, [ex]: { ...k[ex], testing: false, status: valid ? 'valid' : 'invalid' } }))
    if (valid) toast.success(`${EXCHANGES[ex].name} connected successfully`)
    else toast.error(`${EXCHANGES[ex].name} — invalid credentials`)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Add Read + Trade permissions only. <strong className="text-amber-400">Never enable Withdrawal</strong> permissions on API keys used for the bot.
      </p>

      {EXCHANGE_IDS.map(ex => {
        const k = keys[ex]
        const exInfo = EXCHANGES[ex]
        return (
          <div key={ex} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                style={{ background: `${exInfo.color}15`, border: `1px solid ${exInfo.color}30`, color: exInfo.color }}>
                {exInfo.name[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-200 text-sm">{exInfo.name}</div>
                <div className="text-[11px] text-slate-500">Fee: {(exInfo.fee * 100).toFixed(2)}% maker/taker</div>
              </div>
              {k.status === 'valid' && <div className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Connected</div>}
              {k.status === 'invalid' && <div className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" />Invalid</div>}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">API Key</label>
                <input
                  type={k.show ? 'text' : 'password'}
                  value={k.key}
                  onChange={e => setKeys(prev => ({ ...prev, [ex]: { ...prev[ex], key: e.target.value, status: 'none' } }))}
                  className="input-base text-xs font-mono"
                  placeholder="Enter API key…"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Secret Key</label>
                <div className="relative">
                  <input
                    type={k.show ? 'text' : 'password'}
                    value={k.secret}
                    onChange={e => setKeys(prev => ({ ...prev, [ex]: { ...prev[ex], secret: e.target.value, status: 'none' } }))}
                    className="input-base text-xs font-mono pr-8"
                    placeholder="Enter secret key…"
                  />
                  <button
                    onClick={() => setKeys(prev => ({ ...prev, [ex]: { ...prev[ex], show: !k.show } }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {k.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 text-[11px] text-slate-500">
                  {['Read', 'Trade'].map(p => (
                    <span key={p} className="badge-success text-[10px] px-1.5 py-0.5 rounded-full">{p} ✓</span>
                  ))}
                  <span className="badge-danger text-[10px] px-1.5 py-0.5 rounded-full">Withdraw ✗</span>
                </div>
                <button
                  onClick={() => testConnection(ex)}
                  disabled={k.testing || !k.key || !k.secret}
                  className={cn('btn-ghost text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-40',
                    k.status === 'valid' && 'text-emerald-400'
                  )}>
                  <RefreshCw className={cn('w-3 h-3', k.testing && 'animate-spin')} />
                  {k.testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button
                  onClick={() => setKeys(prev => ({ ...prev, [ex]: { ...prev[ex], key: '', secret: '', status: 'none' } }))}
                  className="btn-danger text-xs px-2 py-1.5 rounded-lg">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NotificationsSection() {
  const [settings, setSettings] = useState({
    oppDetected: true, tradeExecuted: true, tradeFailed: true, botStopped: true, dailySummary: false,
    minProfit: 2, emailEnabled: false,
  })

  const toggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean')
      setSettings(s => ({ ...s, [key]: !s[key as keyof typeof settings] }))
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">In-App Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'oppDetected', label: 'Opportunity Detected', desc: 'Alert when spread exceeds threshold' },
            { key: 'tradeExecuted', label: 'Trade Executed', desc: 'Confirmation after each trade' },
            { key: 'tradeFailed', label: 'Trade Failed', desc: 'Alert on execution errors' },
            { key: 'botStopped', label: 'Bot Stopped', desc: 'Alert when bot halts unexpectedly' },
            { key: 'dailySummary', label: 'Daily Summary', desc: 'End-of-day P&L report' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.05)] last:border-0">
              <div>
                <div className="text-xs font-medium text-slate-200">{label}</div>
                <div className="text-[11px] text-slate-500">{desc}</div>
              </div>
              <button
                onClick={() => toggle(key as keyof typeof settings)}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0',
                  settings[key as keyof typeof settings] ? 'bg-violet-600' : 'bg-slate-700'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  settings[key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Notification Threshold</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-1.5 block">Min Profit to Notify ($)</label>
            <input type="number" min={0} value={settings.minProfit}
              onChange={e => setSettings(s => ({ ...s, minProfit: Number(e.target.value) }))}
              className="input-base text-xs" />
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mt-2">Only notify for trades with profit above this threshold</p>
      </div>
    </div>
  )
}

function RiskSection() {
  const { config, updateConfig } = useBotStore()

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Risk Management Settings</h3>
      </div>

      {[
        { label: 'Daily Loss Limit (USDT)', key: 'dailyLossLimit', desc: 'Bot auto-stops when daily loss hits this', min: 10 },
        { label: 'Max Trade Size (USDT)', key: 'maxTradeSize', desc: 'Maximum USDT per single arbitrage trade', min: 10 },
        { label: 'Max Daily Trades', key: 'maxDailyTrades', desc: 'Maximum number of trades per day', min: 1 },
        { label: 'Trade Cooldown (seconds)', key: 'cooldownSeconds', desc: 'Wait time between consecutive trades', min: 1 },
      ].map(({ label, key, desc, min }) => (
        <div key={key}>
          <label className="text-xs font-medium text-slate-300 mb-1.5 block">{label}</label>
          <input type="number" min={min}
            value={config[key as keyof typeof config] as number}
            onChange={e => updateConfig({ [key]: Number(e.target.value) })}
            className="input-base text-xs" />
          <p className="text-[11px] text-slate-500 mt-1">{desc}</p>
        </div>
      ))}

      <button onClick={() => toast.success('Risk settings saved')}
        className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
        <Save className="w-4 h-4" />
        Save Risk Settings
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('api')

  return (
    <div className="grid xl:grid-cols-4 gap-6">
      {/* Sidebar Tabs */}
      <div className="xl:col-span-1">
        <div className="glass rounded-2xl p-2 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                tab === id
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="xl:col-span-3">
        {tab === 'api' && <ApiKeySection />}
        {tab === 'notifications' && <NotificationsSection />}
        {tab === 'risk' && <RiskSection />}
        {tab === 'profile' && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">Profile</h3>
            {[
              { label: 'Full Name', placeholder: 'Trader', type: 'text' },
              { label: 'Email', placeholder: 'trader@arbmatrix.io', type: 'email' },
              { label: 'New Password', placeholder: '••••••••', type: 'password' },
              { label: 'Confirm Password', placeholder: '••••••••', type: 'password' },
            ].map(({ label, placeholder, type }) => (
              <div key={label}>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">{label}</label>
                <input type={type} placeholder={placeholder} className="input-base text-xs" />
              </div>
            ))}
            <button onClick={() => toast.success('Profile updated')}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
        {tab === 'appearance' && (
          <div className="glass rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-200">Appearance</h3>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-3 block">Accent Color</label>
              <div className="flex gap-3">
                {[
                  { label: 'Purple', color: '#7C3AED' },
                  { label: 'Cyan', color: '#06B6D4' },
                  { label: 'Green', color: '#10B981' },
                ].map(({ label, color }) => (
                  <button key={label} className="flex flex-col items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl border-2 border-transparent group-hover:border-white/20 transition-all"
                      style={{ background: color }} />
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs font-medium text-slate-300">Dark Mode</div>
                <div className="text-[11px] text-slate-500">Always dark — optimized for trading</div>
              </div>
              <div className="px-3 py-1 rounded-lg bg-violet-500/15 text-violet-400 text-xs border border-violet-500/25">Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
