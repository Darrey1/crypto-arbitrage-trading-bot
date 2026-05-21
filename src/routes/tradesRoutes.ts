import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'
import { ApiError, asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { tradeService } from '../services/tradeService'

const router = Router()

const tradesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  pair: z.string().optional()
})

const statsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', 'all']).optional()
})

router.use(requireAuth)

router.get(
  '/',
  validateQuery(tradesQuerySchema),
  asyncHandler(async (req, res) => {
    const trades = await tradeService.getTrades({
      userId: req.user!.id,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      status: req.query.status as string | undefined,
      pair: req.query.pair as string | undefined
    })
    res.json(ok('Trades fetched successfully', trades))
  })
)

// /stats must be declared before /:id so Express does not swallow it as an ID
router.get(
  '/stats',
  validateQuery(statsQuerySchema),
  asyncHandler(async (req, res) => {
    const stats = await tradeService.getStats({
      userId: req.user!.id,
      period: (req.query.period as '24h' | '7d' | '30d' | 'all') ?? '30d'
    })
    res.json(ok('Trade stats fetched successfully', stats))
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const trade = await tradeService.getTradeById(req.params.id)
    if (!trade) {
      throw new ApiError(404, `Trade '${req.params.id}' not found`)
    }
    res.json(ok('Trade fetched successfully', trade))
  })
)

export default router