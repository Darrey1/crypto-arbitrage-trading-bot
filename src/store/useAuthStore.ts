import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthTokens, AuthUser } from '@/api/types'

const ACCESS_COOKIE = 'arb-access-token'

function readSessionCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${ACCESS_COOKIE}=`))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(ACCESS_COOKIE.length + 1))
}

function setSessionCookie(token: string | null) {
  if (typeof document === 'undefined') return
  if (!token) {
    document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    return
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax${secure}`
}

export interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  hydrated: boolean
  isAuthenticated: boolean
  setSession: (payload: { user: AuthUser; tokens: AuthTokens }) => void
  updateTokens: (tokens: AuthTokens) => void
  setUser: (user: AuthUser | null) => void
  logout: () => void
  loginDemo: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      isAuthenticated: false,
      setSession: ({ user, tokens }) => {
        setSessionCookie(tokens.accessToken)
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, isAuthenticated: true })
      },
      updateTokens: (tokens) => {
        setSessionCookie(tokens.accessToken)
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, isAuthenticated: true })
      },
      setUser: (user) => set({ user, isAuthenticated: Boolean(user && get().accessToken) }),
      logout: () => {
        setSessionCookie(null)
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },
      loginDemo: () => {
        const demoUser: AuthUser = {
          id: 'demo',
          email: 'demo@arbmatrix.io',
          role: 'USER',
          status: 'ACTIVE',
          walletAddress: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set({ user: demoUser, accessToken: 'demo', refreshToken: 'demo', isAuthenticated: true })
      },
    }),
    {
      name: 'arb-auth',
      skipHydration: true,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)

// ─── Auth-ready gate ──────────────────────────────────────────────────────────
//
// authReady is a Promise that resolves once after hydrateAuthStore() finishes
// reading from storage and setting state. The Axios interceptor awaits it before
// every request. On the server it resolves immediately (no storage to read).
// Calling hydrateAuthStore() more than once is safe — the second call is a no-op
// because _resolveAuthReady is nulled after the first resolution.

let _resolveAuthReady: (() => void) | null = null

export const authReady: Promise<void> =
  typeof window === 'undefined'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        _resolveAuthReady = resolve
      })

// ─── Hydration ────────────────────────────────────────────────────────────────
//
// MUST be async: Zustand v5 persist.rehydrate() returns a thenable. Even though
// the underlying localStorage.getItem() is synchronous, the thenable schedules
// its .then() callbacks as microtasks before returning. Reading getState()
// synchronously after rehydrate() would see the OLD (empty) state. Awaiting it
// ensures the .then() chain inside Zustand has flushed and set() has been called
// with the persisted values before we continue.

export async function hydrateAuthStore(): Promise<void> {
  if (typeof window === 'undefined') return

  // Guard: if already hydrated (e.g. called twice), skip storage I/O.
  if (useAuthStore.getState().hydrated) {
    _resolveAuthReady?.()
    _resolveAuthReady = null
    return
  }

  try {
    // await is required — Zustand v5 rehydrate() resolves asynchronously.
    await useAuthStore.persist.rehydrate()
  } catch {
    // localStorage unavailable in Safari private mode or when quota is exceeded.
  }

  // At this point Zustand has merged stored values into the store via set().
  // Merge the session cookie as a fallback in case localStorage was cleared
  // but the cookie is still alive (e.g. the user cleared site data partially).
  const cookieToken = readSessionCookie()
  const { accessToken: storedToken } = useAuthStore.getState()
  const accessToken = storedToken ?? cookieToken ?? null

  useAuthStore.setState({
    hydrated: true,
    accessToken,
    isAuthenticated: Boolean(accessToken),
  })

  // Keep the cookie in sync with the token source of truth.
  if (accessToken && accessToken !== storedToken) {
    setSessionCookie(accessToken)
  }

  // Unblock all Axios requests that were awaiting this.
  _resolveAuthReady?.()
  _resolveAuthReady = null
}

// ─── Module-level kickoff ─────────────────────────────────────────────────────
//
// Fire-and-forget at module evaluation time so hydration starts as early as
// possible. authReady will not resolve until hydrateAuthStore() finishes, so any
// Axios request that fires in the meantime is held by the interceptor gate.
if (typeof window !== 'undefined') {
  void hydrateAuthStore()
}
