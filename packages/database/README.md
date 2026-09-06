# Database package

This package contains the proposed PostgreSQL/Prisma target schema. It is
intentionally offline in Phase 1: no `DATABASE_URL` is committed, no local or
production database is modified, and the legacy Mongo API remains the active
compatibility surface until tenant-aware services and migration tooling exist.

Validate the schema with:

```bash
npm run validate --workspace @nidar/database
```
