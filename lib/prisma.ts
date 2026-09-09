import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Executes a database operation with automatic retries and exponential backoff
 * to seamlessly handle Neon PostgreSQL free-tier compute cold starts.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;
      const error = err as { code?: string; message?: string };
      const isNeonColdStart =
        error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.code === 'P1017' ||
        error?.message?.includes('Can\'t reach database server') ||
        error?.message?.includes('Connection lost') ||
        error?.message?.includes('Connection refused') ||
        error?.message?.includes('Connection closed') ||
        error?.message?.includes('terminating connection') ||
        error?.message?.includes('timeout');

      if (isNeonColdStart && attempt <= maxRetries) {
        const waitTime = delayMs * attempt;
        console.warn(
          `[Neon DB] Free-tier compute waking up (attempt ${attempt}/${maxRetries}). Retrying in ${waitTime}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (isNeonColdStart) {
        throw new Error(
          'The database is waking up from free-tier suspend mode. Please wait a moment and try again.'
        );
      }

      throw err;
    }
  }
}
