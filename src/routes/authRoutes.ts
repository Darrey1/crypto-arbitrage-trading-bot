import { Router } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { ok } from '../lib/response'
import { asyncHandler } from '../lib/errors'

const router = Router()

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
})

router.post(
  '/register',
  validateBody(credentialsSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body)
    res.status(201).json(ok('User registered successfully', result))
  })
)

router.post(
  '/login',
  validateBody(credentialsSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body)
    res.json(ok('Login successful', result))
  })
)

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refresh(req.body.refreshToken)
    res.json(ok('Token refreshed successfully', tokens))
  })
)

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user!.id)
    res.json(ok(result.message, null))
  })
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user!.id)
    res.json(ok('Current user fetched successfully', user))
  })
)

export default router