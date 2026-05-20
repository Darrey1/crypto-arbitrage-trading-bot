'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'
import { AuthGuard } from '@/components/AuthGuard'
import {
  LayoutDashboard, Users, Bot, History,
  Settings, FileText, ChevronLeft, Shield
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin',         label: 'Overview',      icon: LayoutDashboard },
  { href: '/admin/users',   label: 'Users',         icon: Users },
  { href: '/admin/bots',    label: 'Bot Monitor',   icon: Bot },
  { href: '/admin/trades',  label: 'All Trades',    icon: History },
  { href: '/admin/config',  label: 'System Config', icon: Settings },
  { href: '/admin/logs',    label: 'Logs',          icon: FileText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AuthGuard>
    <div
      className="min-h-screen grid-pattern flex"
      style={{ background: 'var(--bg)' }}
    >
      {/* Admin Sidebar */}
      <aside
        className="w-[220px] fixed left-0 top-0 h-full flex flex-col z-50"
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Logo + Admin badge */}
        <div
          className="px-4 h-[60px] flex items-center gap-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--border)',
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              Admin Panel
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              ArbMatrix Control
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn('sidebar-item', isActive && 'active')}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <ChevronLeft className="w-3 h-3" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        {/* Admin header */}
        <header
          className="h-[60px] flex items-center px-6 sticky top-0 z-40 backdrop-blur-md"
          style={{
            background: 'var(--header-bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator Mode</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="live-dot" />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>System active</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-1)',
            fontSize: '13px',
          },
        }}
      />
    </div>
    </AuthGuard>
  )
}
