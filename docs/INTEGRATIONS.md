# Integration architecture

## Provider-neutral boundary

External providers sit behind interfaces owned by the application:

```text
CalendarProvider
MessagingProvider
FileProvider
SourceControlProvider
```

Provider adapters receive an organization/user context and return normalized
domain records. OAuth access and refresh tokens remain server-side and are
encrypted/protected at rest. Provider API errors are normalized, retried only
when safe, and recorded without secrets.

## Delivery order

1. Google Calendar complete: connect, list/select calendars, create/update/
   cancel events, attendee synchronization, Meet conference where supported,
   timezone preservation, token expiry/reconnect, inbound/outbound sync, and
   idempotent webhook handling.
2. Prove the adapter contract with a fake provider and a development Google
   account before adding Gmail, Drive, Slack, Microsoft, GitHub, or Notion.
3. Evaluate Nango or direct adapters only after measuring token refresh,
   webhook, cost, self-hosting, and maintenance needs. Do not install ten
   partially supported integrations.

“Sign in with Google” is an identity choice handled by Clerk; “Connect Google
Calendar” is a separate least-privilege OAuth integration.
