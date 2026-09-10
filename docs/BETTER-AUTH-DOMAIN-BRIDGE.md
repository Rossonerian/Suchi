# Better Auth Domain Bridge Architecture (Option B)

## Overview
This document records the exact separation of responsibilities between the **Authentication Domain** (Better Auth) and the **Application Domain** (NIDAR SaaS Platform).

---

## Domain Boundaries & Ownership

### 1. Authentication Domain (Better Auth)
Better Auth is solely responsible for identities, credentials, verification, provider accounts, and session lifecycle:
- **`AuthUser`**: Authentication identity containing canonical email, password authentication state, verified flags, and timestamps.
- **`AuthSession`**: Ephemeral authentication sessions with expiration tokens, client user agents, IP addresses, and active workspace pointers.
- **`AuthAccount`**: Linked authentication provider credentials (local password hash or social OAuth tokens).
- **`AuthVerification`**: Transient verification tokens (email verification, password reset tokens).

### 2. Application Domain (NIDAR)
NIDAR retains authoritative ownership of all tenant, business, authorization, and project constructs:
- **`UserProfile`**: Application user persona containing display names, avatars, audit logs, comments, task assignments, and organization memberships.
- **`Organization`**: Authoritative workspace/tenant entity owning projects, tasks, milestones, meetings, integrations, labels, and subscriptions.
- **`OrganizationMembership`**: Authoritative tenant membership connecting an application `UserProfile` to an `Organization` with a tenancy `OrganizationRole` (`owner`, `admin`, `member`).
- **`OrganizationInvitation`**: Workspace member invitation lifecycle.
- **`Team` & `TeamMember`**: Internal groupings within an Organization.
- **`Project` & `Task`**: Work breakdown structures where task assignees reference `OrganizationMembership` via `assigneeMembershipId`.
- **`Meeting` & `Notification`**: Coordination and alerting artifacts scoped strictly to `Organization`.

---

## Identity Bridge Specification

### Bridge Model & Field
- **Application Model**: `UserProfile` (`packages/database/prisma/schema.prisma`)
- **Authentication Model**: `AuthUser` (`packages/database/prisma/schema.prisma`)
- **Authoritative Bridge Field**: `UserProfile.authUserId`
  - Type: `String?`
  - Constraint: `@unique`
  - Foreign Key: `authUserId -> AuthUser(id)` with `onDelete: SetNull`

```text
AUTHENTICATION DOMAIN (Better Auth)
┌─────────────────────────────────┐
│ AuthUser                        │
│ - id (PK)                       │
│ - email                         │
│ - emailVerified                 │
│ - name                          │
│ - createdAt / updatedAt         │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ bridge via authUserId (@unique)
                 ▼ 0..1
APPLICATION DOMAIN (NIDAR)
┌─────────────────────────────────┐
│ UserProfile                     │
│ - id (PK, cuid)                 │
│ - authUserId (FK, UNIQUE)       │
│ - email                         │
│ - displayName                   │
└────────────────┬────────────────┘
                 │ 1
                 │
                 ▼ 1..*
┌─────────────────────────────────┐
│ OrganizationMembership          │
│ - id (PK, cuid)                 │
│ - userId (FK -> UserProfile)    │
│ - organizationId (FK -> Org)    │
│ - role (owner | admin | member) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Organization                    │
│ - id (PK, cuid)                 │
│ - slug                          │
│ - name                          │
└─────────────────────────────────┘
```

---

## Request Flow & Context Resolution

```text
Incoming HTTP Request (Cookie or Authorization Header)
         │
         ▼
Better Auth Session Resolution (getSession)
         │
         ▼
AuthUser (`AuthUser.id`)
         │
         ▼
Resolve Application User (`UserProfile.findUnique({ where: { authUserId: session.user.id } })`)
         │
         ▼
Resolve Organization & Membership:
Verify that `UserProfile` has an `OrganizationMembership` matching the requested workspace
         │
         ▼
Construct `req.authContext`:
{
  authUserId: AuthUser.id,
  applicationUserId: UserProfile.id,
  sessionId: AuthSession.id
}
         │
         ▼
Construct `req.organizationContext`:
{
  organizationId: Organization.id,
  membershipId: OrganizationMembership.id,
  organizationRole: OrganizationMembership.role,
  userId: UserProfile.id,      // Preserves application user ID compatibility!
  sessionId: AuthSession.id
}
         │
         ▼
Authoritative SaaS Domain Handlers (Projects, Tasks, Meetings, AI, Integrations)
```

No business routes are rewritten to reference `AuthUser.id`. Application tasks continue to map to `assigneeMembershipId`, and project ownership maps to `UserProfile.id`.
