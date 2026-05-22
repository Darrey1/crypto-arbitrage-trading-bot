'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useBotStore } from '@/store/useBotStore'
import type { BotLog, BotState, Opportunity, PortfolioBalancesResponse, PortfolioExchangeBalance, PortfolioHistoryPoint, PriceData, Trade } from '@/api/types'

export function usePriceEngine() {
  const token = useAuthStore((state) => state.accessToken)
  const hydrated = useAuthStore((state) => state.hydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const refreshAll = useBotStore((state) => state.refreshAll)
  const refreshPrices = useBotStore((state) => state.refreshPrices)
  const applyRealtimeEvent = useBotStore((state) => state.applyRealtimeEvent)
  const setSocketConnected = useBotStore((state) => state.setSocketConnected)
  const socketRef = useRef<Socket | null>(null)
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !token) {
      return
    }

    refreshAll().catch(() => undefined)
    

    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketRef.current = socket

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))
    socket.on('connect_error', () => setSocketConnected(false))
    socket.on('price:tick', (payload: PriceData) => applyRealtimeEvent({ type: 'price:tick', payload }))
    socket.on('prices:update', (payload: PriceData[]) => applyRealtimeEvent({ type: 'prices:update', payload }))
    socket.on('opportunity:new', (payload: Opportunity) => applyRealtimeEvent({ type: 'opportunity:new', payload }))
    socket.on('trade:new', (payload: Trade) => applyRealtimeEvent({ type: 'trade:new', payload }))
    socket.on('bot:status', (payload: BotState) => applyRealtimeEvent({ type: 'bot:status', payload }))
    socket.on('bot:log', (payload: BotLog) => applyRealtimeEvent({ type: 'bot:log', payload }))
    socket.on('portfolio:update', (payload: PortfolioBalancesResponse | PortfolioExchangeBalance[] | PortfolioHistoryPoint[]) => {
      applyRealtimeEvent({ type: 'portfolio:update', payload })
    })

    const priceFallback = window.setInterval(() => {
      refreshPrices({ silent: true }).catch(() => undefined)
    }, 10_000)

    const snapshotFallback = window.setInterval(() => {
      refreshAll({ silent: true }).catch(() => undefined)
    }, 60_000)

    return () => {
      window.clearInterval(priceFallback)
      window.clearInterval(snapshotFallback)
      socket.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }, [applyRealtimeEvent, hydrated, isAuthenticated, refreshAll, refreshPrices, setSocketConnected, token])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) {
      return
    }
  }, [hydrated, isAuthenticated])
}
