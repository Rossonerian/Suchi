import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load environment variables following repository conventions.
// In local development, backend/.env is standard.
// Candidate locations are checked in order without overwriting existing environment variables.
export function loadPrismaDotenv(currentDir = path.dirname(fileURLToPath(import.meta.url))): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(currentDir, '.env'),
    path.resolve(currentDir, '../../.env'),
    path.resolve(currentDir, '../../backend/.env'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
}

// Staging-safe URL resolution:
// 1. Prefers DIRECT_DATABASE_URL (for unpooled DDL/migrations) over DATABASE_URL.
// 2. Otherwise falls back to DATABASE_URL.
// 3. Fails closed by returning undefined if neither is present.
// NEVER falls back to localhost or a default development database.
export function resolveDatasourceUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const direct = env.DIRECT_DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }
  const standard = env.DATABASE_URL?.trim();
  if (standard) {
    return standard;
  }
  return undefined;
}

export function getRequiredDatasourceUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = resolveDatasourceUrl(env);
  if (!url) {
    throw new Error(
      'Database connection URL is required for Prisma migrations and status. Neither DIRECT_DATABASE_URL nor DATABASE_URL was found in environment or .env files.'
    );
  }
  return url;
}

loadPrismaDotenv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: resolveDatasourceUrl(),
  },
});
