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

## Script requirements

Create `scripts/migrate-nidar-to-saas.*` only in a later implementation phase.
It must support:

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
