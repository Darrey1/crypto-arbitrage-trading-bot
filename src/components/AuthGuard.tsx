'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [hydrated, isAuthenticated, router])

  if (!hydrated) {
    return <div className="min-h-screen" style={{ background: 'var(--bg)' }} />
  }

  if (!isAuthenticated) return null

  return <>{children}</>
}
