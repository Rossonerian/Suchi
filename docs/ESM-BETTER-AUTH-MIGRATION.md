# ESM and Better Auth migration

NIDAR's production SaaS path is an Express ESM process backed by PostgreSQL and Prisma. Better Auth 1.7.3 owns identity, sessions, organization membership, teams, and invitations; application services retain resource-level authorization.

## Runtime commands

```sh
cd packages/database && npm run generate
cd ../../backend && npm run migrate:saas
cd backend && npm start
```

`backend/server.js` is the explicitly named legacy Mongo compatibility process. It is not imported or started by the SaaS command. The SaaS entrypoint validates `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and trusted origins before accepting traffic.

## Database ownership

The existing `Organization`, `OrganizationMembership`, `Team`, and `UserProfile` identities remain canonical application records. Better Auth persistence records (`AuthSession`, `AuthAccount`, `AuthVerification`, and organization invitations) use the same PostgreSQL database and foreign keys. Organization IDs are never copied from client request bodies or external provider IDs.

## Request flow

`/api/auth/*` is handled by Better Auth. Protected `/api/v1/*` requests resolve the Better Auth session from the HttpOnly cookie, read its active organization, and verify the PostgreSQL membership before application authorization runs. A workspace slug is navigation only.

## Providers

Google authentication uses `GOOGLE_AUTH_CLIENT_ID` and `GOOGLE_AUTH_CLIENT_SECRET` with authentication-only scopes. Google Calendar remains a separate optional integration with dedicated credentials and encrypted server-side tokens. Missing optional provider credentials disable that feature rather than weakening core authentication.

## Migration notes

Legacy Clerk identifiers are retained only as nullable migration metadata where required by an existing data migration. No production request path depends on Clerk, and no Clerk credentials belong in tracked environment examples. Existing installations must apply the reviewed Prisma migration before starting the SaaS process.
