'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, LogOut, Settings, FlaskConical, Zap, Sun, Moon } from 'lucide-react'
import { useBotStore } from '@/store/useBotStore'
import { useThemeStore } from '@/store/useThemeStore'
import { cn, formatPrice } from '@/lib/utils'
import { TradingMode } from '@/types'

export function Header({ title }: { title?: string }) {
  const { config, setTradingMode, prices, botState } = useBotStore()
  const { theme, toggleTheme } = useThemeStore()
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [priceDir, setPriceDir] = useState<'up' | 'down' | 'neutral'>('neutral')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const binanceTick = prices['binance:ETH/USDT']

  useEffect(() => {
    if (!binanceTick) return
    setEthPrice(prev => {
      if (prev !== null) {
        setPriceDir(binanceTick.last > prev ? 'up' : binanceTick.last < prev ? 'down' : 'neutral')
        setTimeout(() => setPriceDir('neutral'), 800)
      }
      return binanceTick.last
    })
  }, [binanceTick?.last])

  function handleModeSwitch(mode: TradingMode) {
    setTradingMode(mode)
  }

  return (
    <>
      {/* Paper mode banner */}
      {config.tradingMode === 'paper' && (
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

        {/* ETH Price Pill */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle text-xs font-mono transition-colors duration-300',
            priceDir === 'up' && 'text-emerald-400',
            priceDir === 'down' && 'text-red-400',
            priceDir === 'neutral' && ''
          )}
          style={priceDir === 'neutral' ? { color: 'var(--text-1)' } : undefined}
        >
          <div className="live-dot" />
          <span style={{ color: 'var(--text-3)' }}>ETH</span>
          <span className="font-semibold">
            ${ethPrice ? formatPrice(ethPrice) : '3,245.50'}
          </span>
        </div>

        {/* Trading Mode Toggle */}
        <div className="flex items-center glass-subtle rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => handleModeSwitch('paper')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200',
              config.tradingMode === 'paper'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <FlaskConical className="w-3 h-3" />
            <span className="hidden sm:inline">Paper</span>
          </button>
          <button
            onClick={() => handleModeSwitch('live')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200',
              config.tradingMode === 'live'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Zap className="w-3 h-3" />
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
            {botState.opportunitiesDetected > 0 && (
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
                  {botState.opportunitiesDetected}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                <div className="glass-subtle rounded-lg p-3 opportunity-flash">
                  <div className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                    Opportunity Detected
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                    ETH/USDT spread 0.42% on Binance→Kraken
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                    Just now
                  </div>
                </div>
                <div className="glass-subtle rounded-lg p-3">
                  <div className="text-xs font-medium text-emerald-400">Trade Executed</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                    Paper trade: +$4.82 profit
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                    2m ago
                  </div>
                </div>
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
              T
            </div>
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-2)' }}>
              Trader
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
                  Trader
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  trader@arbmatrix.io
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
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-red-400 transition-colors hover:bg-red-500/8"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
