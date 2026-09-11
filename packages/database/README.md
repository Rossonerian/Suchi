# Database package (`@suchi/database`)

This package contains the authoritative PostgreSQL/Prisma schema and client for Suchi.
Prisma 7 manages migrations and database schema generation.

Validate the schema with:

```bash
npm run db:validate
npm run db:generate
```

Database commands require an explicit `DATABASE_URL` (or `DIRECT_DATABASE_URL` for direct DDL migrations).
Apply committed migrations with:

```bash
npm run db:migrate:deploy
```

`src/client.ts` is the server-only Prisma/`pg` adapter. It does not run in browser or mobile clients and requires `DATABASE_URL` at runtime.
