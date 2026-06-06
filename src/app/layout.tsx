import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'ArbMatrix — Crypto Arbitrage Trading Bot',
  description: 'Automated CEX arbitrage bot for Ethereum trading across OKX, Kraken, and KuCoin.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="dark">
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
