# Database package (`@suchi/database`)

This package contains the authoritative PostgreSQL schema, Prisma 7 configuration, migrations, and client runtime for Suchi.

## Architecture

- **Stable Toolchain & Runtime**: Canonical **Prisma 7.10** (`prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@^7.10.0`) without release-candidate tooling or dual-toolchain complexity.
- **Better Auth Option B**: `AuthUser`, `AuthSession`, `AuthAccount`, and `AuthVerification` remain authoritative for authentication, bridged via `UserProfile.authUserId`. All domain tenancy (`Organization`, `OrganizationMembership`, `Project`, etc.) remains strictly owned by the Suchi domain.
- **Relational Integrity**: Migration `20260911180000_prisma8_contract_constraints` enforces PostgreSQL `UNIQUE` constraints on 1:1 foreign key targets (`UserProfile.authUserId`, `AiUsageRecord.runId`, `OrganizationSettings.organizationId`, `Subscription.organizationId`, `Subscription.externalId`) using existing unique indexes.

## Common Commands

```bash
# Validate schema
npm run db:validate

# Generate Prisma Client
npm run db:generate

# Check database status against migrations
npm run db:status

# Deploy committed migrations to target database
npm run db:migrate:deploy
```

## Managed Database Deployment (Prisma Postgres / Neon / Railway)

Suchi can be backed by any standard managed PostgreSQL instance (such as **Prisma Postgres**, **Neon**, **Railway PostgreSQL**, Supabase, or AWS RDS) without requiring Prisma repository auto-deploy or cloud git integrations.

Deployment is controlled via standard environment variables and CI/CD deploy hooks:

```bash
# Connection pooling URL for runtime queries (e.g. pgBouncer / Neon pooled endpoint)
DATABASE_URL="postgresql://user:password@host:5432/suchi_prod?sslmode=require"

# Direct unpooled URL for running DDL migrations
DIRECT_DATABASE_URL="postgresql://user:password@direct-host:5432/suchi_prod?sslmode=require"
```

To deploy migrations to staging or production, execute:

```bash
npm run db:migrate:deploy
```

`src/client.ts` provides the server-only Prisma/`pg` adapter runtime. It does not run in browser or mobile clients and requires `DATABASE_URL` at runtime.
