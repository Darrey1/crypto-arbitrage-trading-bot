import { createServer } from 'http'
import { env } from './config/env'
import { logger } from './config/logger'
import { createApp } from './app'
import { socketService } from './services/socketService'
import { botService } from './services/botService'

const app = createApp()
const server = createServer(app)

socketService.init(server)

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