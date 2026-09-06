# Identity and authentication plan

## Current state

The repository uses invitation-only email/password accounts, an opaque hashed
Mongo session token, and HttpOnly cookies. This is verified working in the
backend integration suite. It is not suitable as the permanent universal SaaS
identity system because there is no external identity provider or mobile session
flow.

## Target decision

Use Clerk as the identity provider for web and Expo. Enable Google sign-in and a
secure email fallback as product policy permits. The server verifies Clerk
session tokens and obtains the user and active organization from the verified
session; clients never send an authoritative user or role field.

Clerk Organizations is the workspace membership source. Local tables store only
application metadata and foreign identifiers needed for joins, audit, usage, and
provider mappings.

References: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart),
[Clerk organization hook](https://clerk.com/docs/reference/hooks/use-organization),
[Clerk Next rendering guidance](https://clerk.com/docs/guides/development/rendering-modes).

## Transition

Do not run password sessions and Clerk as competing authorities indefinitely.
During the controlled transition:

1. Keep the current server session only for the compatibility surface.
2. Add a Clerk verification adapter and a feature-flagged API auth boundary.
3. Migrate members through verified email matching or controlled re-invitation.
4. Do not copy scrypt hashes unless Clerk documents a supported import for the
   exact format; otherwise require secure account activation.
5. Revoke legacy sessions after a member completes migration.
6. Remove `lib/session.js`, password routes, and legacy cookie support only after
   NIDAR migration and E2E parity are complete.

`CLERK_SECRET_KEY` and webhook signing secrets are server-only. Public keys and
publishable configuration may be exposed only where Clerk requires them.
