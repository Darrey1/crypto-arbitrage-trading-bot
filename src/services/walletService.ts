import { Wallet } from 'ethers'
import { prisma } from '../config/prisma'
import { decryptSecret, encryptSecret } from '../lib/crypto'
import { WalletPublicView } from '../types/domain'

class WalletService {
  async createWalletForUser(userId: string) {
    const wallet = Wallet.createRandom()
    const encrypted = encryptSecret(wallet.privateKey)

    return prisma.wallet.create({
      data: {
        userId,
        address: wallet.address,
        encryptedPrivateKey: encrypted.encryptedText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        chainId: 1,
        keyVersion: 1
      }
    })
  }

  async getWalletForUser(userId: string): Promise<WalletPublicView | null> {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) {
      return null
    }

    return {
      address: wallet.address,
      chainId: wallet.chainId,
      keyVersion: wallet.keyVersion,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    }
  }

  async rotateWallet(userId: string) {
    const newWallet = Wallet.createRandom()
    const encrypted = encryptSecret(newWallet.privateKey)

    await prisma.wallet.upsert({
      where: { userId },
      update: {
        address: newWallet.address,
        encryptedPrivateKey: encrypted.encryptedText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: { increment: 1 }
      },
      create: {
        userId,
        address: newWallet.address,
        encryptedPrivateKey: encrypted.encryptedText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        chainId: 1,
        keyVersion: 1
      }
    })

    return this.getWalletForUser(userId)
  }

  async getDecryptedPrivateKey(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) {
      return null
    }

    return decryptSecret(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag)
  }
}

export const walletService = new WalletService()