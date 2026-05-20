import { apiClient } from './client'
import type { ApiResponse, ApiListResponse, Trade, TradeStats } from './types'

export const tradesApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; pair?: string }) =>
    apiClient.get<ApiListResponse<Trade>>('/api/trades', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Trade>>(`/api/trades/${id}`),

  getStats: (params?: { period?: '24h' | '7d' | '30d' | 'all' }) =>
    apiClient.get<ApiResponse<TradeStats>>('/api/trades/stats', { params }),
}
