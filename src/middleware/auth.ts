import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../lib/errors'
import { verifyAccessToken } from '../lib/jwt'
import { JwtUser } from '../types/domain'

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'Authorization token is required'))
    return
  }

  try {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role as JwtUser['role']
    }
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired authorization token'))
  }
}