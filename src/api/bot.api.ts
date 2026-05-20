import { apiClient } from './client'
import type { ApiResponse, ApiListResponse, BotState, BotConfig, Opportunity, BotLog } from './types'

export const botApi = {
  getStatus: () =>
    apiClient.get<ApiResponse<BotState>>('/api/bot/status'),

  start: () =>
    apiClient.post<ApiResponse<BotState>>('/api/bot/start'),

  stop: () =>
    apiClient.post<ApiResponse<BotState>>('/api/bot/stop'),

  pause: () =>
    apiClient.post<ApiResponse<BotState>>('/api/bot/pause'),

  getConfig: () =>
    apiClient.get<ApiResponse<BotConfig>>('/api/bot/config'),

  updateConfig: (config: Partial<BotConfig>) =>
    apiClient.put<ApiResponse<BotConfig>>('/api/bot/config', config),

  getLogs: (params?: { page?: number; limit?: number; level?: string }) =>
    apiClient.get<ApiListResponse<BotLog>>('/api/bot/logs', { params }),

  getOpportunities: () =>
    apiClient.get<ApiResponse<Opportunity[]>>('/api/bot/opportunities'),
}
