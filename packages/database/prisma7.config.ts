import { defineConfig } from 'prisma/config';

// Prisma 7 moved connection URLs out of schema.prisma.
// DIRECT_DATABASE_URL is prioritized for migrations/DDL when connection pooling (pgbouncer)
// is used on DATABASE_URL in managed PostgreSQL environments (Neon, Supabase, RDS).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/suchi_saas?schema=public',
  },
});
