import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validateQuery } from '../middleware/validate'
import { asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { marketDataService } from '../services/marketDataService'
import { ExchangeName } from '@prisma/client'

const router = Router()

const currentQuerySchema = z.object({
  pairs: z.string().optional(),
  exchanges: z.string().optional()
})

const historyQuerySchema = z.object({
  pair: z.string().min(1),
  exchange: z.nativeEnum(ExchangeName),
  interval: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional()
})

router.use(requireAuth)

router.get(
  '/current',
  validateQuery(currentQuerySchema),
  asyncHandler(async (req, res) => {
    const pairs = typeof req.query.pairs === 'string'
      ? req.query.pairs.split(',').map((item: string) => item.trim()).filter(Boolean)
      : undefined
    const exchanges = typeof req.query.exchanges === 'string'
      ? req.query.exchanges.split(',').map((item: string) => item.trim().toLowerCase()).filter(Boolean)
      : undefined
    const prices = await marketDataService.getCurrentPrices(pairs, exchanges)
    res.json(ok('Current prices fetched successfully', prices))
  })
)

router.get(
  '/history',
  validateQuery(historyQuerySchema),
  asyncHandler(async (req, res) => {
    const history = await marketDataService.getHistory(
      req.query.pair as string,
      req.query.exchange as ExchangeName,
      req.query.limit ? Number(req.query.limit) : 100
    )
    res.json(ok('Price history fetched successfully', history))
  })
)

export default router