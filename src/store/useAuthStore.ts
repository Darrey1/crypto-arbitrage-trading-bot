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
// On the server there is nothing to hydrate, so the gate resolves immediately.
// In the browser the gate is a pending Promise that hydrateAuthStore() resolves
// exactly once. Any Axios request that fires before hydration is complete will
// await this promise — pausing until the token is available — then continue.
// After the first resolution every subsequent await is a free no-op.

let _resolveAuthReady: (() => void) | null = null

export const authReady: Promise<void> =
  typeof window === 'undefined'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        _resolveAuthReady = resolve
      })

// ─── Hydration ────────────────────────────────────────────────────────────────

export function hydrateAuthStore(): void {
  if (typeof window === 'undefined') return

  try {
    // localStorage.getItem is synchronous — this completes immediately.
    useAuthStore.persist.rehydrate()
  } catch {
    // localStorage unavailable (Safari private mode, storage quota exceeded).
  }

  const cookieToken = readSessionCookie()
  const current = useAuthStore.getState()
  const accessToken = current.accessToken ?? cookieToken ?? null

  useAuthStore.setState({
    hydrated: true,
    accessToken,
    isAuthenticated: Boolean(accessToken),
  })

  // Sync the cookie if the token came from localStorage and the cookie was stale.
  if (accessToken && accessToken !== current.accessToken) {
    setSessionCookie(accessToken)
  }

  // Signal all waiting requests that auth is ready.
  _resolveAuthReady?.()
  _resolveAuthReady = null
}

// Run synchronously at module-load time so the gate is open before any
// component mounts or any Axios interceptor fires.
if (typeof window !== 'undefined') {
  hydrateAuthStore()
}
