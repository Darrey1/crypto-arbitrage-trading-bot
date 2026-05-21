import { createServer, Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { UserRole } from '@prisma/client'
import { verifyAccessToken } from '../lib/jwt'
import { JwtUser } from '../types/domain'
import cors from 'cors'

type SocketEventPayload = unknown

class SocketService {
  private io: SocketServer | null = null

  init(server: HttpServer, corsOptions: cors.CorsOptions) {
    if (this.io) {
      return this.io
    }

    this.io = new SocketServer(server, {
      cors: corsOptions
    })

    this.io.use((socket, next) => {
      const token = this.getToken(socket)
      if (!token) {
        console.log("No token found")
        next()
        return
      }

      try {
        const payload = verifyAccessToken(token)
        socket.data.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role as UserRole
        } satisfies JwtUser
        next()
      } catch (error) {
        console.error('Error occurred while verifying access token:', error)
        next()
      }
    })

    this.io.on('connection', (socket) => {
      const user = socket.data.user as JwtUser | undefined
      if (user) {
        socket.join(this.getUserRoom(user.id))
      }
    })

    return this.io
  }

  private getToken(socket: Socket) {
    const authToken = socket.handshake.auth?.token
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken
    }

    const header = socket.handshake.headers.authorization
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7)
    }

    return null
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`
  }

  emitToAll(event: string, payload: SocketEventPayload) {
    this.io?.emit(event, payload)
  }

  emitToUser(userId: string, event: string, payload: SocketEventPayload) {
    this.io?.to(this.getUserRoom(userId)).emit(event, payload)
  }

  joinUser(socket: Socket, userId: string) {
    socket.join(this.getUserRoom(userId))
  }
}

export const socketService = new SocketService()