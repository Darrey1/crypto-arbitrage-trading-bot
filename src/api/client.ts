import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { authReady, useAuthStore } from '@/store/useAuthStore'
import type { AuthTokens } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const ACCESS_COOKIE = 'arb-access-token'

function readCookieToken(): string | null {
  if (typeof document === 'undefined') return null
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${ACCESS_COOKIE}=`))
  return entry ? decodeURIComponent(entry.slice(ACCESS_COOKIE.length + 1)) : null
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

const refreshClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

let refreshPromise: Promise<AuthTokens | null> | null = null

// ─── Request gate ─────────────────────────────────────────────────────────────
//
// Every outgoing request awaits authReady before reading the token. In the
// normal flow authReady is already resolved by the time the first request fires
// (the await is a free microtask no-op). When a request races ahead of hydration
// it suspends here until hydrateAuthStore() signals completion — the token is
// then read from the fully-hydrated store, so the Authorization header is
// always correct.
apiClient.interceptors.request.use(async (config: RetryConfig) => {
  await authReady
  const token = useAuthStore.getState().accessToken ?? readCookieToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Token refresh + 401 handling ────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const { refreshToken } = useAuthStore.getState()
    if (!refreshToken) {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise ??= refreshClient
        .post<{ success: boolean; message: string; data: AuthTokens }>('/api/auth/refresh', { refreshToken })
        .then((res) => res.data.data)
        .finally(() => {
          refreshPromise = null
        })

      const tokens = await refreshPromise
      if (!tokens) throw new Error('Unable to refresh session')

      useAuthStore.getState().updateTokens(tokens)
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
      return apiClient(originalRequest)
    } catch {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
      return Promise.reject(error)
    }
  }
)
