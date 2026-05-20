import crypto from 'crypto'
import { env } from '../config/env'

const key = Buffer.from(env.WALLET_ENCRYPTION_KEY, 'base64')

if (key.length !== 32) {
  throw new Error('WALLET_ENCRYPTION_KEY must decode to exactly 32 bytes')
}

export const encryptSecret = (plainText: string) => {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedText: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  }
}

export const decryptSecret = (encryptedText: string, iv: string, authTag: string) => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final()
  ])
  return decrypted.toString('utf8')
}

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')