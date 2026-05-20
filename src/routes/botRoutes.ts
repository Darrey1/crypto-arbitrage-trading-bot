import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { botService } from '../services/botService'

const router = Router()

const configSchema = z.object({
  tradingPair: z.string().min(1).optional(),
  executionMode: z.enum(['PAPER', 'LIVE']).optional(),
  minSpreadThreshold: z.number().nonnegative().optional(),
  maxTradeSize: z.number().positive().optional(),
  maxDailyTrades: z.number().int().positive().optional(),
  slippageTolerance: z.number().nonnegative().optional(),
  dailyLossLimit: z.number().nonnegative().optional()
})

const logsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  level: z.string().optional()
})

router.use(requireAuth)

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = await botService.getStatus(req.user!.id)
    res.json(ok('Bot status fetched successfully', status))
  })
)

router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const status = await botService.start(req.user!.id)
    res.json(ok('Bot started successfully', status))
  })
)

router.post(
  '/stop',
  asyncHandler(async (req, res) => {
    const status = await botService.stop(req.user!.id)
    res.json(ok('Bot stopped successfully', status))
  })
)

router.post(
  '/pause',
  asyncHandler(async (req, res) => {
    const status = await botService.pause(req.user!.id)
    res.json(ok('Bot paused successfully', status))
  })
)

router.get(
  '/config',
  asyncHandler(async (req, res) => {
    const config = await botService.getConfig(req.user!.id)
    res.json(ok('Bot config fetched successfully', config))
  })
)

router.put(
  '/config',
  validateBody(configSchema),
  asyncHandler(async (req, res) => {
    const config = await botService.updateConfig(req.user!.id, req.body)
    res.json(ok('Bot config updated successfully', config))
  })
)

router.get(
  '/logs',
  validateQuery(logsQuerySchema),
  asyncHandler(async (req, res) => {
    const logs = await botService.getLogs(
      req.user!.id,
      req.query.page as number | undefined,
      req.query.limit as number | undefined,
      req.query.level as string | undefined
    )
    res.json(ok('Bot logs fetched successfully', logs))
  })
)

router.get(
  '/opportunities',
  asyncHandler(async (req, res) => {
    const opportunities = await botService.getOpportunities(req.user!.id)
    res.json(ok('Opportunities fetched successfully', opportunities))
  })
)

export default router