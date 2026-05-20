import { apiClient } from './client'
import type { ApiResponse, PriceData } from './types'

export const pricesApi = {
  getCurrent: (params?: { pairs?: string; exchanges?: string }) =>
    apiClient.get<ApiResponse<PriceData[]>>('/api/prices/current', { params }),

  getHistory: (params: { pair: string; exchange?: string; interval?: string; limit?: number }) =>
    apiClient.get<ApiResponse<PriceData[]>>('/api/prices/history', { params }),
}
