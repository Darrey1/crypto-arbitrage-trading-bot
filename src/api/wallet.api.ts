import { apiClient } from './client'
import type { ApiResponse, WalletPublicView } from './types'

export const walletApi = {
  me: () =>
    apiClient.get<ApiResponse<WalletPublicView | null>>('/api/wallet/me'),

  rotate: () =>
    apiClient.post<ApiResponse<WalletPublicView | null>>('/api/wallet/rotate'),
}