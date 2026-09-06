# Database ADR and target model

## ADR-001: PostgreSQL with Prisma

**Status:** Phase 1 schema and initial migration implemented; application
repositories are not yet switched from MongoDB.

The target product has relational membership, project, task dependency,
meeting attendee, integration, audit, usage, and billing invariants. PostgreSQL
provides foreign keys, unique constraints, row-level query predicates, and
transactions that match those invariants better than the current globally
queried MongoDB collections. Prisma provides generated TypeScript types, schema
migrations, and a mature PostgreSQL adapter. Prisma 7.10.0 was selected after
checking npm compatibility with the current Node 20+/22 CI baseline. Prisma 8
is currently a release candidate with a newer Node floor, so it is not used
during this incremental migration.

Alternatives considered:

- **Drizzle:** credible and SQL-first, but would require more handwritten query
  and repository conventions for this team's first relational migration.
- **Keep MongoDB:** lowest short-term migration cost, but leaves relational
  isolation and multi-entity transactions harder to enforce as features grow.
- **Supabase direct client access:** rejected for the application boundary;
  mobile and browser clients must never connect directly to the database.

References: [Prisma PostgreSQL quickstart](https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql),
[Prisma transactions](https://www.prisma.io/docs/orm/fundamentals/transactions),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations).

## Target entities

Every tenant-owned table includes `organizationId`, indexed and constrained to
the organization relation. Foreign keys use cascading or restricted deletes
deliberately; no implicit cross-tenant lookup is allowed.

Core tables:

```text
UserProfile
Organization
OrganizationSettings
OrganizationMembership (Clerk membership mirror/metadata)
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
- unique `(organizationId, clerkUserId)` for local user metadata;
- unique `(organizationId, projectId, userId)` for project membership;
- unique `(organizationId, taskId, dependencyTaskId)` for dependencies;
- indexes on `(organizationId, status, dueAt)`, `(organizationId, projectId)`,
  `(organizationId, assigneeId, status)`, and meeting start time;
- unique provider event IDs and webhook idempotency keys;
- soft-delete/archive fields for user-visible resources where recovery matters;
- transactions for membership changes, task dependency updates, event mapping,
  subscription/webhook state, and AI proposed-write confirmation.

The full Prisma schema and committed initial migration live in
`packages/database/prisma/`; the existing Express routes still use MongoDB
until service-by-service cutover is covered by integration tests.
