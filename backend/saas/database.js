const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { AppError } = require('../utils/validation');

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

module.exports = { getSaasDatabase, resetSaasDatabaseForTests };
