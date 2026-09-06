# NIDAR data and authentication migration

## Data mapping

The existing Mongo installation becomes one explicit organization, for example
`nidar-airmouse`, with a recorded source identifier and migration timestamp.

| Mongo source | Target mapping |
| --- | --- |
| `Member` | Clerk user + organization membership + local `UserProfile`; preserve legacy ID in metadata |
| `Team` | organization-scoped `Team`; map fixed keys and preserve display names |
| `Task` | organization/project task; unresolved project mapping is reported, never invented |
| `Plan` | project/milestone/activity candidate; external `fileUrl` becomes a reviewed attachment/link record |
| `Meeting` | organization meeting + attendees; SMTP status is historical delivery metadata |
| `Invitation` | migration report only unless a controlled re-invitation is required |

## Migration tooling

`backend/scripts/migrate-nidar-to-saas.js` now provides a deterministic,
idempotent migration plan and guarded apply path. It maps legacy teams to
projects, members to local Clerk-migration profiles and organization
memberships, tasks to normalized tasks, meetings to timezone-aware meeting
records, and plans to project activity events (the target schema has no
standalone plan entity).

The command is dry-run by default and emits a JSON mapping report:

```bash
SAAS_ORGANIZATION_ID=<target-local-organization-id> \
MONGODB_URI=<legacy-source-uri> \
npm run migrate:saas --prefix backend -- --report /tmp/nidar-migration.json
```

Applying requires an explicit `--apply`, `DATABASE_URL`, and
`ALLOW_SAAS_MIGRATION=1`. Never run it against production without a reviewed
backup, mapping report, and rehearsal. Existing legacy password hashes are not
copied into Clerk; users require secure reactivation/re-invitation.

The planner and safety flags are covered by backend unit tests. It supports:

- `--dry-run` with no writes;
- deterministic source-to-target mapping and a JSON/CSV report;
- idempotency keys and safe retry;
- counts before/after and validation of foreign keys;
- explicit organization assignment;
- exception report for members without email, ambiguous plans, invalid links,
  and unsupported task statuses;
- no automatic production execution.

Rehearse against a disposable export and compare totals before any live cutover.

## Authentication transition

Do not permanently run the custom session and Clerk as co-authoritative systems.
Use verified account linking or controlled re-invitation. Password hashes are
not copied unless the destination provider explicitly supports the exact hash
format. Legacy sessions are revoked after migration; the old auth routes and
`lib/session.js` are deletion candidates after parity E2E passes.
