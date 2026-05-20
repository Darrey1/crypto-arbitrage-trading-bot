import 'dotenv/config'
import { z } from 'zod'


const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  WALLET_ENCRYPTION_KEY: z.string().min(40),
  MARKET_POLL_INTERVAL_MS: z.coerce.number().positive().default(5000),
  BOT_LOOP_INTERVAL_MS: z.coerce.number().positive().default(5000),
  MIN_SPREAD_THRESHOLD: z.coerce.number().default(0.003),
  DEFAULT_MAX_TRADE_SIZE: z.coerce.number().default(1000),
  DEFAULT_MAX_DAILY_TRADES: z.coerce.number().int().default(50),
  DEFAULT_SLIPPAGE_TOLERANCE: z.coerce.number().default(0.001),
  DEFAULT_DAILY_LOSS_LIMIT: z.coerce.number().default(100),
  SUPPORTED_PAIRS: z.string().default(""),
  EXCHANGES: z.string().default('')
})
console.log('Loaded environment variables:', envSchema.parse(process.env).SUPPORTED_PAIRS, envSchema.parse(process.env).EXCHANGES)
export const env = envSchema.parse(process.env)

export const supportedPairs = env.SUPPORTED_PAIRS.split(',').map((value) => value.trim()).filter(Boolean)
export const supportedExchanges = env.EXCHANGES.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)