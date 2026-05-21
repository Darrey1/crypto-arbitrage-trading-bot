'use client'

import { useEffect, useState } from 'react'
import { hydrateAuthStore } from '@/store/useAuthStore'

interface Props {
  children: React.ReactNode
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────
//
// Initialization order enforced by this component:
//
//   1. Module loads  → hydrateAuthStore() fires (void, async)
//   2. React mounts  → useEffect calls hydrateAuthStore() again (idempotent)
//   3. Hydration done → setReady(true)
//   4. Children render → components mount → useEffects fire → API calls made
//
// Children never mount until step 3 completes. No component can call an API,
// open a socket, or read auth state before the store is fully hydrated.
//
// SSR behaviour: useState(false) renders the same loading shell on both server
// and client during the initial render, so there is no React hydration mismatch.
// The shell is replaced with actual content after the first useEffect tick
// (< 10 ms in practice for a synchronous localStorage read).

export function AuthProvider({ children }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // hydrateAuthStore is idempotent: if the module-level kickoff already
    // resolved authReady, this call resolves instantly and sets ready = true
    // in the same microtask. If for any reason (HMR, test environment) the
    // module-level call has not run yet, this call runs it now.
    void hydrateAuthStore().then(() => {
      setReady(true)
    })
  }, [])

  if (!ready) {
    // Full-screen placeholder that matches the app background so the user
    // never sees a flash of unstyled content. Shown for < 10 ms in practice.
    return (
      <div
        aria-hidden="true"
        style={{
          minHeight: '100dvh',
          background: 'var(--bg, #0A0E14)',
        }}
      />
    )
  }

  return <>{children}</>
}
