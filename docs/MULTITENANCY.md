# Multi-tenancy and authorization

## Boundary

One Clerk Organization maps to one application `Organization` row. Every
tenant-owned record carries `organizationId`. The active organization is derived
from the verified Clerk session and membership, never from a request body,
localStorage, AsyncStorage, an email, or a slug by itself.

## Permission model

Organization roles are intentionally separate from project roles:

```text
organization: owner, admin, member
project: owner, manager, member, viewer
```

The application exposes permission predicates such as
`project:create`, `member:invite`, `task:update`, `task:assign`,
`meeting:create`, `integration:manage`, and `billing:manage`. Controllers call a
central authorization service; components only hide or disable unavailable UI.

## Required query pattern

Every repository method receives an authenticated context:

```text
service.method({ actor, organizationId, ...input })
  -> assert active membership and permission
  -> repository query includes organizationId
  -> resource ownership is checked before mutation
```

The repository must make an organization predicate hard to omit (scoped
repository factory or mandatory context argument). IDs and slugs are lookup
keys, not authorization.

## Release-blocking tests

Create Organization A/B with separate users and prove A cannot read, search,
update, delete, comment on, attach to, schedule against, or invoke AI tools for
B resources. Repeat using guessed IDs, modified URLs, API payloads, mobile API
requests, integration mappings, and AI tool arguments. These tests must run
against the real application service/repository boundary with external providers
stubbed.
