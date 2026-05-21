'use client'

import { useEffect } from 'react'
import { hydrateAuthStore } from '@/store/useAuthStore'

// Hydration already ran synchronously at module load time. This component
// re-runs it on mount as a safety net for dev hot-reload scenarios where the
// module cache may be stale. It is a no-op in production (authReady is already
// resolved and setState receives identical values).
export function AuthBootstrap() {
  useEffect(() => {
    hydrateAuthStore()
  }, [])

  return null
}
