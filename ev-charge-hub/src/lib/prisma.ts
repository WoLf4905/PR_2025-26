import { PrismaClient } from '../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Database URL - use absolute path for the SQLite database
// The DATABASE_URL should be set in .env as file:./dev.db
const getDatabaseUrl = (): string => {
  // For production, use environment variable
  if (process.env.DATABASE_URL) {
    // If it's a relative file URL, convert to absolute
    if (process.env.DATABASE_URL.startsWith('file:./')) {
      return process.env.DATABASE_URL.replace(
        'file:./',
        `file:${process.cwd()}/`
      )
    }
    return process.env.DATABASE_URL
  }
  // Default to dev.db in current working directory
  return `file:${process.cwd()}/dev.db`
}

// For SQLite, we use libsql adapter with file URL
const adapter = new PrismaLibSql({
  url: getDatabaseUrl(),
})

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
