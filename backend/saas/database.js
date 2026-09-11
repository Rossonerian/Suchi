import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppError } from '../utils/validation.js';

let client;
let pool;

export function getSaasDatabase() {
  if (client) return client;
  if (!process.env.DATABASE_URL) {
    throw new AppError('The SaaS database is not configured.', 503, 'SAAS_DATABASE_UNAVAILABLE');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PGMAXCONNECTIONS || 20),
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 5000),
    idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS || 30000),
  });

  client = new PrismaClient({ adapter: new PrismaPg(pool) });
  return client;
}

export async function closeSaasDatabase() {
  if (client) {
    await client.$disconnect().catch(() => {});
    client = undefined;
  }
  if (pool) {
    await pool.end().catch(() => {});
    pool = undefined;
  }
}

export function resetSaasDatabaseForTests() {
  client = undefined;
  pool = undefined;
}
