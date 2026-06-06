import { createServer } from 'http'
import { env } from './config/env'
import { logger } from './config/logger'
import { createApp } from './app'
import { socketService } from './services/socketService'
import { botService } from './services/botService'


const allowedOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/,
  /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
]

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true)
      return
    }

    const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin))
    callback(null, isAllowed)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

const app = createApp(corsOptions)
const server = createServer(app)

socketService.init(server, corsOptions)

const start = async () => {
  await botService.bootstrap()

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Backend server started')
  })
}

start().catch((error) => {
  logger.error({ error }, 'Failed to start server')
  process.exit(1)
})