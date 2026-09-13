# Suchi Web (frontend)

Next.js app (plain JavaScript, pages router). Deploys to Vercel.

## Local setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit http://localhost:3000. In local development, `/api/:path*` proxies to `http://localhost:5000/api/:path*` by default (or the origin specified in `BACKEND_ORIGIN`).

## How sign-in works

Members sign in with email and password established through Better Auth and one-time administrator invitations. New members use the **Claim your invite** link to review their assigned workspace and set a password. Invitation tokens are never stored in browser storage and expire after one use.

The API issues an opaque, expiring HttpOnly session cookie. Requests send `credentials: 'include'`; the browser never stores a session token or treats a local identity as authority.

Administrators can manage invitations, team/role/status changes, access resets, and session revocation at `/admin/members`.

## Checks

```bash
npm run lint
npm test
npm run build
```

## Deploying to Vercel

1. Push this repository to GitHub.
2. vercel.com → New Project → import the repo → set root directory to `frontend`.
3. Add environment variable `BACKEND_ORIGIN` = your Railway backend URL (e.g. `https://suchi-staging-13da.up.railway.app`). Browser requests stay same-origin via `/api` rewrite proxy so first-party session cookies work seamlessly without cross-site cookie blocking or `SameSite=None`.
4. Deploy.

Once deployed, update your backend's `CORS_ORIGIN` or `BETTER_AUTH_TRUSTED_ORIGINS` env var to this Vercel URL, then redeploy the backend.

## Structure

- `pages/index.js` — email/password sign-in screen
- `pages/claim-invite.js` — one-time invitation claim and password setup
- `pages/admin/members.js` — workspace member management
- `pages/dashboard.js` — the ops board (team columns, task filters, plans, and meetings)
- `components/` — UI components
- `lib/api-base.mjs` — same-origin API URL resolution and Next.js proxy rewrite configuration
- `lib/better-auth-client.js` — Better Auth client provider and hooks
- `lib/api.js` — SaaS and workspace API client
