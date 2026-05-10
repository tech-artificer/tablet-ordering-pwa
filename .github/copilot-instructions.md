<!-- Repository-specific Copilot instructions for AI coding agents -->
# Tablet Ordering PWA — AI Coding Instructions

This repository is the standalone tablet client for Woosoo. It is a Nuxt SPA/PWA used on restaurant tablets in landscape/kiosk mode.

## Current Architecture

- **Framework:** Nuxt 3 SPA, `ssr: false`
- **State:** Pinia stores with persisted state
- **PWA:** `@vite-pwa/nuxt` using `injectManifest`
- **Service worker source:** `public/sw.ts`
- **Runtime config bridge:** `/runtime-config.js` → `window.__APP_CONFIG__`
- **Integrated deployment:** built by sibling `woosoo-nexus` through Docker Compose
- **Production Dockerfile:** `Dockerfile.prod`
- **Static production runtime:** Nginx serving generated output

## Repository Boundary

This repo is deployed by `woosoo-nexus` as a **sibling repository**:

```txt
parent/
├── woosoo-nexus/
└── tablet-ordering-pwa/
```

Do not assume this repo deploys itself in integrated production. Nexus Compose controls the integrated Docker build and runtime env.

## Runtime Config Rules

Standalone/local development may use `.env`.

Integrated Docker deployment receives runtime values from Nexus Compose and `/runtime-config.js`.

Important runtime values:

```txt
NUXT_PUBLIC_API_BASE_URL
NUXT_PUBLIC_REVERB_APP_KEY
NUXT_PUBLIC_REVERB_HOST
NUXT_PUBLIC_REVERB_PORT
NUXT_PUBLIC_REVERB_SCHEME
NUXT_PUBLIC_REVERB_PATH

APP_RUNTIME_API_BASE_URL
APP_RUNTIME_REVERB_HOST
APP_RUNTIME_REVERB_APP_KEY
APP_RUNTIME_REVERB_PORT
APP_RUNTIME_REVERB_SCHEME
APP_RUNTIME_REVERB_PATH
```

Do not hardcode IP addresses in source code.

## PWA Update Rules

PWA update behavior is production-critical.

Required files/artifacts:

```txt
/runtime-config.js
/sw.js
/manifest.webmanifest
/_nuxt/*
```

Rules:

- `/runtime-config.js` must not be stale.
- `/sw.js` must not be stale.
- Nuxt hashed assets under `/_nuxt/*` may be cached immutably.
- The app must expose a visible update flow through `UpdateBanner`.
- Do not force reload during active order submission or active session unless explicitly approved.

## Current Known Blockers

Before merging staging, verify these are fixed:

- `app.vue` must have only one `useAppUpdate()` lifecycle path.
- `initializeAppUpdate()` must not be called twice.
- `disposeAppUpdate()` must not be called twice.
- Only one `UpdateBanner` should be rendered.
- `UpdateBanner` must not reference undefined `updateAvailable` or `updating`.
- `nuxt.config.ts` must define `app.head.script` only once.

## Required Validation

Run before merge:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run generate
```

For integrated Docker validation, run from sibling `woosoo-nexus`:

```powershell
$env:TABLET_DOCKERFILE = "Dockerfile.prod"
./scripts/deployment/verify-tablet-deploy-context.sh
docker compose build --no-cache tablet-pwa
```

## Development Rules

- Use API service/composable layers instead of direct fetch scattered in components.
- Keep route/state transitions explicit.
- Persist only necessary store keys.
- Never change persisted store keys without migration/clear strategy.
- Do not edit PWA/service-worker behavior without tests.
- Do not mix deployment fixes with UI redesign in the same PR.

## Key Entry Points

- **Runtime config & PWA:** `nuxt.config.ts` (runtime config, PWA rules)
- **Global API client:** `plugins/api.client.ts` — provides `nuxtApp.$api` (Axios) with auth header from `stores/device`
- **Simple API wrapper:** `composables/useApi.ts` — use `const api = useApi()` to call backend
- **Stores:** `stores/*.ts` — Pinia stores with `persist` plugin (e.g., `stores/menu.ts`)
- **Layouts:** `layouts/kiosk.vue` and `layouts/default.vue`
- **Runtime config:** `public/runtime-config.js` template → served as `/runtime-config.js`

## Run / Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server (hosted for tablet)
npm run build            # Production build
npm run generate         # Static generation (for Docker)
npm run preview          # Preview built version
```

## Files to Inspect for Examples

- `stores/menu.ts` — API calls, caching, persisted keys, error handling
- `plugins/api.client.ts` + `composables/useApi.ts` — Axios setup
- `nuxt.config.ts` — env mapping, PWA, icons
- `composables/useAppUpdate.ts` — PWA update handling
- `components/ui/UpdateBanner.vue` — update UI component
- `app.vue` — app initialization (check for duplicate lifecycle calls)

## Do Not Change Without Checks

- `nuxt.config.ts` PWA rules — affect offline ordering and caching
- Pinia persist keys — changing keys invalidates stored sessions
- Service worker caching strategy in `public/sw.ts`
- Runtime config generation in `Dockerfile.prod` / nginx config 
