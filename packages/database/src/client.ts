import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export function createDatabaseClient(
  databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL
): PrismaClient {
  const resolvedUrl = databaseUrl?.trim();
  if (!resolvedUrl) {
    throw new Error('DATABASE_URL is required to connect to the SaaS database.');
  }
  const pool = new Pool({ connectionString: resolvedUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
