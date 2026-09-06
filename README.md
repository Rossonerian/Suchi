# NIDAR AirMouse — Mission Dashboard

Tracks the four sub-teams working the NIDAR 2026-27 AirMouse challenge:
**Core Technical** (2), **Design & CAD** (frame/CAD), **Social** (5 — LinkedIn/Twitter/Instagram),
and **Documentation** (daily logs of what's being done). Mission deadline: **Dec 15, 2026**,
shown as a live countdown in the header.

Also includes a meeting scheduler: pick a title/time/agenda, check off attendees from any
team, and every attendee gets an emailed invite immediately (Gmail SMTP).

- `backend/` — Express + MongoDB API → deploy to **Render**
- `frontend/` — Next.js dashboard (plain JS) → deploy to **Vercel**
- `apps/mobile/` — Expo Router mobile client (TypeScript; optional during migration)
- `packages/` — shared domain contracts and Prisma/PostgreSQL SaaS schema

## Quick start (local)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # add your MongoDB Atlas URI
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000 and sign in with an administrator-issued invitation account. New teammates use the one-time **Claim your invite** link to review their assigned team and set a password. The API establishes an expiring server-managed session cookie; the browser never stores an authentication token.

## Product workflow

- Use the task toolbar to search all team work or filter it by status; use **Refresh** to recover from a failed or stale load.
- Add team plans as dated accountability updates and use safe `http`/`https` links for supporting material.
- Schedule meetings from the board. A meeting can be saved even when SMTP delivery fails; the board reports that state clearly.
- Access is invitation-only: knowing a member's name is not enough to obtain an account. Administrators create one-time invitation links from the Members screen; active accounts sign in with email and password.

## Verification

```bash
cd backend && npm test
cd ../frontend && npm run lint && npm test && npm run build
```

Never add a live MongoDB URI, Gmail account, or app password to an `.env.example` file. Use the placeholders and create ignored local `.env` files instead. Production deployments must use HTTPS, an exact `CORS_ORIGIN`, and `SESSION_SAME_SITE=none` when the Vercel frontend and Render API are on different sites.

## SaaS workspace preview

The organization-scoped SaaS API and Clerk-aware workspace routes are enabled
only when `AUTH_PROVIDER=clerk`, Clerk keys, and `DATABASE_URL` are explicitly
configured. The legacy Mongo/session dashboard remains the compatibility path
until each resource is migrated. Start with the root `.env.example` and the
architecture documents in `docs/`; do not point migration commands at a
production database without a reviewed dry-run report.

SECURITY ACTION REQUIRED: MongoDB/Gmail credentials that appeared in earlier Git history must be rotated by their owner. Removing them from the current tree does not invalidate credentials already present in Git history.

## Deployment order

1. **MongoDB Atlas** — free cluster, get the connection string (see `backend/README.md`)
2. **Render** — deploy `backend/`, set `MONGODB_URI`, `CORS_ORIGIN`, `FRONTEND_URL`, `TRUST_PROXY=1`, and `SESSION_SAME_SITE=none`
3. **Vercel** — deploy `frontend/`, set `NEXT_PUBLIC_API_URL` to your Render URL
4. Go back to Render and update `CORS_ORIGIN` to your final Vercel URL, redeploy

Full details are in `backend/README.md` and `frontend/README.md`.

### First administrator and existing-member migration

After the teams exist, run `cd backend && npm run create-admin` against the intended database. The script prompts interactively and stores only a scrypt password hash. Existing legacy members without email/password fields are retained but cannot authenticate; an administrator must issue each person a reset invitation from `/admin/members`, after which they claim it and set a password. Do not re-enable public name/team joining.

## Linking tasks to the 15 sub-problem breakdown

When adding a task, the optional "SP#" field (1–15) tags it against the sub-problem
numbering from the mission-brief breakdown (airframe, SLAM, survivor detection, GCS, etc.)
so progress can be traced back to the original problem statement.
