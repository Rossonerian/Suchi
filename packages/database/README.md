# Database package (`@suchi/database`)

This package contains the authoritative PostgreSQL schema, Prisma 8 contract, and client runtime for Suchi.

## Architecture

- **Prisma 8 (`@prisma/orm-postgres`)**: Authoritative contract-first schema definition (`prisma/contract.prisma`) and configuration (`prisma.config.ts`). Compiles to typed contracts (`prisma/contract.json` & `prisma/contract.d.ts`) and provides schema drift detection and signing (`prisma db sign` / `prisma db verify`).
- **Prisma Client Runtime (`@prisma/client` + `@prisma/prisma7`)**: Provides runtime data model introspection and query execution used by `@better-auth/prisma-adapter` and Express services via `prisma7.config.ts`.
- **Better Auth Option B**: `AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification` remain authoritative for authentication, bridged via `UserProfile.authUserId`. All domain tenancy (`Organization`, `OrganizationMembership`, `Project`, etc.) remains strictly owned by Suchi domain.

## Common Commands

```bash
# Validate contract and emit compiled artifacts (contract.json / contract.d.ts)
npm run db:validate
# or within packages/database:
npm run contract:emit

# Generate Prisma Client and emit contract
npm run db:generate

# Check database status against migrations
npm run db:status

# Deploy migrations to a target PostgreSQL instance
npm run db:migrate:deploy

# Sign the target database against the compiled contract
npm run db:sign

# Verify database marker and schema match the compiled contract
npm run db:verify
```

## Database Connection Configuration

Database commands require `DATABASE_URL` (and optionally `DIRECT_DATABASE_URL` for direct DDL migrations when using connection pooling proxies like PgBouncer, Neon, Supabase, or RDS).

```bash
DATABASE_URL="postgresql://user:password@host:5432/suchi_prod?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/suchi_prod?sslmode=require"
```
