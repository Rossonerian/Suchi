# Database ADR and target model

## ADR-001: PostgreSQL with Prisma

**Status:** PostgreSQL selected as the primary relational persistence layer for Suchi SaaS.

The target product has relational membership, project, task dependency,
meeting attendee, integration, audit, usage, and billing invariants. PostgreSQL
provides foreign keys, unique constraints, row-level query predicates, and
transactions that match those invariants better than globally queried document
stores. Prisma provides generated TypeScript types, schema migrations, and a mature
PostgreSQL adapter.

## ADR-002: Prisma 8 Contract-First Schema & PostgreSQL Alignment

**Status:** Implemented and verified across monorepo and Docker backend.

Suchi upgraded its database architecture to **Prisma 8** (`prisma@8.0.0-rc.13`, `@prisma/orm-postgres@8.0.0-rc.9`):

1. **Contract-First Architecture**: Authoritative schema contract defined in `packages/database/prisma/contract.prisma` using `prisma.config.ts`. Compiles into typed contracts (`prisma/contract.json`, `prisma/contract.d.ts`).
2. **Schema Verification & Signing**: `prisma db sign` records schema verification markers; `prisma db verify` validates schema integrity and eliminates drift.
3. **Better Auth Option B Compatibility**: Authentication tables (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`) interface with `@better-auth/prisma-adapter` and `@prisma/client` runtime generated via `prisma7 generate --config prisma7.config.ts`.
4. **Relational Constraints**: Migration `20260911180000_prisma8_contract_constraints` elevates unique indexes on 1:1 relation foreign keys (`UserProfile.authUserId`, `AiUsageRecord.runId`, `OrganizationSettings.organizationId`, `Subscription.organizationId`, `Subscription.externalId`) into official PostgreSQL `UNIQUE` constraints using existing indexes.

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
