# Mobile architecture

## Target

Build a real Expo/React Native app with Expo Router and TypeScript. Use Clerk's
Expo SDK, TanStack Query for server state, SecureStore for secure persistence,
NativeWind-compatible shared tokens, Expo Notifications for push, and deep
links into task/project/meeting screens.

Mobile consumes the same versioned API and Zod/domain contracts as web. It never
connects directly to PostgreSQL and never stores OAuth refresh tokens in
AsyncStorage. A notification payload contains only lock-screen-safe data.

## Initial workflow

Authentication -> organization selection -> dashboard/My Work -> projects and
tasks -> task details/create/update/comments -> meetings -> notifications -> AI
assistant -> account/settings.

Lists and task actions are mobile workflows, not a shrunken desktop table.
Device registration, token rotation/cleanup, accessibility labels, safe areas,
dynamic text, offline/error states, and deep-link authorization require device
or simulator verification before claiming mobile support.
