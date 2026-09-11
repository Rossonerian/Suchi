# Suchi — Modern Multi-Tenant Workspace Platform

Suchi is an enterprise-grade multi-tenant workspace platform engineered for asynchronous engineering and product execution. It combines team task orchestration, project management, meeting scheduling with calendar sync, and AI-assisted workflows across web, mobile, and API surfaces.

```
Suchi Web (Next.js 14)          Suchi Mobile (Expo 57 / React 19)
         │                                       │
         └───────────────────┬───────────────────┘
                             ▼
                    Express ESM API (Suchi)
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
Better Auth Domain                          Authoritative SaaS Domain
- AuthUser                                  - UserProfile (authUserId -> AuthUser.id)
- AuthSession                               - Organization (Authoritative Tenant)
- AuthAccount                               - OrganizationMembership (RBAC & Status)
- AuthVerification                          - Projects, Tasks, Meetings, Notifications
                                            - Integrations & AI Authorization
                             │
                             ▼
                    PostgreSQL + Prisma 7
             (Bounded Pool / Direct Migration)
```

---

## 1. Monorepo Architecture

- **`backend/`** (`suchi-backend`): Node 22 Express ESM API service. Handles authentication via Better Auth (Option B architecture), multi-tenant authorization, PostgreSQL data persistence with Prisma 7, bounded connection pooling, and graceful lifecycle management.
- **`frontend/`** (`suchi-web`): Next.js 14 web client featuring responsive workspace navigation, task boards, project management, meeting scheduling, team administration, and AI capabilities.
- **`apps/mobile/`** (`@suchi/mobile`): Expo SDK 57 (React Native 0.86 / React 19) mobile application supporting iOS and Android with secure Better Auth token storage and deep linking.
- **`packages/database/`** (`@suchi/database`): Authoritative Prisma 7 schema, PostgreSQL client factory, and migration definitions.
- **`packages/domain/`** (`@suchi/domain`): Shared multi-tenant authorization logic, RBAC rules, and core domain entities.
- **`packages/schemas/`** (`@suchi/schemas`): Shared Zod validation schemas for cross-tier validation.
- **`docs/`**: Comprehensive architecture specifications, deployment runbooks, rebrand documentation, and operational guides.

---

## 2. Quick Start (Local Development)

### Prerequisites
- Node.js `>= 22.0.0`
- PostgreSQL `>= 16.0` (or local Docker container)
- npm `>= 10.0.0`

### 1. Database Setup
```bash
# Set your local database credentials
export DATABASE_URL="postgresql://user:password@localhost:5432/suchi_dev?schema=public"

# Validate and apply migrations
npm run db:validate
npm run db:migrate:deploy
npm run db:generate
```

### 2. Backend Service
```bash
cd backend
cp .env.example .env
# Populate DATABASE_URL, BETTER_AUTH_SECRET (min 32 chars), and BETTER_AUTH_URL
npm run dev
# Running on http://localhost:5000
```

### 3. Frontend Web Client
```bash
cd frontend
cp .env.local.example .env.local
npm run dev
# Running on http://localhost:3000
```

### 4. Mobile Client
```bash
cd apps/mobile
cp .env.example .env
npm start
```

---

## 3. Production Deployment & Staging Setup

Suchi is engineered for automated deployment across modern cloud platforms:

- **Database (Neon / Supabase / AWS RDS / Prisma Postgres)**:
  - Runtime pooled connection: `DATABASE_URL`
  - Direct migration connection (bypassing PgBouncer): `DIRECT_DATABASE_URL`
  - Deploy migrations: `npm run db:migrate:deploy`
- **Backend API (Railway / Render / AWS ECS / Cloud Run)**:
  - Multi-stage production container: `docker build -t suchi-backend:latest -f backend/Dockerfile .`
  - Liveness check probe: `GET /api/health`
  - Readiness check probe: `GET /api/ready`
- **Frontend (Vercel / Cloudflare Pages)**:
  - Framework: Next.js
  - Root directory: `frontend`
  - Environment variables: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

For step-by-step deployment instructions, refer to [`docs/SUCHI-DEPLOYMENT-RUNBOOK.md`](docs/SUCHI-DEPLOYMENT-RUNBOOK.md).

---

## 4. Verification & Testing

Run the full verification suite across all repository workspaces:

```bash
# 1. Root domain, database tests and TypeScript typecheck
npm run test:domain
npm run test:database
npm run typecheck

# 2. Database schema validation & client generation
npm run db:validate
npm run db:generate

# 3. Backend test suite (94 passing tests)
npm --prefix backend test

# 4. Frontend tests, linting, and Next.js production build
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build

# 5. Mobile TypeScript typecheck and Expo linting
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run lint
```

---

## 5. Security & Invariants

- **Secrets Handling**: Real API keys, database credentials, and auth secrets must **never** be checked into version control. Environment variables are loaded strictly at process boot with fail-fast validation in `backend/saas/config.js`.
- **Identity Isolation (Option B)**: Better Auth owns only credential authentication (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`). The Suchi domain remains authoritative for organizations, memberships, permissions, projects, tasks, and meetings.
- **Deep Linking Protocol**: Supports `suchi://` natively with backward-compatible fallback for `nidar://`.
