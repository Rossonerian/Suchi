# Suchi Production Architecture Specification

## 1. System Topology Overview

Suchi is an enterprise-grade multi-tenant workspace platform engineered for asynchronous engineering and product execution.

```
┌─────────────────────────┐          ┌─────────────────────────┐
│     Suchi Web App       │          │    Suchi Mobile App     │
│   (Next.js 14 Pages)    │          │  (Expo 57 / React 19)   │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                    │
             │ HTTPS / JSON                       │ HTTPS / Deep Links
             │ Cookies / Bearer                   │ Bearer Token / Scheme
             ▼                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                   Suchi Express ESM API                      │
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐  │
│  │   Better Auth Engine    │    │  Domain Context Bridge  │  │
│  │  (AuthUser, Session)    │───▶│  (UserProfile Linkage)  │  │
│  └─────────────────────────┘    └────────────┬────────────┘  │
│                                              │               │
│  ┌───────────────────────────────────────────▼─────────────┐  │
│  │             Authoritative Business Domain               │  │
│  │  - Organizations & Memberships (RBAC)                   │  │
│  │  - Projects, Tasks & Discussions                        │  │
│  │  - Meeting Orchestration & Calendar Sync                │  │
│  │  - Integrations (Google Calendar, Webhooks)             │  │
│  │  - Notification Engine & AI Capabilities                │  │
│  └───────────────────────────┬─────────────────────────────┘  │
│                              │                                │
│  ┌───────────────────────────▼─────────────────────────────┐  │
│  │       Bounded Connection Pool & Graceful Lifecycle      │  │
│  └───────────────────────────┬─────────────────────────────┘  │
└──────────────────────────────┼────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ Managed DB (Connection Pool)│       │  Direct DB (Migration DDL)  │
│       `DATABASE_URL`        │       │   `DIRECT_DATABASE_URL`     │
│   (Neon / RDS / Supabase)   │       │   (Direct Primary Instance) │
└─────────────────────────────┘       └─────────────────────────────┘
```

---

## 2. Better Auth "Option B" Identity Architecture

Suchi strictly decouples **identity authentication** from **tenant domain authorization** under the **Option B** design pattern.

### 2.1 Table Topology & Authority
* **Better Auth Domain (Authentication Only)**:
  * `AuthUser`: Contains verified identity credentials (email, password hash, verification status).
  * `AuthSession`: Ephemeral session token storage, token expiration, user agent metadata.
  * `AuthAccount`: Social / OAuth provider linkages.
  * `AuthVerification`: Email verification tokens and one-time password hashes.
* **Authoritative Domain (SaaS Tenancy & Operations)**:
  * `UserProfile`: Canonical application user record with `authUserId` foreign key reference to `AuthUser.id`.
  * `Organization`: Authoritative tenant boundary.
  * `OrganizationMembership`: Authoritative role assignment (`ADMIN`, `MEMBER`, `VIEWER`), status (`ACTIVE`, `DISABLED`), and domain entitlements.
  * `Project`, `Task`, `Meeting`, `IntegrationAccount`, `Notification`: Fully bound to `organizationId` foreign keys.

### 2.2 Invariant Rules
1. **Tenancy Ownership**: Better Auth does **not** manage or own `Organization` or `OrganizationMembership` tables. All organization memberships, invitations, and role assignments remain strictly governed by the Suchi database schema and domain authorization policies.
2. **Bridge Contract**: When a user authenticates via Better Auth, the session token resolves an `AuthUser`. The identity bridge retrieves or creates the matching `UserProfile` via `authUserId`.
3. **Immutability & Isolation**: All resource reads, mutations, searches, and AI interactions enforce `where: { organizationId: context.organizationId }`. Requests without a valid organization context or crossing organization boundaries are rejected with `401 UNAUTHENTICATED` or `403 FORBIDDEN`.

---

## 3. Production Hardening & Operational Resilience

### 3.1 Startup Configuration Validation
All runtime configuration is validated at process startup in `backend/saas/config.js`. If any required environment variable is missing, malformed, or insecure, the process halts immediately with structured diagnostic errors:
* `PORT`: Validated integer.
* `NODE_ENV`: Enforced `production`, `staging`, `test`, or `development`.
* `DATABASE_URL`: Must be a valid `postgresql://` URI.
* `BETTER_AUTH_SECRET`: Enforces minimum length of 32 characters.
* `BETTER_AUTH_URL`: In production, enforces valid HTTPS URL format.
* `CORS_ORIGIN`: In production, prohibits wildcards (`*`) and validates parseable origins.
* `INTEGRATION_TOKEN_SECRET_KEY`: Validated 32-byte hexadecimal string for authenticated AES-GCM token encryption.

### 3.2 Bounded Connection Pooling
Database connections are managed via a bounded connection pool in `backend/saas/database.js`:
* `PGMAXCONNECTIONS`: Default 20 (configurable via environment).
* `PGCONNECT_TIMEOUT_MS`: 10,000ms connection timeout to prevent hanging connections.
* `PGIDLE_TIMEOUT_MS`: 30,000ms idle client termination.
* Direct connections for Prisma migration DDL use `DIRECT_DATABASE_URL`.

### 3.3 Graceful Shutdown & Lifecycle Management
Server process termination (`SIGTERM`, `SIGINT`) is orchestrated in `backend/saas/server.js`:
1. Logs `shutdown_initiated` with timestamp and triggering signal.
2. Stops accepting new inbound HTTP requests (`httpServer.close()`).
3. Drains in-flight HTTP connections.
4. Flushes and disconnects Prisma client and PostgreSQL pool (`closeSaasDatabase()`).
5. Armed with a 10-second watchdog timer to forcefully terminate if resource draining hangs.
6. Emits `shutdown_completed` and exits cleanly with code 0.

### 3.4 Liveness and Readiness Probes
* **Liveness (`/health` & `/api/health`)**: Process uptime and heartbeat check. Returns `200 OK` without touching the database, allowing orchestrators to detect process crashes without cascading during database failovers.
* **Readiness (`/ready` & `/api/ready`)**: Active connectivity probe. Executes `SELECT 1` against the authoritative database. Returns `200 OK` when healthy, or `503 Service Unavailable` (`DATABASE_UNAVAILABLE`) if the database connection fails.

### 3.5 Security Headers & Transport Hardening
Every HTTP response is guarded by production middleware:
* **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains`.
* **Content-Security-Policy (CSP)**: Default restricted, object-src 'none', script-src 'self'.
* **Frame Protection**: `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`.
* **MIME Sniffing & XSS**: `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 0`.
* **Request Correlation**: Generates or propagates `X-Request-ID` across every transaction for structured log tracing.
* **Cookie Isolation**: Uses `cookiePrefix: "suchi"`, with `Secure` and appropriate `SameSite` flags.
