'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut, Settings, FlaskConical, Zap, Sun, Moon, Loader } from 'lucide-react'
import { useBotStore } from '@/store/useBotStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { cn, formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

export function Header({ title }: { title?: string }) {
  const router = useRouter()
  const { config, updateConfig, prices, socketConnected, opportunities, trades } = useBotStore()
  const { theme, toggleTheme } = useThemeStore()
  const [loading, setLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState<'PAPER' | 'LIVE' | null>(null)
  const { user, logout } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const selectedPair = config?.tradingPair ?? 'ETH/USDT'
  const executionMode = config?.executionMode ?? 'PAPER'
  const BASE_CURRENCY = selectedPair.split('/')[0]
  const binanceTick = prices[`binance:${selectedPair}`]

  function handleModeSwitch(mode: 'PAPER' | 'LIVE') {
    if (!config) return

    setLoading(true)
    setCurrentMode(mode)
    updateConfig({ executionMode: mode })
      .then(() => {
        toast.success(`Switched to ${mode === 'PAPER' ? 'Paper Trading' : 'Live Trading'} mode`)
      })
      .catch(() => {
        toast.error('Failed to switch trading mode')
      })
      .finally(() => {
        setLoading(false)
        setCurrentMode(null)
      })
  }

  function handleLogout() {
    logout()
    setUserMenuOpen(false)
    toast.success('Signed out')
    router.replace('/auth/login')
  }

  const isSwitching = (mode: 'PAPER' | 'LIVE') =>
  loading && currentMode?.toUpperCase() === mode

  const activeOpportunities = opportunities.length
  const recentTrades = trades.slice(0, 3)

  return (
    <>
      {/* Paper mode banner */}
      {executionMode === 'PAPER' && (
        <div className="paper-mode-banner">
          <FlaskConical className="w-3 h-3 inline-block mr-1.5 -mt-px" />
          PAPER TRADING MODE — Simulated trades only. No real funds at risk.
        </div>
      )}

      <header
        className="h-[60px] flex items-center px-5 gap-3 sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
        }}
      >
        {/* Page title */}
        {title && (
          <h1
            className="text-sm font-semibold mr-2 hidden sm:block"
            style={{ color: 'var(--text-1)' }}
          >
            {title}
          </h1>
        )}

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-2 text-xs mr-1.5">
          <span className={cn('w-2 h-2 rounded-full', socketConnected ? 'bg-emerald-400' : 'bg-amber-400')} />
          <span style={{ color: 'var(--text-3)' }}>{socketConnected ? 'Live' : 'Reconnecting'}</span>
        </div>

        {/* ETH Price Pill */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle text-xs font-mono transition-colors duration-300',
          )}
          style={{ color: 'var(--text-1)' }}
        >
          <div className="live-dot" />
          <span style={{ color: 'var(--text-3)' }}>{BASE_CURRENCY}</span>
          <span className="font-semibold">
            ${binanceTick ? formatPrice(binanceTick.lastPrice) : '--'}
          </span>
        </div>

        {/* Trading Mode Toggle */}
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => handleModeSwitch('PAPER')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200',
              executionMode === 'PAPER'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {isSwitching('PAPER') ? <Loader className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
            <span className="hidden sm:inline">Paper</span>
          </button>
          <button
            onClick={() => handleModeSwitch('LIVE')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200',
              executionMode === 'LIVE'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {isSwitching('LIVE') ? <Loader className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span className="hidden sm:inline">Live</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg glass-subtle flex items-center justify-center transition-all"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="w-3.5 h-3.5" />
            : <Moon className="w-3.5 h-3.5" />
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
            className="relative w-8 h-8 rounded-lg glass-subtle flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <Bell className="w-3.5 h-3.5" />
            {activeOpportunities > 0 && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-72 glass rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  Notifications
                </span>
                <span className="badge-purple text-[10px] px-1.5 py-0.5 rounded-full">
                  {activeOpportunities}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                {recentTrades.length === 0 ? (
                  <div className="text-xs text-center py-6" style={{ color: 'var(--text-3)' }}>
                    No recent trades yet.
                  </div>
                ) : recentTrades.map((trade) => (
                  <div key={trade.id} className="glass-subtle rounded-lg p-3">
                    <div className="text-xs font-medium text-emerald-400">
                      Trade Executed
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                      {trade.pair} {trade.route}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                      {trade.netProfit >= 0 ? '+' : ''}${trade.netProfit.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg glass-subtle transition-all"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <div
              className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-[#070707] text-xs font-bold"
            >
              {(user?.email?.[0] ?? 'T').toUpperCase()}
            </div>
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-2)' }}>
              {user?.email ?? 'Trader'}
            </span>
            <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-3)' }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-11 w-52 glass rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  {user?.email ?? 'Trader'}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {user?.role ?? 'USER'}
                </div>
              </div>
              <div className="p-2 space-y-0.5">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ color: 'var(--text-2)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-subtle-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Settings className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 transition-colors hover:bg-red-500/8"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
