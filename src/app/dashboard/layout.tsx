'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { usePriceEngine } from '@/hooks/usePriceEngine'
import { Toaster } from 'sonner'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/markets': 'Markets',
  '/dashboard/bot': 'Arbitrage Bot',
  '/dashboard/history': 'Trade History',
  '/dashboard/portfolio': 'Portfolio',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
}

function PriceEngineProvider({ children }: { children: React.ReactNode }) {
  usePriceEngine()
  return <>{children}</>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'

  return (
    <PriceEngineProvider>
      <div
        className="min-h-screen grid-pattern"
        style={{ background: 'var(--bg)' }}
      >
        <Sidebar />

        <div className="ml-[230px] flex flex-col min-h-screen transition-all duration-300">
          <Header title={title} />
          <main className="flex-1 p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
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
    </PriceEngineProvider>
  )
}
