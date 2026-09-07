import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppError } from '../utils/validation.js';

let client;

function getSaasDatabase() {
  if (client) return client;
  if (!process.env.DATABASE_URL) {
    throw new AppError('The SaaS database is not configured.', 503, 'SAAS_DATABASE_UNAVAILABLE');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  client = new PrismaClient({ adapter: new PrismaPg(pool) });
  return client;
}

function resetSaasDatabaseForTests() {
  client = undefined;
}

export { getSaasDatabase, resetSaasDatabaseForTests };
