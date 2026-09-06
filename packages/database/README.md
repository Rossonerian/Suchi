# Database package

This package contains the target PostgreSQL/Prisma schema. The initial
migration was generated and applied against a disposable local PostgreSQL 16
instance; no production database was touched. The legacy Mongo API remains the
active compatibility surface until tenant-aware services and migration tooling
exist.

Validate the schema with:

```bash
npm run validate --workspace @nidar/database
npm run generate --workspace @nidar/database
```

Database commands require an explicit `DATABASE_URL`; the checked-in Prisma
config uses a localhost placeholder only so validation remains offline. Apply
the committed migration with `npm run migrate:deploy --workspace
@nidar/database` after configuring a development database.
