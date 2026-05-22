import { Router } from 'express'
import { z } from 'zod'
import { TradeMode } from '@prisma/client'
import { requireAuth } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { portfolioService } from '../services/portfolioService'

const router = Router()

const balancesQuerySchema = z.object({
  mode: z.enum(['PAPER', 'LIVE']).optional()
})

const historyQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).optional()
})

router.use(requireAuth)

router.get(
  '/balances',
  validateQuery(balancesQuerySchema),
  asyncHandler(async (req, res) => {
    const mode = req.query.mode as TradeMode | undefined
    const balances = await portfolioService.getBalances(req.user!.id, mode)
    res.json(ok('Portfolio balances fetched successfully', balances))
  })
)

router.get(
  '/history',
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const history = await portfolioService.getHistory(
      req.user!.id,
      (req.query.period as '24h' | '7d' | '30d' | '90d') ?? '30d'
    )
    res.json(ok('Portfolio history fetched successfully', history))
  })
)

router.post(
  '/reset',
  asyncHandler(async (req, res) => {
    await portfolioService.resetPaperPortfolio(req.user!.id)
    const balances = await portfolioService.getPaperPortfolio(req.user!.id)
    res.json(ok('Paper portfolio reset to starting balance', balances))
  })
)

export default router
