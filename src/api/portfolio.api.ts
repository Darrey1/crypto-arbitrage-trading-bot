import { apiClient } from './client'
import type { ApiResponse, PortfolioBalance, PortfolioHistoryPoint } from './types'

export const portfolioApi = {
  getBalances: () =>
    apiClient.get<ApiResponse<PortfolioBalance[]>>('/api/portfolio/balances'),

  getHistory: (params?: { period?: '24h' | '7d' | '30d' | '90d' }) =>
    apiClient.get<ApiResponse<PortfolioHistoryPoint[]>>('/api/portfolio/history', { params }),
}
