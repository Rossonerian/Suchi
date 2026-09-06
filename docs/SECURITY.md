# Security baseline

## Existing controls verified

- HttpOnly, expiring, hashed server sessions;
- Helmet/security headers and JSON body limit;
- exact CORS allow-list and mutation Origin check;
- login/invitation/admin/general rate limits;
- safe HTTP(S) external-link validation;
- password hashes excluded from public member responses;
- integration tests for session revocation, role checks, and same-team task/plan
  mutations.

## SaaS security gates

- organization-scoped queries and IDOR tests for every entity;
- centralized permissions with server enforcement;
- Clerk webhook signature verification and session revocation;
- OAuth state/PKCE, least-privilege scopes, encrypted refresh-token storage;
- private object storage, signed short-lived URLs, MIME/size validation, and
  tenant ownership checks;
- CSRF protection for cookie-authenticated web mutations;
- webhook idempotency keys and replay protection;
- SSRF controls for provider URLs and outbound fetches;
- AI prompt-injection isolation, tool authorization, confirmation, rate limits,
  and audit records;
- invitation abuse controls, open-redirect prevention, XSS-safe rendering,
  secret scanning, dependency auditing, and correlation IDs.

No production secret or live provider call is required for Phase 0. Security
acceptance remains release-blocking through Phase 9.
