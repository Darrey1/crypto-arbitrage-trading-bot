import { Request, Response, NextFunction } from 'express'
import { ZodTypeAny } from 'zod'
import { ApiError } from '../lib/errors'

export const validateBody = (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    next(new ApiError(400, 'Invalid request body', parsed.error.flatten()))
    return
  }

  req.body = parsed.data
  next()
}

export const validateQuery = (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) {
    next(new ApiError(400, 'Invalid query parameters', parsed.error.flatten()))
    return
  }

  req.query = parsed.data as Request['query']
  next()
}