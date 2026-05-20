import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../lib/errors'
import { ok } from '../lib/response'
import { walletService } from '../services/walletService'

const router = Router()

router.use(requireAuth)

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const wallet = await walletService.getWalletForUser(req.user!.id)
    res.json(ok('Wallet fetched successfully', wallet))
  })
)

router.post(
  '/rotate',
  asyncHandler(async (req, res) => {
    const wallet = await walletService.rotateWallet(req.user!.id)
    res.json(ok('Wallet rotated successfully', wallet))
  })
)

export default router