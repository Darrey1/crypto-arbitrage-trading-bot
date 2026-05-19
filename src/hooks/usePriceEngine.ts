'use client'

import { useEffect, useRef } from 'react'
import { useBotStore } from '@/store/useBotStore'
import { tickPrices, detectOpportunity } from '@/lib/mockPriceEngine'

export function usePriceEngine() {
  const { botState, config, updatePrice, addOpportunity } = useBotStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const oppCooldownRef = useRef<number>(0)

  useEffect(() => {
    // Always tick prices regardless of bot state for live display
    const priceInterval = setInterval(() => {
      const ticks = tickPrices(config.symbol)
      ticks.forEach(t => updatePrice(t))
    }, 1000)

    return () => clearInterval(priceInterval)
  }, [config.symbol, updatePrice])

  useEffect(() => {
    if (botState.status !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      const ticks = tickPrices(config.symbol)
      ticks.forEach(t => updatePrice(t))

      const now = Date.now()
      if (now - oppCooldownRef.current < config.cooldownSeconds * 1000) return

      const opp = detectOpportunity(
        ticks,
        config.minSpreadThreshold,
        config.maxTradeSize,
        config.symbol,
      )

      if (opp) {
        oppCooldownRef.current = now
        addOpportunity(opp)
      }
    }, 800)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [botState.status, config, updatePrice, addOpportunity])
}
