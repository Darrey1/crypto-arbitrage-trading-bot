import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import apiRoutes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error'

export const createApp = () => {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'ok', data: { status: 'healthy' } })
  })

  app.use('/api', apiRoutes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}