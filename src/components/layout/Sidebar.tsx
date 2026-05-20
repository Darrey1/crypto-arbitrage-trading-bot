'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useBotStore } from '@/store/useBotStore'
import {
  LayoutDashboard, TrendingUp, History, PieChart,
  BarChart3, Settings, ChevronLeft, ChevronRight,
  Activity, Cpu
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/dashboard/markets',   label: 'Markets',    icon: TrendingUp },
  { href: '/dashboard/bot',       label: 'Arb Bot',    icon: Cpu },
  { href: '/dashboard/history',   label: 'History',    icon: History },
  { href: '/dashboard/portfolio', label: 'Portfolio',  icon: PieChart },
  { href: '/dashboard/analytics', label: 'Analytics',  icon: BarChart3 },
  { href: '/dashboard/settings',  label: 'Settings',   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { botState, config, socketConnected } = useBotStore()
  const executionMode = config?.executionMode ?? 'PAPER'
  const botStatus = botState?.status ?? 'IDLE'
  const totalTrades = botState?.totalTrades ?? 0

  const statusDot = {
    RUNNING: 'bg-emerald-400 shadow-[0_0_7px_rgba(34,197,94,0.7)]',
    IDLE:    'bg-zinc-500',
    PAUSED:  'bg-amber-400 shadow-[0_0_7px_rgba(245,158,11,0.7)]',
    ERROR:   'bg-red-400 shadow-[0_0_7px_rgba(239,68,68,0.7)]',
    STOPPED: 'bg-zinc-600',
  }[botStatus] ?? 'bg-zinc-500'

  const statusLabel = {
    RUNNING: 'Bot Running',
    IDLE:    'Bot Idle',
    PAUSED:  'Bot Paused',
    ERROR:   'Bot Error',
    STOPPED: 'Bot Stopped',
  }[botStatus] ?? 'Unknown'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[230px]'
      )}
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] px-4 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
         <Link href="/" className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center glow-purple">
            <Activity className="w-3.5 h-3.5 text-[#070707]" strokeWidth={2.5} />
          </div>
        </div>
        </Link>
        {!collapsed && (
          <div>
            <span className="font-bold text-sm gradient-text tracking-tight">ArbMatrix</span>
            <div className="text-[10px] font-mono -mt-0.5" style={{ color: 'var(--text-3)' }}>
              CEX ARBITRAGE
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
        {/* Trading Mode pill */}
        {!collapsed && (
          <div
            className={cn(
              'mb-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2',
              executionMode === 'PAPER'
                ? 'text-amber-400 border border-amber-500/20'
                : 'text-emerald-400 border border-emerald-500/20'
            )}
            style={{
              background: executionMode === 'PAPER'
                ? 'rgba(245,158,11,0.08)'
                : 'rgba(34,197,94,0.08)',
            }}
          >
            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', executionMode === 'PAPER' ? 'bg-amber-400' : 'bg-emerald-400')} />
            {executionMode === 'PAPER' ? 'Paper Trading' : 'Live Trading'}
          </div>
        )}

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-item group', isActive && 'active', collapsed && 'justify-center px-0')}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0 sidebar-icon transition-colors',
                  isActive ? '' : 'group-hover:opacity-80'
                )}
              />
              {!collapsed && <span>{label}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}

        {/* Admin link */}
        {/* <div
          className={cn('pt-2 mt-1', !collapsed && 'border-t')}
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {!collapsed ? (
            <Link
              href="/admin"
              className={cn('sidebar-item group', pathname.startsWith('/admin') && 'active')}
            >
              <Shield className="w-4 h-4 flex-shrink-0 sidebar-icon" />
              <span>Admin Panel</span>
            </Link>
          ) : (
            <Link
              href="/admin"
              className={cn('sidebar-item justify-center px-0', pathname.startsWith('/admin') && 'active')}
              title="Admin Panel"
            >
              <Shield className="w-4 h-4" />
            </Link>
          )}
        </div> */}
      </nav>

      {/* Bot status pill */}
      <div
        className={cn('p-2.5 flex-shrink-0', collapsed ? 'flex justify-center' : '')}
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {collapsed ? (
          <div title={socketConnected ? statusLabel : 'Offline'} className={cn('w-2 h-2 rounded-full', statusDot)} />
        ) : (
          <div className="glass-subtle rounded-lg px-3 py-2 flex items-center gap-2.5">
            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot', statusDot)} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                {socketConnected ? statusLabel : 'Realtime disconnected'}
              </div>
              <div className="text-[10px] font-mono truncate" style={{ color: 'var(--text-3)' }}>
                {totalTrades} trades total
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-3)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </aside>
  )
}
