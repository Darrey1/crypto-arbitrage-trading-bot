import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export interface JwtUserPayload {
  sub: string
  email: string
  role: string
}

export const signAccessToken = (payload: JwtUserPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] })

export const signRefreshToken = (payload: JwtUserPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'] })

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload