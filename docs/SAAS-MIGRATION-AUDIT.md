# NIDAR Dashboard SaaS migration audit

**Audit date:** 2026-09-06
**Repository:** `Nidar-Dashboard`
**Audit scope:** current repository only; no production database, credentials, or external provider was contacted.

## Executive summary

This is a small, working NIDAR-specific monorepo with two independent npm
projects:

```text
browser
  -> Next.js 14 Pages Router (frontend/)
  -> fetch wrapper (frontend/lib/api.js)
  -> Express REST API (backend/)
  -> Mongoose models/routes
  -> MongoDB
  -> Nodemailer -> Gmail SMTP (meeting invitations only)
```

The current baseline is useful and should be migrated incrementally, but it is
not yet a multi-tenant SaaS. There is no organization boundary in the data
model, no shared service layer, no Clerk identity, no PostgreSQL, no mobile
client, no durable jobs, no object storage, no calendar integration, no AI
server, and no billing.

The first production gate is tenant-aware identity and authorization. Two
legacy issues must be fixed before exposing the existing application as a SaaS:

1. `frontend/pages/teams/[teamId].js` calls `getMember()`, while the migration
   shim intentionally always returns `null`; the page therefore redirects even
   for a valid server session.
2. `PATCH /api/members/:id` is protected only by `requireAuth`; it does not
   constrain the target to the authenticated member or an authorized admin.

These findings are recorded as migration work, not silently changed during the
audit.

## Repository and Git state

- `backend/` is CommonJS Express 4 + Mongoose 8, targeting Node `>=20`.
- `frontend/` is plain JavaScript Next.js 14 Pages Router + React 18.
- There is no root `package.json`; the root lockfile is an empty npm lockfile.
- `pnpm` and `yarn` are not installed in the audit environment; npm 11 is used.
- Node in the audit environment is `v24.14.0`; CI uses Node 22.
- `main` is clean at `195274e` and currently matches `origin/main`.
- `backup-before-rebase-resolution` remains at the pre-resolution base commit
  `8e03233`.
- Existing `.env` and `.env.local` files are ignored and were not inspected for
  values. Only `.env.example` files are tracked.

## Existing architecture

### Frontend

Pages Router entry points:

- `/` — email/password sign-in.
- `/claim-invite` — one-time invitation preview and password activation.
- `/dashboard` — four-team board, filters, KPI strip, chart, DataTable or
  Kanban view, plans, meetings, agenda, command palette, and task sheet.
- `/teams/[teamId]` — legacy full-width team view.
- `/profile` — current member profile and assigned tasks.
- `/admin/members` — invitation and account administration.

`frontend/lib/api.js` is the only browser API boundary. It sends credentials
with `fetch` and translates non-2xx responses to `ApiError`. Server state is
kept in local React state; there is no React Query/SWR cache or global store.
`Providers` supplies `next-themes` and Radix tooltip context. `_app.js` mounts
the Sonner `Toaster` once.

The UI has a local shadcn-style component set in `components/ui`, Tailwind CSS
v4/PostCSS, TanStack Table, React Hook Form/Zod task forms, Recharts metrics,
`cmdk`, dnd-kit, Lucide, Sonner, a calendar, responsive sidebar, and native
View Transitions feature detection. The old inline-style components still
coexist with the newer dashboard components.

### Backend

`backend/app.js` configures Helmet, CORS, JSON body limits, rate limiting,
same-origin mutation checks, health/mission routes, and the authenticated REST
routers. `backend/utils/auth.js` resolves an opaque `nidar_session` cookie to a
MongoDB `Session` and populated `Member`; `publicMember` strips password data.

Current collections/models:

| Model | Current meaning |
| --- | --- |
| `Member` | NIDAR person, fixed team, global `admin/member` role, password/session status |
| `Team` | One of four globally unique NIDAR teams |
| `Task` | Team task with four statuses, one assignee, optional AirMouse sub-problem and due date |
| `Plan` | Dated team progress entry with text or an external URL |
| `Meeting` | Global meeting with member invitees and SMTP delivery state |
| `Invitation` | Hashed one-time invitation token tied to a team/member role |
| `Session` | Hashed opaque cookie session with TTL |

The API has no organization, project, membership, permissions, audit,
notification, integration, attachment, AI, billing, or usage entities. Most
read routes query globally. Task and plan mutations enforce same-team access;
meeting reads/creation and generic member mutation need tenant-aware
authorization in the target design.

## Actual user journeys

### Sign in and invitation claim

1. `/` collects email/password and calls `POST /api/auth/login`.
2. The API verifies an active member's scrypt hash and issues a rotating,
   expiring HttpOnly `nidar_session` cookie.
3. `/claim-invite?token=...` calls `GET /api/auth/invite/:token`, shows the
   invitation, then calls `POST /api/auth/claim-invite` with a new password.
4. Claiming marks the hashed invitation used, activates/updates the member,
   revokes old sessions, and establishes a new session.

### Dashboard load

`/dashboard` clears the legacy local-storage identity, calls `GET /api/auth/me`,
then loads teams, tasks, meetings, mission deadline, and plans in parallel.
It derives team buckets, metrics, filters, and progress in React state. A 401
redirects to `/`; other failures render a retry notice.

### Tasks

- Creation is through a per-team `AddTaskForm` and `POST /api/tasks`; backend
  validation enforces title, ObjectId, date, status, and same-team assignee.
- Editing is through `TaskForm` in `TaskDetailSheet` or the table status select.
- Status edits optimistically update local team state, call `PATCH /api/tasks/:id`,
  then refetch; failures roll back and toast an error.
- Deletion uses a shadcn alert dialog and `DELETE /api/tasks/:id`.
- The legacy team page still uses `TaskItem`/`TaskDetailModal` and currently has
  the broken local-session bootstrap described above.

### Members and administration

An authenticated administrator loads `/api/admin/members` and `/api/teams`,
creates one-time invitations, resets legacy access, changes team/role/status,
revokes sessions, and copies the claim URL. Admin routes enforce the global
`admin` role, but the model is global rather than organization-scoped.

### Plans

Dashboard `PlanUpload` posts a team, title, content, safe HTTP(S) URL, fixed
phase, and date to `POST /api/plans`; `PlansList` renders and deletes entries.
This is a progress log, not a project/milestone system.

### Meetings and email

`MeetingScheduler` collects title, local date/time, optional agenda/link, and
active member checkboxes. `POST /api/meetings` persists the meeting first, then
uses Nodemailer/Gmail SMTP to email invitees. Delivery state is `pending`,
`sent`, or `failed`; organizers can retry failed delivery. There is no calendar
provider event, timezone field, reminder job, cancellation flow, or external
mapping.

### Profile and team views

`/profile` gets the current member through `/api/auth/me`, displays assigned
tasks, and currently submits email/role through the under-authorized generic
member PATCH route. `/teams/[teamId]` uses the obsolete local identity shim and
must be moved to server-derived identity before migration.

## Reusable functionality classification

| Area | Decision | Notes |
| --- | --- | --- |
| `frontend/lib/api.js` | Refactor/migrate | Preserve the fetch/error contract while replacing paths with versioned, tenant-aware API calls. |
| `TaskForm`, `DataTable`, `TaskKanbanBoard` | Preserve/refactor | Strong interaction patterns; move types/schemas to shared packages. |
| `TaskDetailSheet`, shadcn primitives, Sonner | Preserve/wrap | Reuse in the SaaS shell and mobile-specific equivalents. |
| `Header`, `MissionSidebar`, `TaskToolbar` | Refactor | Replace mission labels with organization-aware navigation and permissions. |
| `MeetingScheduler`, `MeetingsList`, `MeetingAgenda` | Refactor | Keep UX concepts; generalize model and add provider/reminder state. |
| `PlansList`, `PlanUpload` | Migrate | Map plans to projects/milestones or retain as a migration-only compatibility view. |
| `TaskItem`, `TaskDetailModal`, inline-style pages | Wrap/migrate | Keep until new routes cover the journeys; remove after E2E parity. |
| `lib/session.js` | Delete after migration | Clerk session is the only authority; no localStorage identity. |
| Gmail mailer | Replace behind adapter | Preserve email capability, but use a provider-neutral notification service. |
| fixed constants in `backend/constants/` | Replace | Seed only the NIDAR tenant; product values must be database/configuration-driven. |

## Hard-coded NIDAR assumptions

- Brand copy and mission terminology appear throughout README, sign-in,
  invitation, dashboard, sidebar, meeting email, metadata, and favicon.
- Four globally unique teams and keys are seeded from `constants/teams.js`.
- `MISSION_DEADLINE` is a fixed Dec 15, 2026 timestamp.
- `MODULES` seeds 15 AirMouse-specific tasks and `subProblemRef` is constrained
  to 1–15.
- Task statuses and plan phases are fixed to NIDAR vocabulary.
- The backend mailer sender is named “AirMouse Ops Board”.
- Admin is a global member role; there are no organization/project roles.
- Dashboard metrics assume team progress and mission deadline.
- API routes have no organization identifier or tenant query predicate.

The migration must seed these values into one explicit NIDAR organization and
remove product behavior that depends on their existence.

## Current quality and verification

Commands run against the repository on 2026-09-06:

```text
cd backend && npm test
  23 tests passed, 0 failed

cd frontend && npm run lint
  No ESLint warnings or errors

cd frontend && npm run test
  6 tests passed, 0 failed

cd frontend && npm run build
  Next.js 14 production build succeeded; all 8 Pages Router routes generated

git diff --check
  clean
```

CI currently runs the same backend and frontend npm checks on Node 22. There is
no typecheck script, Playwright E2E suite, mobile test suite, migration check,
secret scan, or dependency audit in CI.

## Migration risks and blockers

1. **Tenant isolation:** every new tenant-owned query must require verified
   organization context; global Mongo queries cannot be exposed during a
   dual-write period.
2. **Identity migration:** password hashes should not be copied into Clerk
   unless Clerk explicitly supports this format. Plan verified re-invitation or
   safe account linking.
3. **Data migration:** Mongo IDs, fixed teams, plans, and meetings need an
   idempotent mapping report before any production run.
4. **Authorization:** central permission checks are required for project,
   task, meeting, integration, AI, and billing operations.
5. **External configuration:** Clerk, Google Cloud OAuth, PostgreSQL, object
   storage, job runner, OpenRouter, Stripe, Expo/EAS, and production email
   accounts require human-owned credentials and cannot be verified locally yet.
6. **Runtime migration:** changing Pages Router/Express/Mongo to App Router,
   TypeScript, shared contracts, Clerk, and PostgreSQL at once would create an
   unsafe rewrite. Use a modular-monolith strangler path.

## Proposed final architecture

Use a modular TypeScript monolith first, with web and mobile clients consuming
the same versioned API and shared Zod/domain contracts:

```text
apps/web (Next App Router)
apps/mobile (Expo Router)
        │
packages/api-client + packages/schemas + packages/domain
        │
authenticated application API (route -> auth -> permission -> service -> repository)
        │
PostgreSQL/Prisma, object storage, job runner, provider adapters
        ├─ Clerk identity + Organizations
        ├─ Google Calendar (first complete integration)
        ├─ email/push/in-app notifications
        ├─ OpenRouter AI service + audited tools
        └─ Stripe billing/entitlements
```

The existing Express server can host the first versioned API while services and
schemas are extracted. Next App Router migration and a monorepo package split
should happen only after the tenant-aware service boundary is tested. Prisma is
the proposed ORM because the target entities are relational and require
transactions, migrations, and generated TypeScript types. The decision is
recorded in `docs/DATABASE.md`; it must be rechecked against the installed
Prisma release during Phase 1 implementation.

## Recommended implementation order and gates

| Phase | Local deliverable | Release gate |
| --- | --- | --- |
| 0 | This audit, ADRs, target schema, threat model, migration/runbook docs | No code or dependency migration starts without an approved boundary |
| 1 | TypeScript/shared schemas, PostgreSQL schema/migrations, Clerk adapter, organization context, permission service, SaaS shell/onboarding | Automated A/B cross-tenant denial and existing NIDAR smoke parity |
| 2 | Projects, milestones, generalized tasks, comments/labels/dependencies, My Work, idempotent NIDAR migration tool | Task/project CRUD and migration dry-run/count validation pass |
| 3 | Meetings, notification preferences, email adapter, durable reminders/jobs | Retry/idempotency and reminder tests pass without live SMTP |
| 4 | Google Calendar OAuth, event lifecycle, webhook sync, token protection | Development-provider end-to-end event create/update/cancel/reconnect pass |
| 5 | OpenRouter server adapter, read tools, proposed writes/confirmation, usage/audit | AI tool authorization and cross-tenant tests pass; no client secret |
| 6 | Expo app using shared API/contracts, secure Clerk session, push/deep links | Device/simulator workflow tests pass; no WebView wrapper |
| 7 | Additional provider adapters only after Calendar abstraction is proven | One provider at a time with mock + development-provider evidence |
| 8 | Stripe subscriptions, entitlements, idempotent webhooks | Signature/duplicate webhook tests and plan-limit tests pass |
| 9 | Security, accessibility, performance, observability, E2E, migration rehearsal | GO only after complete onboarding and A/B security acceptance tests |

External credentials are a gate for provider verification, not a reason to stop
local schema, authorization, migration, and test work.

## Post-audit implementation update (2026-09-07)

The audit above records the pre-migration baseline. Incremental commits since
then now provide a Prisma/PostgreSQL schema and migrations, a feature-flagged
Clerk adapter, organization provisioning/invitations, tenant-scoped project,
task, meeting, comment, search, notification, billing, and attachment service
boundaries, Inngest deadline notifications, encrypted Google Calendar OAuth,
server-only OpenRouter tools with signed AI write confirmation, and an Expo
Router mobile starter. The legacy Mongo/session dashboard remains the default
when `AUTH_PROVIDER` is not explicitly set to `clerk`, so existing NIDAR pages
continue to run during the transition.

Current local verification is stronger than the original baseline: 81 backend
tests, 6 frontend tests, 3 shared-domain tests, 2 database-client tests, the
Next production build, Prisma schema/client validation, and an Expo web export
pass. The latest hardening tests cover storage-object completion checks and
meeting filter validation. Cross-tenant checks currently exercise the service boundaries with fake
repositories; a real PostgreSQL/Clerk end-to-end isolation rehearsal is still
required before production. Google, Stripe, OpenRouter, S3/R2, Inngest, and
Expo push delivery are implemented behind explicit configuration but have not
been verified against live provider accounts in this environment.
