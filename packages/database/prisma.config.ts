import { definePrismaConfig } from 'prisma/config';
import { defineConfig as definePostgresConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: 'prisma/contract.prisma',
    db: {
      connection: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://nidar:57a11c3b61e0ba86d75be63b7b7733e0d0653e6c269fb37e68e4b83c47a67e2d@localhost:55432/nidar_dev?schema=public',
    },
    migrations: {
      dir: 'prisma/migrations',
    },
  }),
});
