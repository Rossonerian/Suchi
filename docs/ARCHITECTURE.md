# Target architecture

## Decision

Build a modular monolith with shared TypeScript contracts before considering
microservices. Keep the current Express API as a compatibility surface while a
versioned application API and domain services are introduced. Migrate the web
client to Next App Router only after tenant context and service boundaries are
covered by tests.

## Runtime boundaries

```text
Next web / Expo mobile / AI tool runner / jobs / webhooks
                  │
                  ▼
        authenticated API controllers
                  │
     Clerk verification + org context
                  │
       Zod validation + permissions
                  │
              domain services
                  │
       repositories and provider adapters
                  │
 PostgreSQL · object storage · jobs · external providers
```

All entry points call the same domain service functions. React components never
perform authorization or direct database access. Mobile never connects to the
database.

## Proposed repository shape

```text
apps/web/
apps/mobile/
apps/api/                 # extracted only when the Express boundary is ready
packages/api-client/
packages/database/
packages/domain/
packages/schemas/
packages/auth/
packages/ai/
packages/integrations/
packages/notifications/
packages/config/
packages/ui-tokens/
docs/
scripts/
```

The current npm projects remain independently runnable until a workspace adds
real value. At that point use pnpm workspaces and Turborepo, with CI lockfile
and setup documentation updated together; do not churn package management as a
standalone change.

## Web route shape

```text
/                         public landing/sign-in
/onboarding               create/join organization flow
/app/[orgSlug]            organization home
/app/[orgSlug]/my-work
/app/[orgSlug]/projects
/app/[orgSlug]/projects/[projectId]
/app/[orgSlug]/tasks
/app/[orgSlug]/calendar
/app/[orgSlug]/meetings
/app/[orgSlug]/team
/app/[orgSlug]/ai
/app/[orgSlug]/integrations
/app/[orgSlug]/settings
/app/[orgSlug]/billing
```

The slug is navigation only. Authorization comes from the verified Clerk
session's active organization and server-side membership lookup.

## ADR index

- Database/ORM: `docs/DATABASE.md`
- Identity and organization transition: `docs/AUTH.md`,
  `docs/MULTITENANCY.md`
- Provider adapters: `docs/INTEGRATIONS.md`
- AI boundary: `docs/AI.md`
- Security controls: `docs/SECURITY.md`
- Deployment and environment: `docs/DEPLOYMENT.md`
- Mobile: `docs/MOBILE.md`
- NIDAR data/auth migration: `docs/MIGRATION.md`
