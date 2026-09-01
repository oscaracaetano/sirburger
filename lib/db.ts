import { PrismaClient } from '@prisma/client'

// Clean up channel_binding parameter if injected by Neon/Vercel (can cause SSL handshake issues in serverless)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('channel_binding=')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .replace(/[?&]channel_binding=[^&]+/, '')
    .replace(/\?$/, '')
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
