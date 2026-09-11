# NIDAR to Suchi Rebranding Audit & Matrix

## 1. Executive Summary

The platform has undergone a brand transition from **NIDAR** to **Suchi**. This rename has been executed across the web application, mobile client, backend services, authentication layers, configuration files, and package manifests while maintaining domain stability and backward compatibility.

---

## 2. Component Change Matrix

| Subsystem | Area | Old Value | New Value | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Root** | `package.json` | `nidar-dashboard` | `suchi-platform` | Root workspace descriptor |
| **Backend** | `backend/package.json` | `nidar-backend` | `suchi-backend` | Express API package name |
| **Backend** | `backend/saas/auth.js` | `appName: 'Nidar'` | `appName: 'Suchi'` | Better Auth application title |
| **Backend** | `backend/saas/auth.js` | `cookiePrefix: 'nidar'` | `cookiePrefix: 'suchi'` | Session cookie prefix |
| **Backend** | `backend/saas/auth.js` | `['nidar://']` | `['suchi://', 'nidar://']` | Dual-scheme support for backward compatibility |
| **Backend** | `backend/saas/ai.js` | "NIDAR workspace assistant" | "Suchi workspace assistant" | Assistant grounding prompt |
| **Backend** | `backend/jobs/inngest.js` | `id: 'nidar-saas'` | `id: 'suchi-saas'` | Background job orchestrator client ID |
| **Database** | `packages/database` | `nidar-database` | `@suchi/database` | Monorepo database client package |
| **Schemas** | `packages/schemas` | `nidar-schemas` | `@suchi/schemas` | Shared schemas package |
| **Domain** | `packages/domain` | `nidar-domain` | `@suchi/domain` | Shared business rules package |
| **Frontend** | `frontend/package.json` | `nidar-frontend` | `suchi-web` | Web client package name |
| **Frontend** | `frontend/pages/index.js` | "Sign in to NIDAR" | "Sign in to Suchi" | Authentication login headline |
| **Frontend** | `frontend/pages/index.js` | "NIDAR WORKSPACE PLATFORM" | "SUCHI WORKSPACE PLATFORM" | Hero branding |
| **Frontend** | `frontend/pages/onboarding.js` | "NIDAR WORKSPACE PLATFORM" | "SUCHI WORKSPACE PLATFORM" | Onboarding header |
| **Frontend** | `frontend/pages/_document.js` | "Nidar - Workspace platform..." | "Suchi - Workspace platform..." | Meta description |
| **Frontend** | `frontend/pages/admin/members.js`| "NIDAR member accounts" | "Suchi member accounts" | Admin user table caption |
| **Frontend** | `WorkspaceFrame.js` | "N" / "NIDAR WORKSPACE" | "S" / "SUCHI WORKSPACE" | Navigation header & workspace avatar |
| **Mobile** | `apps/mobile/package.json` | `@nidar/mobile` | `@suchi/mobile` | Expo package manifest |
| **Mobile** | `apps/mobile/app.json` | `name: "Nidar"` | `name: "Suchi"` | App bundle display name |
| **Mobile** | `apps/mobile/app.json` | `slug: "nidar"` | `slug: "suchi"` | Expo project slug |
| **Mobile** | `apps/mobile/app.json` | `scheme: "nidar"` | `scheme: "suchi"` | Deep linking URI scheme |
| **Mobile** | `apps/mobile/app.json` | `package: "com.nidar.workspace"` | `package: "com.suchi.workspace"` | Android package identifier |
| **Mobile** | `apps/mobile/src/auth.ts` | `scheme: 'nidar'` | `scheme: 'suchi'` | OAuth redirect resolution |
| **Mobile** | `apps/mobile/src/auth.ts` | `storagePrefix: 'nidar'` | `storagePrefix: 'suchi'` | SecureStore token storage namespace |
| **Mobile** | `apps/mobile/src/banani.tsx`| "N" / "Nidar" | "S" / "Suchi" | Accessibility labels & branding glyph |

---

## 3. Deliberate Invariants Preserved

1. **Filesystem Directory**: The project root directory remains `/home/rosso/Projects/Nidar-Dashboard` to prevent breaking existing CLI tooling, IDE configurations, and workspace bindings.
2. **Database Schemas & Tables**: Table names (`UserProfile`, `Organization`, `Project`, etc.) and database column identifiers remain untouched to guarantee zero data loss and avoid destructive table migrations.
3. **Dual Protocol Schemes**: The backend authentication layer permits both `suchi://` and `nidar://` protocols, ensuring legacy mobile builds can still complete authentication flows during transition periods.
