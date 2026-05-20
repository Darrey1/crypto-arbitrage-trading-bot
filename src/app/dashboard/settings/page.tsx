'use client'

import { useState } from 'react'
import { Shield, User, Palette, Save, AlertTriangle, Wallet, RefreshCw, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useBotStore } from '@/store/useBotStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import type { BotConfig } from '@/api/types'

type SettingsTab = 'wallet' | 'risk' | 'profile' | 'appearance'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'risk', label: 'Risk Management', icon: Shield },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

function WalletSection() {
  const { wallet, rotateWallet } = useBotStore()

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Wallet</h3>
          <p className="text-xs text-slate-500 mt-0.5">Backend public wallet view only</p>
        </div>
        <button onClick={() => rotateWallet().then(() => toast.success('Wallet rotated')).catch(() => toast.error('Rotation failed'))} className="btn-ghost text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Rotate
        </button>
      </div>

      {wallet ? (
        <div className="space-y-3 text-xs">
          <div className="glass-subtle rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Address</div>
            <div className="mt-1 font-mono text-slate-200 break-all">{wallet.address}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-subtle rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Chain ID</div>
              <div className="mt-1 font-mono text-slate-200">{wallet.chainId}</div>
            </div>
            <div className="glass-subtle rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Key Version</div>
              <div className="mt-1 font-mono text-slate-200">{wallet.keyVersion}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500">No wallet configured yet.</div>
      )}
    </div>
  )
}

function RiskSection() {
  const { config, updateConfig } = useBotStore()

  if (!config) {
    return (
      <div className="glass rounded-2xl p-5 text-xs text-slate-500">
        Loading risk settings from backend...
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Risk Management Settings</h3>
      </div>

      {[
        { label: 'Daily Loss Limit', key: 'dailyLossLimit', min: 10 },
        { label: 'Max Trade Size', key: 'maxTradeSize', min: 10 },
        { label: 'Max Daily Trades', key: 'maxDailyTrades', min: 1 },
        { label: 'Min Spread Threshold', key: 'minSpreadThreshold', min: 0.1, step: 0.05 },
        { label: 'Slippage Tolerance', key: 'slippageTolerance', min: 0.05, step: 0.05 },
      ].map(({ label, key, min, step }) => (
        <div key={key}>
          <label className="text-xs font-medium text-slate-300 mb-1.5 block">{label}</label>
          <input
            type="number"
            min={min}
            step={step ?? 1}
            value={config[key as keyof typeof config] as number}
            onChange={(e) => updateConfig({ [key]: Number(e.target.value) } as Partial<BotConfig>)}
            className="input-base text-xs"
          />
        </div>
      ))}

      <button onClick={() => toast.success('Risk settings saved')} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
        <Save className="w-4 h-4" />
        Save Risk Settings
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('wallet')
  const { user, logout } = useAuthStore()

  return (
    <div className="grid xl:grid-cols-4 gap-6">
      <div className="xl:col-span-1">
        <div className="glass rounded-2xl p-2 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                tab === id ? 'bg-[rgba(236,189,116,0.12)] text-[var(--accent)] border border-[rgba(236,189,116,0.25)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="xl:col-span-3 space-y-4">
        {tab === 'wallet' && <WalletSection />}
        {tab === 'risk' && <RiskSection />}

        {tab === 'profile' && (
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email ?? 'Signed in user'}</p>
              </div>
              <button onClick={() => { logout(); toast.success('Signed out') }} className="btn-ghost text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 text-red-400">
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-500">
              <div className="glass-subtle rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wider">Role</div>
                <div className="mt-1 text-slate-200">{user?.role ?? 'USER'}</div>
              </div>
              <div className="glass-subtle rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wider">Status</div>
                <div className="mt-1 text-slate-200">{user?.status ?? 'ACTIVE'}</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div className="glass rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-slate-200">Appearance</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs font-medium text-slate-300">Dark Mode</div>
                <div className="text-[11px] text-slate-500">Preserve the trading desk aesthetic</div>
              </div>
              <div className="px-3 py-1 rounded-lg bg-[rgba(236,189,116,0.15)] text-[var(--accent)] text-xs border border-[rgba(236,189,116,0.25)]">Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
