import { apiClient } from './client'
import type { ApiResponse, AuthUser, AuthTokens, LoginPayload, RegisterPayload } from './types'

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>('/api/auth/login', payload),

  register: (payload: RegisterPayload) =>
    apiClient.post<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>('/api/auth/register', payload),

  logout: () =>
    apiClient.post<ApiResponse<null>>('/api/auth/logout'),

  me: () =>
    apiClient.get<ApiResponse<AuthUser>>('/api/auth/me'),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/api/auth/refresh', { refreshToken }),
}
