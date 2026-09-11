import { defineConfig } from '@prisma/prisma7/config';

// Prisma 7 moved connection URLs out of schema.prisma.
// DIRECT_DATABASE_URL is prioritized for migrations/DDL when connection pooling (pgbouncer)
// is used on DATABASE_URL in managed PostgreSQL environments (Neon, Supabase, RDS).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://nidar:57a11c3b61e0ba86d75be63b7b7733e0d0653e6c269fb37e68e4b83c47a67e2d@localhost:55432/nidar_dev?schema=public',
  },
});
