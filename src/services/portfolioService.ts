import { ExchangeName, Prisma, TradeMode } from '@prisma/client'
import { ethers } from 'ethers'
import { prisma } from '../config/prisma'
import { env, supportedExchanges } from '../config/env'
import { marketDataService } from './marketDataService'
import { exchangeService, ExchangeKey } from './exchangeService'
import { AssetBalance, ExchangePortfolio, PortfolioHistoryPoint, PortfolioView } from '../types/domain'

const INITIAL_USDT_PER_EXCHANGE = 10000
const STANDARD_ASSETS = ['USDT', 'ETH', 'BTC']

// ─── Price helpers ────────────────────────────────────────────────────────────

function getAssetUsdPrice(asset: string): number {
  if (asset === 'USDT' || asset === 'USD') return 1
  const prices = marketDataService.getLatestPrices()
  const ticker =
    prices.find(p => p.pair === `${asset}/USDT`) ??
    prices.find(p => p.pair === `${asset}/USD`)
  return ticker?.lastPrice ?? 0
}

function buildAssets(balances: Record<string, number>): AssetBalance[] {
  const assetsToShow = new Set([...STANDARD_ASSETS, ...Object.keys(balances)])
  return Array.from(assetsToShow).map(asset => {
    const free = balances[asset] ?? 0
    const price = getAssetUsdPrice(asset)
    return { asset, free, price, usdValue: free * price }
  })
}

// ─── Service ──────────────────────────────────────────────────────────────────

class PortfolioService {
  private supportedExchangeNames(): ExchangeName[] {
    return supportedExchanges
      .map(e => e.toUpperCase() as ExchangeName)
      .filter(e => Object.values(ExchangeName).includes(e))
  }

  // ── Paper portfolio ─────────────────────────────────────────────────────────

  async ensurePaperPortfolio(userId: string) {
    for (const exchange of this.supportedExchangeNames()) {
      await prisma.paperPortfolio.upsert({
        where: { userId_exchange: { userId, exchange } },
        update: {},
        create: {
          userId,
          exchange,
          balances: { USDT: INITIAL_USDT_PER_EXCHANGE, ETH: 0, BTC: 0 }
        }
      })
    }
  }

  async getPaperPortfolio(userId: string): Promise<PortfolioView> {
    await this.ensurePaperPortfolio(userId)
    const rows = await prisma.paperPortfolio.findMany({ where: { userId } })

    let totalUsdValue = 0
    const exchanges: ExchangePortfolio[] = rows.map(row => {
      const balances = row.balances as Record<string, number>
      const assets = buildAssets(balances)
      const exchangeTotal = assets.reduce((sum, a) => sum + a.usdValue, 0)
      totalUsdValue += exchangeTotal
      return { exchange: row.exchange, connected: true, assets, totalUsdValue: exchangeTotal }
    })

    return { mode: TradeMode.PAPER, exchanges, totalUsdValue }
  }

  async applyPaperTrade(
    userId: string,
    buyExchange: ExchangeName,
    sellExchange: ExchangeName,
    pair: string,
    amount: number,
    buyPrice: number,
    sellPrice: number,
    buyFees: number,
    sellFees: number
  ) {
    const parts = pair.split('/')
    const baseAsset = parts[0]   // e.g. 'ETH'
    const quoteAsset = parts[1]  // e.g. 'USDT'

    // Buy leg: spend quoteAsset, receive baseAsset
    const buyRow = await prisma.paperPortfolio.findUnique({
      where: { userId_exchange: { userId, exchange: buyExchange } }
    })
    if (buyRow) {
      const bal = buyRow.balances as Record<string, number>
      bal[quoteAsset] = Math.max(0, (bal[quoteAsset] ?? 0) - (amount * buyPrice + buyFees))
      bal[baseAsset] = (bal[baseAsset] ?? 0) + amount
      await prisma.paperPortfolio.update({
        where: { userId_exchange: { userId, exchange: buyExchange } },
        data: { balances: bal as Prisma.InputJsonValue }
      })
    }

    // Sell leg: spend baseAsset, receive quoteAsset
    const sellRow = await prisma.paperPortfolio.findUnique({
      where: { userId_exchange: { userId, exchange: sellExchange } }
    })
    if (sellRow) {
      const bal = sellRow.balances as Record<string, number>
      bal[baseAsset] = Math.max(0, (bal[baseAsset] ?? 0) - amount)
      bal[quoteAsset] = (bal[quoteAsset] ?? 0) + (amount * sellPrice - sellFees)
      await prisma.paperPortfolio.update({
        where: { userId_exchange: { userId, exchange: sellExchange } },
        data: { balances: bal as Prisma.InputJsonValue }
      })
    }
  }

  async resetPaperPortfolio(userId: string) {
    for (const exchange of this.supportedExchangeNames()) {
      await prisma.paperPortfolio.upsert({
        where: { userId_exchange: { userId, exchange } },
        update: { balances: { USDT: INITIAL_USDT_PER_EXCHANGE, ETH: 0, BTC: 0 } as Prisma.InputJsonValue },
        create: {
          userId,
          exchange,
          balances: { USDT: INITIAL_USDT_PER_EXCHANGE, ETH: 0, BTC: 0 } as Prisma.InputJsonValue
        }
      })
    }

    // Reset bot virtual balance too
    await prisma.botState.updateMany({
      where: { userId },
      data: { virtualBalance: INITIAL_USDT_PER_EXCHANGE, todayPnl: 0 }
    })
  }

  // ── Live portfolio ──────────────────────────────────────────────────────────

  async getLivePortfolio(userId: string): Promise<PortfolioView> {
    const [wallet, credentials] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.exchangeCredential.findMany({ where: { userId } })
    ])

    // On-chain wallet balance
    let walletAddress: string | undefined
    let walletEthBalance = 0
    let walletUsdValue = 0

    if (wallet) {
      walletAddress = wallet.address
      try {
        const provider = new ethers.JsonRpcProvider(env.ETHEREUM_RPC_URL)
        const balanceWei = await provider.getBalance(wallet.address)
        walletEthBalance = parseFloat(ethers.formatEther(balanceWei))
        const ethPrice = getAssetUsdPrice('ETH')
        walletUsdValue = walletEthBalance * (ethPrice || 2500)
      } catch {
        // Wallet RPC failed — show 0, do not crash
      }
    }

    // Per-exchange balances via CCXT
    const exchanges: ExchangePortfolio[] = []

    for (const exchange of this.supportedExchangeNames()) {
      const cred = credentials.find(c => c.exchange === exchange)
      if (!cred) {
        exchanges.push({
          exchange,
          connected: false,
          error: 'No API credentials configured for this exchange',
          assets: [],
          totalUsdValue: 0
        })
        continue
      }

      const balances = await exchangeService.fetchExchangeBalance(
        exchange.toLowerCase() as ExchangeKey,
        {
          apiKey: cred.apiKey,
          encryptedSecret: cred.encryptedSecret,
          iv: cred.iv,
          authTag: cred.authTag,
          passphrase: cred.passphrase ?? undefined
        }
      )

      if (!balances) {
        exchanges.push({
          exchange,
          connected: false,
          error: 'Failed to fetch balance from exchange — check API credentials',
          assets: [],
          totalUsdValue: 0
        })
        continue
      }

      const assets = buildAssets(balances)
      const exchangeTotal = assets.reduce((sum, a) => sum + a.usdValue, 0)
      exchanges.push({ exchange, connected: true, assets, totalUsdValue: exchangeTotal })
    }

    const exchangeTotal = exchanges.reduce((sum, e) => sum + e.totalUsdValue, 0)
    const totalUsdValue = exchangeTotal + walletUsdValue

    return {
      mode: TradeMode.LIVE,
      exchanges,
      totalUsdValue,
      walletAddress,
      walletEthBalance,
      walletUsdValue
    }
  }

  // ── Unified entry point ─────────────────────────────────────────────────────

  async getBalances(userId: string, mode?: TradeMode): Promise<PortfolioView> {
    console.log(`Fetching portfolio for user ${userId} with mode ${mode ?? 'AUTO'}`)
    const effectiveMode =
      mode ??
      (await prisma.botConfig.findUnique({ where: { userId } }))?.executionMode ??
      TradeMode.PAPER

    return effectiveMode === TradeMode.PAPER
      ? this.getPaperPortfolio(userId)
      : this.getLivePortfolio(userId)
  }

  // ── Snapshots (history) ─────────────────────────────────────────────────────

  async takeSnapshot(userId: string) {
    try {
      const portfolio = await this.getBalances(userId)
      const previous = await prisma.portfolioSnapshot.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      const dailyChange = previous ? portfolio.totalUsdValue - previous.totalValue : 0

      await prisma.portfolioSnapshot.create({
        data: {
          userId,
          totalValue: portfolio.totalUsdValue,
          dailyChange,
          allocations: portfolio as unknown as Prisma.InputJsonValue
        }
      })
    } catch {
      // Snapshot failures should never crash the bot cycle
    }
  }

  async ensureInitialSnapshot(userId: string) {
    await this.ensurePaperPortfolio(userId)
    const existing = await prisma.portfolioSnapshot.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    if (!existing) {
      await this.takeSnapshot(userId)
    }
  }

  async getHistory(
    userId: string,
    period: '24h' | '7d' | '30d' | '90d' = '30d'
  ): Promise<PortfolioHistoryPoint[]> {
    const limitMap = { '24h': 24, '7d': 7, '30d': 30, '90d': 90 } as const
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limitMap[period]
    })
    return snapshots.map(s => ({
      totalValue: s.totalValue,
      dailyChange: s.dailyChange,
      createdAt: s.createdAt
    }))
  }
}

export const portfolioService = new PortfolioService()
