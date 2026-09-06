import { defineConfig } from 'prisma/config';

// Prisma 7 moved connection URLs out of schema.prisma. A local placeholder
// keeps schema validation and generated-client checks offline; migrations and
// database commands still require DATABASE_URL to be supplied explicitly.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/nidar_saas?schema=public',
  },
});
