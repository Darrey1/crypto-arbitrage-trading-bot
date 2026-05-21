import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { ApiError } from '../lib/errors'
import { logger } from '../config/logger'
import { env } from '../config/env'

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found`, data: null })
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Known application errors — always expose message
  if (err instanceof ApiError) {
    logger.warn({ statusCode: err.statusCode, message: err.message }, 'API error')
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.details ?? null
    })
    return
  }

  // Zod validation errors that escaped the validate middleware
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      data: err.flatten()
    })
    return
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn({ code: err.code, meta: err.meta }, 'Prisma error')

    if (err.code === 'P2025') {
      // Record required for the operation not found
      const model = (err.meta?.modelName as string | undefined) ?? 'Record'
      res.status(404).json({ success: false, message: `${model} not found`, data: null })
      return
    }

    if (err.code === 'P2002') {
      // Unique constraint violation
      const fields = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : 'field'
      res.status(409).json({
        success: false,
        message: `A record with this ${fields} already exists`,
        data: null
      })
      return
    }

    if (err.code === 'P2003') {
      // Foreign key constraint violation
      res.status(400).json({
        success: false,
        message: 'Related record does not exist',
        data: null
      })
      return
    }

    // Any other Prisma known error
    res.status(500).json({
      success: false,
      message: env.NODE_ENV === 'development' ? `Database error: ${err.message}` : 'Database error',
      data: null
    })
    return
  }

  // Prisma validation errors (wrong types passed to queries)
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({ err }, 'Prisma validation error')
    res.status(400).json({
      success: false,
      message: env.NODE_ENV === 'development' ? err.message : 'Invalid database query',
      data: null
    })
    return
  }

  // Unhandled errors — show real message in development, hide in production
  logger.error({ err }, 'Unhandled error')
  const message =
    env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Internal server error'
  res.status(500).json({ success: false, message, data: null })
}