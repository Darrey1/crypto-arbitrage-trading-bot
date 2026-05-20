import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { portfolioService } from '../services/portfolioService'

const router = Router()

const historyQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).optional()
})

router.use(requireAuth)

router.get(
  '/balances',
  asyncHandler(async (req, res) => {
    const balances = await portfolioService.getBalances(req.user!.id)
    res.json(ok('Portfolio balances fetched successfully', balances))
  })
)

router.get(
  '/history',
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const history = await portfolioService.getHistory(req.user!.id, (req.query.period as '24h' | '7d' | '30d' | '90d') ?? '30d')
    res.json(ok('Portfolio history fetched successfully', history))
  })
)

export default router