import { apiClient } from './client'
import type { ApiResponse, ApiListResponse, AdminStats, AdminUser, SystemConfig, Trade, BotLog } from './types'

export const adminApi = {
  getStats: () =>
    apiClient.get<ApiResponse<AdminStats>>('/api/admin/stats'),

  getUsers: (params?: { page?: number; limit?: number; role?: string; status?: string }) =>
    apiClient.get<ApiListResponse<AdminUser>>('/api/admin/users', { params }),

  updateUser: (id: string, data: Partial<Pick<AdminUser, 'role' | 'status' | 'tradingMode'>>) =>
    apiClient.put<ApiResponse<AdminUser>>(`/api/admin/users/${id}`, data),

  getBots: () =>
    apiClient.get<ApiResponse<{ userId: string; userName: string; status: string; uptime: number }[]>>('/api/admin/bots'),

  getTrades: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiListResponse<Trade>>('/api/admin/trades', { params }),

  getConfig: () =>
    apiClient.get<ApiResponse<SystemConfig>>('/api/admin/config'),

  updateConfig: (config: Partial<SystemConfig>) =>
    apiClient.put<ApiResponse<SystemConfig>>('/api/admin/config', config),

  getLogs: (params?: { page?: number; limit?: number; level?: string }) =>
    apiClient.get<ApiListResponse<BotLog>>('/api/admin/logs', { params }),

  killSwitch: (enabled: boolean) =>
    apiClient.post<ApiResponse<{ globalKillSwitch: boolean }>>('/api/admin/kill-switch', { enabled }),
}
