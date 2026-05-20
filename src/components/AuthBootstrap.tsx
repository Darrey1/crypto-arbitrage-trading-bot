'use client'

import { useEffect } from 'react'
import { hydrateAuthStore } from '@/store/useAuthStore'

export function AuthBootstrap() {
  useEffect(() => {
    void hydrateAuthStore()
  }, [])

  return null
}