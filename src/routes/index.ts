import { Router } from 'express'
import authRoutes from './authRoutes'
import botRoutes from './botRoutes'
import portfolioRoutes from './portfolioRoutes'
import pricesRoutes from './pricesRoutes'
import tradesRoutes from './tradesRoutes'
import walletRoutes from './walletRoutes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/bot', botRoutes)
router.use('/portfolio', portfolioRoutes)
router.use('/prices', pricesRoutes)
router.use('/trades', tradesRoutes)
router.use('/wallet', walletRoutes)

export default router