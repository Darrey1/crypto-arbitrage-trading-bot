import bcrypt from 'bcryptjs'
import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '../config/prisma'
import { env } from '../config/env'
import { ApiError } from '../lib/errors'
import { hashToken } from '../lib/crypto'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { botService } from './botService'
import { portfolioService } from './portfolioService'
import { walletService } from './walletService'
import { JwtUser } from '../types/domain'

type AuthUserView = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  walletAddress: string | null
  createdAt: Date
  updatedAt: Date
}

type AuthTokens = {
  accessToken: string
  refreshToken: string
}

const parseTtlToMs = (ttl: string) => {
  const match = ttl.trim().match(/^(\d+)([smhd])$/i)
  if (!match) {
    return 30 * 24 * 60 * 60 * 1000
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }

  return amount * multipliers[unit]
}

class AuthService {
  private sanitizeUser(user: {
    id: string
    email: string
    role: UserRole
    status: UserStatus
    wallet: { address: string } | null
    createdAt: Date
    updatedAt: Date
  }): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      walletAddress: user.wallet?.address ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }

  private async createTokens(user: JwtUser): Promise<AuthTokens> {
    return {
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: signRefreshToken({ sub: user.id, email: user.email, role: user.role })
    }
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const expirationMs = parseTtlToMs(env.REFRESH_TOKEN_TTL)
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + expirationMs)
      }
    })
  }

  async register(payload: { email: string; password: string }) {
    const email = payload.email.trim().toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ApiError(409, 'User already exists')
    }

    const passwordHash = await bcrypt.hash(payload.password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE
      },
      include: {
        wallet: true
      }
    })

    await walletService.createWalletForUser(user.id)
    await botService.ensureDefaults(user.id)
    await portfolioService.ensureInitialSnapshot(user.id)

    const tokens = await this.createTokens({ id: user.id, email: user.email, role: user.role })
    await this.persistRefreshToken(user.id, tokens.refreshToken)

    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true }
    })

    if (!refreshedUser) {
      throw new ApiError(500, 'Failed to create user session')
    }

    return {
      user: this.sanitizeUser(refreshedUser),
      tokens
    }
  }

  async login(payload: { email: string; password: string }) {
    const email = payload.email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true }
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ApiError(401, 'Invalid credentials')
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash)
    if (!passwordOk) {
      throw new ApiError(401, 'Invalid credentials')
    }

    await botService.ensureDefaults(user.id)
    await portfolioService.ensureInitialSnapshot(user.id)

    const tokens = await this.createTokens({ id: user.id, email: user.email, role: user.role })
    await this.persistRefreshToken(user.id, tokens.refreshToken)

    return {
      user: this.sanitizeUser(user),
      tokens
    }
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken)
    const tokenHash = hashToken(refreshToken)

    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ApiError(401, 'Refresh token is invalid or expired')
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ApiError(401, 'Refresh token is invalid or expired')
    }

    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    })

    const tokens = await this.createTokens({ id: user.id, email: user.email, role: user.role })
    await this.persistRefreshToken(user.id, tokens.refreshToken)

    return tokens
  }

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
    return { message: 'Logged out successfully' }
  }
  

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    })

    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    return this.sanitizeUser(user)
  }
}

export const authService = new AuthService()