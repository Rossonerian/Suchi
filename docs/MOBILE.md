# Mobile architecture

## Target

Build a real Expo/React Native app with Expo Router and TypeScript. Use Clerk's
Expo SDK, TanStack Query for server state, SecureStore for secure persistence,
NativeWind-compatible shared tokens, Expo Notifications for push, and deep
links into task/project/meeting screens.

Mobile consumes the same versioned API and Zod/domain contracts as web. It never
connects directly to PostgreSQL and never stores OAuth refresh tokens in
AsyncStorage. A notification payload contains only lock-screen-safe data.

## Current implementation

`apps/mobile/` is an Expo SDK 57 / Expo Router client using TypeScript, the
current `@clerk/expo` package, TanStack Query, SecureStore, and NativeWind.
It includes Google SSO entry, organization selection (first active Clerk
membership), workspace navigation, task and meeting lists, and the guarded AI
ask flow. It calls the same `/api/v1` endpoints as the web app and never opens
a database connection.

Run locally with:

```bash
cd apps/mobile
npm ci --ignore-scripts
cp .env.example .env
npx expo start
```

`npx expo export --platform web` is a useful deterministic bundle check, but a
real iOS/Android sign-in, push token registration, deep link, and calendar flow
still require an EAS project, Clerk credentials, and a simulator/device.

## Initial workflow

Authentication -> organization selection -> dashboard/My Work -> projects and
tasks -> task details/create/update/comments -> meetings -> notifications -> AI
assistant -> account/settings.

Lists and task actions are mobile workflows, not a shrunken desktop table.
Device registration/token rotation, notification deep links, task detail/create
screens, offline mutation queues, safe-area tuning, dynamic text, and full
screen-reader verification are follow-up work; the current app exposes clear
loading/error/empty states and accessibility labels on its initial controls.
