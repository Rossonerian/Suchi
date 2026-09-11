# Suchi Deployment & Operations Runbook

## 1. Pre-Deployment Checklist

Before deploying Suchi API, Web, or Mobile to staging or production environments, verify the following prerequisites:

- [ ] All test suites pass cleanly across all workspaces:
  - `npm run test:domain && npm run test:database && npm run typecheck` (Root)
  - `npm test` (Backend: 94 tests passing)
  - `npm run lint && npm test && npm run build` (Frontend)
  - `npm run typecheck && npm run lint` (Mobile)
- [ ] Production secrets have been generated using cryptographically secure sources (min 32 bytes).
- [ ] Database credentials, pooling URLs, and direct migration URLs are provisioned.
- [ ] DNS records and TLS certificates are active for API and Web domains.

---

## 2. Environment Variables Specification

### 2.1 Backend API (`backend/.env` / Container Environment)

| Variable | Type | Required | Production Rule |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | Yes | Must be `production` or `staging`. |
| `PORT` | Number | Yes | Default `5000`. |
| `DATABASE_URL` | URI | Yes | Pooled connection string (e.g., Neon pooled or Supabase pooler). |
| `DIRECT_DATABASE_URL` | URI | Recommended | Direct non-pooled connection string required for migrations/DDL. |
| `BETTER_AUTH_SECRET` | String | Yes | Minimum 32 characters generated via `openssl rand -hex 32`. |
| `BETTER_AUTH_URL` | URL | Yes | Must begin with `https://` (e.g. `https://api.suchi.app`). |
| `CORS_ORIGIN` | URL(s) | Yes | Comma-separated allowed web origins. No wildcards permitted. |
| `INTEGRATION_TOKEN_SECRET_KEY` | Hex | Recommended | Exactly 64 hex characters (32 bytes) for AES-256-GCM encryption. |
| `PGMAXCONNECTIONS` | Number | No | Max pool connections. Default `20`. |
| `PGCONNECT_TIMEOUT_MS` | Number | No | Connection timeout in ms. Default `10000`. |
| `PGIDLE_TIMEOUT_MS` | Number | No | Idle client timeout in ms. Default `30000`. |

### 2.2 Frontend Web App (`frontend/.env.local` / Hosting Provider)

| Variable | Type | Required | Production Rule |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | URL | Yes | Full public URL of the web dashboard (e.g. `https://app.suchi.app`). |
| `NEXT_PUBLIC_API_URL` | URL | Yes | Full public URL of the API gateway (e.g. `https://api.suchi.app`). |
| `BETTER_AUTH_URL` | URL | Yes | Backend auth base URL (e.g. `https://api.suchi.app`). |

### 2.3 Mobile App (`apps/mobile/.env`)

| Variable | Type | Required | Production Rule |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | URL | Yes | API base URL (e.g. `https://api.suchi.app`). |

---

## 3. Database Migration Sequence

Prisma migrations must be executed **before** deploying new API containers to prevent runtime schema mismatch.

### 3.1 Migration Command Sequence
1. Set the direct database connection URL (bypassing connection poolers like PgBouncer):
   ```bash
   export DIRECT_DATABASE_URL="postgresql://user:password@direct.db.host:5432/suchi_prod?sslmode=require"
   ```
2. Verify pending migration status:
   ```bash
   npm run db:status
   ```
3. Apply pending migrations using Prisma deploy:
   ```bash
   npm run db:migrate:deploy
   ```
4. Verify schema validity:
   ```bash
   npm run db:validate
   ```

> [!IMPORTANT]
> Always execute migrations against `DIRECT_DATABASE_URL`. Connection poolers in transaction mode do not support advisory locks and DDL statements required by Prisma migrate.

---

## 4. Backend Container Deployment

### 4.1 Docker Image Build
Build the multi-stage, rootless production image from the repository root:
```bash
docker build -t suchi-backend:latest -f backend/Dockerfile .
```

### 4.2 Health & Readiness Probe Configuration
When configuring container orchestrators (Kubernetes, ECS, Cloud Run, Nomad), use these probe specifications:

* **Liveness Probe**:
  * Path: `/api/health`
  * Port: `5000`
  * Initial Delay: 5 seconds
  * Period: 15 seconds
  * Timeout: 5 seconds
  * Failure Threshold: 3
* **Readiness Probe**:
  * Path: `/api/ready`
  * Port: `5000`
  * Initial Delay: 5 seconds
  * Period: 10 seconds
  * Timeout: 5 seconds
  * Failure Threshold: 2

### 4.3 Container Launch Example
```bash
docker run -d \
  --name suchi-api \
  --restart unless-stopped \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e DATABASE_URL="postgresql://user:password@pool.db.host:5432/suchi_prod?sslmode=require" \
  -e BETTER_AUTH_SECRET="<32-character-secret>" \
  -e BETTER_AUTH_URL="https://api.suchi.app" \
  -e CORS_ORIGIN="https://app.suchi.app" \
  -e INTEGRATION_TOKEN_SECRET_KEY="<64-hex-character-key>" \
  suchi-backend:latest
```

---

## 5. Rollback & Disaster Recovery Procedures

### 5.1 Application Container Rollback
If a defect is detected post-deployment:
1. Re-route ingress / load balancer traffic to the previous known-good container image tag (`suchi-backend:<previous-sha>`).
2. Verify `/health` and `/ready` probes on the active target.
3. Drain and decommission faulty containers.

### 5.2 Database Rollback Considerations
* Backward-compatible migrations: Ensure additions are additive.
* If a migration must be reverted, inspect `packages/database/prisma/migrations/` and apply an explicit forward migration resolving the change.
