import { apiClient } from './client'
import type { ApiResponse, PortfolioBalancesResponse, PortfolioHistoryPoint, TradeMode } from './types'

export const portfolioApi = {
  getBalances: (params?: { mode?: TradeMode }) =>
    apiClient.get<ApiResponse<PortfolioBalancesResponse>>('/api/portfolio/balances', { params }),

  getHistory: (params?: { period?: '24h' | '7d' | '30d' | '90d' }) =>
    apiClient.get<ApiResponse<PortfolioHistoryPoint[]>>('/api/portfolio/history', { params }),
}
