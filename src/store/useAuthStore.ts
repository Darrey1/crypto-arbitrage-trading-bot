import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthTokens, AuthUser } from '@/api/types'

const ACCESS_COOKIE = 'arb-access-token'

function readSessionCookie() {
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

  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
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
  setHydrated: (hydrated: boolean) => void
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
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          isAuthenticated: true,
        })
      },
      updateTokens: (tokens) => {
        setSessionCookie(tokens.accessToken)
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        })
      },
      setUser: (user) => set({ user, isAuthenticated: Boolean(user && get().accessToken) }),
      logout: () => {
        setSessionCookie(null)
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },
      setHydrated: (hydrated) => set({ hydrated }),
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

export async function hydrateAuthStore() {
  await Promise.resolve(useAuthStore.persist.rehydrate())

  const cookieToken = readSessionCookie()
  const currentState = useAuthStore.getState()
  const accessToken = currentState.accessToken ?? cookieToken

  useAuthStore.setState({
    hydrated: true,
    accessToken: accessToken ?? null,
    isAuthenticated: Boolean(accessToken),
  })

  if (accessToken && accessToken !== currentState.accessToken) {
    setSessionCookie(accessToken)
  }
}
