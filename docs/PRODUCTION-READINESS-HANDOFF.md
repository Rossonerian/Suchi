# Production readiness handoff

## Required configuration

- `DATABASE_URL` — PostgreSQL connection string.
- `BETTER_AUTH_SECRET` — 32+ random characters, server-only.
- `BETTER_AUTH_URL` — public HTTPS API origin in production.
- `BETTER_AUTH_TRUSTED_ORIGINS` — explicit web origin(s) and the mobile app scheme where used.
- `CORS_ORIGIN` — explicit comma-separated web origins.

Google sign-in, Calendar, OpenRouter, object storage, mail, billing, and push are optional capabilities. Each must be configured and verified before advertising it; otherwise the UI exposes a disabled state.

## Release checks

Run backend, frontend, mobile, root, Prisma, tenant-isolation, and authorization tests. Start only `backend`'s SaaS ESM command for production. The legacy Mongo process is compatibility-only.

Runtime evidence must include two PostgreSQL organizations, a user belonging to both, a user belonging to only one, workspace switching, deep-link denial, and direct API denial for foreign resource IDs. Do not treat a mocked provider response as authenticated runtime evidence.

## Security

Sessions are HttpOnly and Secure in production, origin/trusted-origin checks are explicit, and all resource authorization is server-side and organization-scoped. Client-provided user, organization, project, task, or role identifiers are untrusted input. AI proposals are bound to user and organization and require a fresh confirmation.

## Known provider prerequisites

Google OAuth and Calendar require a development/staging project with callback URLs registered. OpenRouter requires a server-side key. If these are unavailable, keep the corresponding capability disabled and record it as `BLOCKED` or `DISABLED` in the runtime matrix rather than claiming verification.
