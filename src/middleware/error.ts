import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../lib/errors'
import { logger } from '../config/logger'

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found', data: null })
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message, data: err.details ?? null })
    return
  }

  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ success: false, message: 'Internal server error', data: null })
}