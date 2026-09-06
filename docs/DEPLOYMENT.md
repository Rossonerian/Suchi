# Deployment plan

## Proposed managed baseline

```text
Web/API: Vercel or a small managed Node service during the Express transition
Database: managed PostgreSQL (Neon or equivalent)
Auth: Clerk
AI: OpenRouter
Calendar: Google Cloud OAuth + Calendar API
Billing: Stripe
Files: private R2/S3-compatible bucket
Jobs: Inngest or Trigger.dev after a focused evaluation
Mobile: Expo EAS
Monitoring: Sentry or equivalent
```

Do not introduce Kubernetes or microservices before measured need.

## Environment categories

Templates will contain placeholders only for:

- Clerk publishable/server/webhook values;
- database pooled/direct URLs;
- OpenRouter key and model configuration;
- Google OAuth client IDs/secrets and webhook verification;
- Stripe secret/webhook values;
- storage endpoint/bucket/key values;
- job runner signing keys;
- email provider and Sentry DSN.

Server secrets must never be bundled into web/mobile assets or committed to
examples, tests, fixtures, or README files. Local setup should eventually be:

```text
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

External account configuration remains a human-owned deployment step and must
be documented with no secret values.
