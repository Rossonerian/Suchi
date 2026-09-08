# Banani UI replication specification

The Banani export is the visual source of truth for this implementation pass.
The reference fixtures use the product names `Northloop`, `Acme Inc`, and `Maya
Chen`; production UI must substitute the authenticated product, workspace, user,
and API data. The instructional copy visible in a few mobile/collapsed exports
describes behavior and must not be rendered as product copy.

## Reference inventory

| Reference | Native dimensions | Product surface |
|---|---:|---|
| `SignInDark.jpeg` | 4320 × 2700 | Dark sign-in split composition |
| `HomeDarkFocused.jpeg` | 4320 × 2700 | Expanded desktop workspace home |
| `HomeCollapsedsidebar.jpeg` | 4320 × 2700 | Collapsed 240px → 68px desktop shell |
| `WorkspaceonboardingDark.jpeg` | 4320 × 2700 | Two-panel onboarding wizard |
| `Homemobilenavvisible.jpeg` | 1125 × 2400 | 375 × 800 mobile home with nav visible |
| `Homemobilenavhidden.jpeg` | 1125 × 2400 | 375 × 800 mobile feed with nav hidden |
| `AdminOverview.jpeg` | 4560 × 3780 | Platform Admin overview |
| `AdminOrganizations.jpeg` | 4560 × 3780 | Platform Admin organizations table/inspector |
| `AdminUsers.jpeg` | 4560 × 3780 | Platform Admin users table/inspector |

The desktop exports are 3× reference captures of a roughly 1440 × 900 CSS
viewport. The mobile exports are 3× captures of a 375 × 800 CSS viewport. Admin
exports use a wider 1520 × 1260 CSS-like working frame and reserve a right
inspector column.

## Shared visual language

- Canvas: near-black atmospheric field, not flat black. A sparse dotted grid is
  visible behind content, with a broad indigo glow near the upper-right and a
  restrained cyan/teal glow low in the frame.
- Surfaces: opaque dark content panels sit above the canvas. Glass is reserved
  for the sidebar, top bar, dialogs, popovers, and inspectors; data rows remain
  mostly opaque for legibility and performance.
- Accent: electric periwinkle/blue for primary actions and selection. Green is
  success/in-focus, cyan is secondary system emphasis, amber is warning, and
  coral is destructive.
- Borders: thin translucent white/blue lines, often paired with a faint inner
  highlight. Shadows are broad and low-opacity rather than heavy card shadows.
- Geometry: controls roughly 8–12px radius; task rows 12–14px; content cards
  16–18px; shell/sidebar 18–22px; dialogs/sheets 20–24px. Mobile cards become
  softer at roughly 24–30px.
- Typography: modern sans for content and IBM Plex Mono-like utility text for
  dates, IDs, status metadata, and operational labels. Desktop body is about
  14–15px, page title 24–28px, hero title 34–42px. Mobile body is 15–16px and
  focus title is about 28–32px.
- Density: compact desktop productivity layout. The export uses information
  hierarchy, not a grid of equal cards.

## Semantic starting tokens

These values are starting points read from the exports and should remain
semantic rather than scattered through components:

```text
canvas              #0D0E13
canvas-elevated     #111319
sidebar/surface     #171A21 / #17181D
surface-raised      #1B1E27
input-dark          #101116
text-primary        #F2F3F5
text-secondary      #9B9EAA
text-muted          #737783
border-subtle       rgba(255,255,255,.075)
border-strong       rgba(255,255,255,.11)
accent              #6D8AFF
accent-hover        #7D98FF
accent-soft         rgba(109,138,255,.14)
success             #42D47C
warning             #E2B83E
danger              #FF727A
cyan                #35C8D3
```

Light mode is derived from the same hierarchy: cool #F6F7FB canvas, pale blue
atmosphere, translucent white surfaces, #12141A primary text, #68707D secondary
text, and #607FFF accent. It must retain the same density and elevation rather
than become a white card dashboard.

## Desktop workspace shell

`HomeDarkFocused` shows a persistent approximately 240px sidebar, 56–60px
top bar, 12–14px outer margins, a wide main column, and a roughly 300px right
rail. The shell is a single floating composition, not a collection of unrelated
cards.

Expanded sidebar:

- product mark, product/workspace name, current workspace, collapse control;
- Home, My Work, Inbox, Projects, Calendar, Assistant;
- compact unread badges;
- three favorite projects represented by colored dots;
- Settings, Platform Admin when authorized, and user profile at the bottom;
- active state is a subtle blue surface/border and blue icon/text, not a bright
  pill.

Collapsed sidebar:

- interpolates 240px → 68px;
- keeps product mark, icons, badges, favorite dots, avatar, and collapse control;
- tooltip/name remains available to keyboard and screen-reader users;
- the exported instructional banner is not rendered in production.

Top bar:

- workspace breadcrumb and current destination at left;
- large central `Search anything…` command field with shortcut hint;
- in-focus indicator, notifications, and Create action at right;
- a restrained glass strip with a single visual hierarchy.

Home:

- atmospheric focus hero with day/focus metadata, real user greeting, highest
  priority commitment, Start focus action, next meeting, and flow avatars;
- `Today's three` grouped panel with completion circle, task title, status,
  due/time, priority, and avatar; completed row is muted with a green check;
- right rail contains Up next meeting and a compact Pulse visualization;
- low-priority “everything else” summary is shown only when the API provides
  real counts; no fixture claims or fake numbers.

## Mobile workspace

The 375 × 800 references are a native-style feed, not a compressed desktop table:

- avatar, greeting/date, remaining-work count, and notification button;
- large focus card with one commitment and full-width Start focus action;
- one grouped Today's three card;
- one horizontal next-meeting card with Join;
- floating glass bottom nav with Home, My Work, Inbox, Calendar, and a large
  circular Create FAB;
- scrolling down hides the bar while leaving the FAB and a small reveal affordance;
  scrolling up or tapping reveal restores it. This behavior is implemented with
  hysteresis and reduced-motion fallback. The annotation text in the export is
  not product copy.

## Sign-in and onboarding

`SignInDark` uses the dotted atmospheric canvas, a left brand/welcome column,
and a dark elevated right sign-in panel. The panel contains Google continuation,
email/password fallback, password visibility, primary action, recovery, and
workspace creation. Fixture trust/compliance/customer claims must not ship
unless backed by real product data.

`WorkspaceonboardingDark` uses a centered wide two-panel card. The left tinted
step rail shows completed/current/up-next steps and autosave metadata. The right
panel shows a concise import-work heading, real integrations only, Start fresh,
Back, Skip, and Continue. Provider tiles must be disabled or labeled honestly
when an integration is unavailable.

## Platform Admin

The Admin exports use a separate, more neutral data-dense shell:

- 276px-ish sidebar labeled Platform Admin/internal/restricted with audit-session
  cue, Overview, Organizations, Users, System Health, Audit Logs, Back to
  workspace, Runbooks, and operator identity;
- top bar with breadcrumb, global admin search, real health status, and alerts;
- compact metric strip rather than giant KPI cards;
- Overview uses approximately 60/40 Platform Activity and System Health columns;
- Organizations and Users use a table plus right inspector. Selected rows use a
  subtle blue highlight. Inspectors expose actual membership, integration,
  activity, session, and destructive controls; no fake counts or uptime claims.
- Admin destructive actions require typed confirmation and remain server-
  authorized regardless of frontend visibility.

## Responsive and motion intent

- 1440px: expanded sidebar, full main/right-rail composition.
- 768px: collapsed icon rail by default, tooltip labels, usable top-bar search.
- 390px: no desktop sidebar; compact header, feed/cards, floating nav/FAB.
- Glass blur targets 18–28px only on shell/overlay boundaries. Data rows are
  mostly opaque.
- Motion uses 120–160ms micro interactions, 180–240ms normal transitions,
  220–320ms sheets/dialogs, and 240–360ms workspace transitions. Prefer opacity,
  transform, and layout animation. Disable or reduce motion/transparency under
  user preferences.

## Truthfulness and accessibility constraints

- Replace Northloop/Acme/Maya fixture content with actual product data.
- Never render the export's explanatory annotations or unsupported compliance,
  uptime, customer, or system-health claims.
- Preserve semantic focus, keyboard operation, `aria-current`, `aria-sort`,
  dialog focus containment/return, readable contrast, and reduced-motion and
  reduced-transparency fallbacks.
