# Database ADR and target model

## ADR-001: PostgreSQL with Prisma

**Status:** PostgreSQL selected as the primary relational persistence layer for Suchi SaaS.

The target product has relational membership, project, task dependency,
meeting attendee, integration, audit, usage, and billing invariants. PostgreSQL
provides foreign keys, unique constraints, row-level query predicates, and
transactions that match those invariants better than globally queried document
stores. Prisma provides generated TypeScript types, schema migrations, and a mature
PostgreSQL adapter.

## ADR-002: Stable Prisma 7.10 Toolchain & Managed PostgreSQL Architecture

**Status:** Canonical baseline across monorepo, Docker backend, and CI.

For the Suchi MVP and staging launch, Suchi standardizes on a **single stable Prisma 7.10 toolchain** (`prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/adapter-pg@^7.10.0`):

1. **Unified Toolchain**: Eliminates release-candidate tooling and dual-toolchain complexity. Schema validation, generation, and migrations all run via standard `prisma` commands configured through `packages/database/prisma.config.ts`.
2. **Better Auth Option B Compatibility**: Better Auth's Prisma adapter (`@better-auth/prisma-adapter`) seamlessly consumes `@prisma/client@7.10.0` without custom query-layer shims. Authentication tables (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`) bridge to `UserProfile.authUserId`.
3. **Relational Constraints**: Preserves migration `20260911180000_prisma8_contract_constraints`, ensuring that singular foreign key relationships (`UserProfile.authUserId`, `AiUsageRecord.runId`, `OrganizationSettings.organizationId`, `Subscription.organizationId`, `Subscription.externalId`) possess formal PostgreSQL `UNIQUE` constraints via `UNIQUE USING INDEX`.
4. **Managed Staging Compatibility**: Any managed PostgreSQL service (**Prisma Postgres**, **Neon**, **Railway PostgreSQL**, Supabase, or AWS RDS) can be used directly via standard connection strings (`DATABASE_URL` and `DIRECT_DATABASE_URL`) without requiring Prisma repository auto-deploy or cloud git integration. Migrations deploy deterministically via `npm run db:migrate:deploy`.

## Target entities

Every tenant-owned table includes `organizationId`, indexed and constrained to
the organization relation. Foreign keys use cascading or restricted deletes
deliberately; no implicit cross-tenant lookup is allowed.

Core tables:

```text
AuthUser, AuthSession, AuthAccount, AuthVerification (Better Auth)
UserProfile (authUserId -> AuthUser)
Organization
OrganizationSettings
OrganizationMembership
Team, TeamMember
Project, ProjectMember, Milestone
Task, TaskAssignee, TaskDependency, Subtask
Label, TaskLabel, Comment, Attachment
Meeting, MeetingAttendee, MeetingExternalMapping
Notification, NotificationPreference
IntegrationConnection, IntegrationAccount, IntegrationWebhookEvent,
ExternalResourceMapping
ActivityEvent, AuditLog
AiConversation, AiMessage, AiRun, AiUsageRecord
Subscription, SubscriptionEntitlement, UsageCounter
```

Suggested invariants and indexes:

- unique `(organizationId, slug)` for organizations/projects where applicable;
- unique `(organizationId, authUserId)` for local user metadata;
- unique `(organizationId, projectId, userId)` for project membership;
- unique `(organizationId, taskId, dependencyTaskId)` for dependencies;
- indexes on `(organizationId, status, dueAt)`, `(organizationId, projectId)`,
  `(organizationId, assigneeId, status)`, and meeting start time;
- unique provider event IDs and webhook idempotency keys;
- soft-delete/archive fields for user-visible resources where recovery matters;
- transactions for membership changes, task dependency updates, event mapping,
  subscription/webhook state, and AI proposed-write confirmation.
