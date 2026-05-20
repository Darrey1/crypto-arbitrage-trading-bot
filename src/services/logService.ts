import { LogLevel } from '@prisma/client'
import { prisma } from '../config/prisma'
import { BotLogView, ApiListResult } from '../types/domain'
import { getPagination } from '../lib/pagination'

class LogService {
  async createLog(userId: string | null, level: LogLevel, message: string, metadata?: unknown) {
    return prisma.botLog.create({
      data: {
        userId,
        level,
        message,
        metadata: metadata as any
      }
    })
  }

  async getLogs(params: { page?: number; limit?: number; level?: string; userId?: string } = {}): Promise<ApiListResult<BotLogView>> {
    const { page, limit, skip } = getPagination(params.page, params.limit)
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.level ? { level: params.level as LogLevel } : {})
    }

    const [items, total] = await Promise.all([
      prisma.botLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.botLog.count({ where })
    ])

    return {
      items: items.map((item) => ({
        id: item.id,
        level: item.level,
        message: item.message,
        metadata: item.metadata,
        createdAt: item.createdAt
      })),
      page,
      limit,
      total
    }
  }
}

export const logService = new LogService()