# Disposable SaaS Runtime Setup

This guide provisions a local, disposable environment for the authenticated
SaaS release gate. It is not a production deployment guide. Never place real
values in tracked files, never use a customer database/calendar, and never
disable Clerk or tenant authorization to make a test pass.

## Dependency matrix

| Dependency | Needed for release gate | Already available | Can agent provision | Requires user/provider action |
| ---------- | ----------------------: | ----------------: | ------------------: | ----------------------------: |
| Node/npm | Yes | Yes | Not needed | No |
| Legacy MongoDB/session API | No, unless legacy regression testing is also desired | Local legacy configuration exists | No action taken | No |
| PostgreSQL 16 | Yes | Docker available; `nidar-saas-postgres-runtime-check` is running on `127.0.0.1:55432` | Yes — disposable local container | No |
| Clerk Organizations | Yes | No local development credentials or CLI | No | Yes |
| Google Calendar OAuth | Yes, for live Calendar verification | No | No | Yes |
| OpenRouter | Yes, for live AI verification | No | No | Yes |
| Expo CLI/Metro | Yes, for native verification | Yes | Metro can run locally | No |
| Android SDK | Yes, for native verification | Platform tools/API 35 available | Partly | System image or device required |
| Android emulator | Yes, for native verification | `NIDAR_Runtime_API35` is created and boots on `emulator-5554` | Yes — user-owned API 35 image | No for this checkout |
| Expo push | Yes, if push ships | App plugin is installed | No | Yes — Expo project/development device |
| Legacy SMTP email | No for the SaaS gate | Local legacy configuration exists | Do not exercise it | No |

## Environment files and variable contract

The root `.env.example` is a reference template; the existing backend starts
with `backend/.env`, the Next.js client reads `frontend/.env.local`, and Expo
reads `apps/mobile/.env`. All three local files are ignored by Git.

### Web — `frontend/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:<backend-port>
NEXT_PUBLIC_AUTH_PROVIDER=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-development-publishable-key>
```

The publishable key is public configuration, but it must still belong to the
disposable Clerk development instance used for this gate.

### Backend — `backend/.env`

Keep any user-owned legacy variables intact. Add only development values needed
for the SaaS process:

```dotenv
PORT=<backend-port>
CORS_ORIGIN=http://localhost:<frontend-port>
FRONTEND_URL=http://localhost:<frontend-port>
DATABASE_URL=postgresql://<development-user>:<development-password>@127.0.0.1:<postgres-port>/<development-database>
AUTH_PROVIDER=clerk
CLERK_PUBLISHABLE_KEY=<same-clerk-development-publishable-key>
CLERK_SECRET_KEY=<clerk-development-secret-key>
AI_CONFIRMATION_SECRET=<development-random-secret>
```

`AI_CONFIRMATION_SECRET` is required for server-side AI write confirmations.
It must never be exposed to web or Expo variables.
`CLERK_PUBLISHABLE_KEY` is required by `@clerk/express` in addition to the
secret key; it is the same public development key used by the web and mobile
clients.

### Google Calendar — backend only

The current provider uses a Google OAuth **Web application** client and this
exact local callback:

```dotenv
GOOGLE_CLIENT_ID=<development-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<development-google-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:<backend-port>/api/v1/integrations/google/calendar/callback
INTEGRATION_STATE_SECRET=<development-random-secret>
INTEGRATION_ENCRYPTION_KEY=<64-hex-characters-or-base64-that-decodes-to-32-bytes>
```

The implementation requests only:

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

Google sign-in configured in Clerk is authentication only; it does not
authorize Calendar access. Do not add Gmail or Drive scopes for this gate.

### OpenRouter — backend only

```dotenv
OPENROUTER_API_KEY=<development-openrouter-key>
# Optional. Defaults are openai/gpt-4o-mini for fast/default/summarization/structured.
AI_MODEL_DEFAULT=<approved-low-cost-development-model>
# Optional provider metadata; do not include secrets.
OPENROUTER_HTTP_REFERER=http://localhost:<frontend-port>
OPENROUTER_APP_NAME=NIDAR-SaaS-Development
```

`OPENROUTER_API_KEY` must not appear in `frontend/.env.local`,
`apps/mobile/.env`, browser logs, or source control.

### Mobile — `apps/mobile/.env`

```dotenv
EXPO_PUBLIC_API_URL=http://<host-reachable-from-device>:<backend-port>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-development-publishable-key>
```

For an Android emulator, use a host address it can reach (commonly
`10.0.2.2` when the backend runs on the host). A physical device requires the
host LAN address and a development-only CORS origin.

### Optional features not required for this gate

- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` enable the background-job
  endpoint.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and
  optional `S3_REGION` enable attachments.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` enable billing webhooks.
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` are legacy SMTP configuration. Do not
  send real mail during this release gate.

## Disposable PostgreSQL

Use only a loopback Docker database. A representative command is:

```bash
docker run --rm --name <runtime-postgres-container> \
  -e POSTGRES_DB=<development-database> \
  -e POSTGRES_USER=<development-user> \
  -e POSTGRES_PASSWORD=<development-only-password> \
  -p 127.0.0.1:<postgres-port>:5432 -d postgres:16-alpine
```

With `DATABASE_URL` exported for that container, run:

```bash
npm run validate --workspace @nidar/database
npm run generate --workspace @nidar/database
npm run migrate:deploy --workspace @nidar/database
```

The runtime seed command is deliberately blocked until real disposable Clerk
user and organization IDs exist. It must receive those identifiers as explicit
environment inputs, must require an explicit development opt-in, and must
reject non-loopback database URLs.

After creating the disposable Clerk users and organizations, invoke it from the
repository root (or from `backend/`) with placeholders replaced locally:

```bash
SAAS_RUNTIME_SEED=1 \
SAAS_RUNTIME_USER_A_CLERK_ID=<real-user-a-clerk-id> \
SAAS_RUNTIME_USER_B_CLERK_ID=<real-user-b-clerk-id> \
SAAS_RUNTIME_ALPHA_ORG_CLERK_ID=<real-alpha-org-clerk-id> \
SAAS_RUNTIME_BETA_ORG_CLERK_ID=<real-beta-org-clerk-id> \
npm run seed:runtime --prefix backend
```

The command reports counts only. It does not create or modify Clerk identities,
and it refuses non-loopback `DATABASE_URL` values.

## Clerk development setup

Create or select a **development** Clerk application, enable Organizations,
and enable the intended Google sign-in provider separately from Calendar OAuth.
Place its keys directly in the ignored local files above; do not paste secrets
into chat.

Create only synthetic fixtures:

- User A: member of Workspace Alpha and Workspace Beta.
- User B: member only of Workspace Beta.

The release test seeds local metadata only after the corresponding real Clerk
IDs exist. It must not use fabricated Clerk IDs or application-side auth
bypasses. The current disposable database has all six migrations applied and
contains no fixture rows yet.

## Google Calendar development setup

In a non-production Google Cloud project, create a Web application OAuth
client. Add the exact `GOOGLE_REDIRECT_URI` above as an authorized redirect
URI. Use a disposable Calendar account/calendar. The verification sequence is
connect, create event, edit event, cancel event, and provider-error/reconnect
handling.

## OpenRouter development setup

Create a restricted development key and put it only in `backend/.env`. Use the
configured low-cost development model. Verify an Alpha-only read, a discarded
proposal, a confirmed proposal, and rejection/invalidation after switching to
Beta.

## Native and push setup

The repository includes Expo Router and `expo-notifications`. A disposable API
35 AVD (`NIDAR_Runtime_API35`) is now provisioned under the user-owned Android
SDK and has booted successfully; no Expo app has been authenticated or
installed because Clerk mobile configuration is still absent. For push,
configure an Expo development project and device push token, then test
foreground, background, and cold-start taps while a different workspace is
active.

## Required release-gate dataset

After Clerk setup, seed Alpha and Beta with the supplied real IDs. Alpha needs
`Alpha Launch`, overdue/today/upcoming/blocked/completed/long-title tasks, an
Alpha meeting, and task/project/meeting notifications. Beta needs
`Beta Migration` and distinct tasks. User A belongs to both; User B belongs
only to Beta. Use these fixtures for switching and cross-tenant denial checks.
