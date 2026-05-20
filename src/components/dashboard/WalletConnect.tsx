'use client'

import { useState, useCallback } from 'react'
import { Wallet, Unlink, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

const CHAIN_NAMES: Record<string, string> = {
  '0x1': 'Ethereum Mainnet',
  '0x38': 'BNB Smart Chain',
  '0x89': 'Polygon',
  '0xa': 'Optimism',
  '0xa4b1': 'Arbitrum One',
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected. Install the MetaMask browser extension to continue.')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const chain = await window.ethereum.request({ method: 'eth_chainId' }) as string

      setAddress(accounts[0])
      setChainId(chain)

      window.ethereum.on('accountsChanged', (accs: unknown) => {
        const updated = accs as string[]
        if (updated.length === 0) {
          setAddress(null)
          setChainId(null)
        } else {
          setAddress(updated[0])
        }
      })

      window.ethereum.on('chainChanged', (id: unknown) => {
        setChainId(id as string)
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect wallet.'
      if (msg.includes('rejected')) {
        setError('Connection rejected by user.')
      } else {
        setError(msg)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  const copyAddress = useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [address])

  const chainName = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : null
  const isMainnet = chainId === '0x1'

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-bg)' }}
          >
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
              MetaMask Wallet
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Connect for on-chain transactions
            </p>
          </div>
        </div>

        {address && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: isMainnet ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              color: isMainnet ? '#4ade80' : '#fbbf24',
              border: `1px solid ${isMainnet ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}
          >
            {chainName}
          </span>
        )}
      </div>

      {error && (
        <div
          className="mb-4 px-3.5 py-2.5 rounded-lg text-xs"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}

      {!address ? (
        <button
          onClick={connect}
          disabled={connecting}
          className={cn(
            'w-full h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200',
            'hover:brightness-110 active:scale-[0.98]',
            connecting && 'opacity-60 cursor-not-allowed'
          )}
          style={{ background: 'var(--accent)', color: '#070707' }}
        >
          {connecting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-[#070707]/30 border-t-[#070707] rounded-full animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect MetaMask</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-lg px-3.5 py-3 flex items-center justify-between"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}
          >
            <div>
              <div className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-3)' }}>
                CONNECTED ADDRESS
              </div>
              <div className="text-sm font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                {shortAddress(address)}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyAddress}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: 'var(--surface)', color: 'var(--text-3)' }}
                title="Copy address"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <a
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: 'var(--surface)', color: 'var(--text-3)' }}
                title="View on Etherscan"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <button
            onClick={disconnect}
            className="w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-80"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#f87171',
            }}
          >
            <Unlink className="w-3 h-3" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
