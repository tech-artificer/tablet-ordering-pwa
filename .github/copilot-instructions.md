<!-- Repository-specific Copilot instructions for AI coding agents -->
# Enable GPT-5 mini for all clients

This repository is a Nuxt 3 PWA kiosk app (tablet landscape) used for in-store ordering. Below are concise, actionable notes to help AI coding agents be productive quickly.

- **Big picture:** Nuxt 3 SPA (ssr: false) with Pinia for state, PWA support (`@vite-pwa/nuxt`), Tailwind for styles, and Axios for API calls. API backend is a Laravel app (set `MAIN_API_URL` in env). See `nuxt.config.ts` for runtime config and PWA/workbox rules.

- **Key entry points & examples:**
  - Runtime config & PWA: `nuxt.config.ts` (look for `runtimeConfig.public` and `pwa.workbox` rules).
  - Global API client: `plugins/api.client.ts` — provides `nuxtApp.$api` (Axios) and sets auth header from `stores/device`.
  - Simple API wrapper: `composables/useApi.ts` — use `const api = useApi()` to call backend.
  - Stores: `stores/*.ts` (e.g., `stores/menu.ts`) — Pinia stores commonly use `persist` with a `key` like `menu-store`.
  - Layouts: `layouts/kiosk.vue` and `layouts/default.vue` control kiosk vs normal shell.
  - PWA extras: `public/manifest.json` and `sw.js` exist for offline behavior.

- **Run / build commands (from `package.json`):**
  - Install: `npm install`
  - Prepare: `npx nuxi prepare` (or runs automatically via `postinstall`)
  - Dev (hosted for tablet): `npm run dev` (expands to `npx nuxi dev --host 0.0.0.0`)
  - Build: `npm run build`; Preview: `npm run preview`

- **Environment & runtime values:**
  - API base: `runtimeConfig.public.mainApiUrl` (env var `MAIN_API_URL`).
  - Echo / broadcasting: `runtimeConfig.public.echo` and `NUXT_PUBLIC_ECHO_*` envs.
  - App mode: `ssr: false` (client SPA only). Use device emulation for tablet layout.

- **Conventions & patterns to follow (concrete):**
  - Always call API through `useApi()` (or `nuxtApp.$api`) so interceptors and device token are applied (see `plugins/api.client.ts`).
  - Pinia stores use `persist: { key: ..., pick: [...] }` — prefer only persisting necessary keys (see `stores/menu.ts`).
  - Loading / error flags in stores are explicit: look for `isLoading*` and `errors` objects; update them consistently when adding APIs.
  - Network-safe caching: `stores/menu.ts` implements `lastFetched` + `isCacheStale` and `loadAllMenus()` — reuse this pattern for other cached resources.
  - Use `nuxtApp.$router` / page navigation only from pages/layouts — components should emit events unless clearly UI-only.

- **Broadcasting & realtime:** `plugins/echo.client.ts` / `echo.client.ts` (check `plugins/`) use runtime echo config; confirm `NUXT_PUBLIC_BROADCAST_CONNECTION` when changing broadcast logic.

- **Diagnostics & debugging:**
  - `devtools` are enabled in `nuxt.config.ts`. Check console logs (many stores use `console.log`) for runtime traces.
  - Service worker caching is configured in `pwa.workbox.navigateFallbackDenylist` — avoid caching `/api` routes.

- **Files to inspect for examples when implementing features:**
  - `stores/menu.ts` — API calls, caching, persisted keys, and error handling.
  - `plugins/api.client.ts` + `composables/useApi.ts` — Axios setup and consumption.
  - `nuxt.config.ts` — env mapping, PWA, and icons.
  - `components/` and `pages/` — domain-organized components (e.g., `components/menu`, `components/order`).

- **Do not change without checks:**
  - `nuxt.config.ts` PWA/workbox rules — these affect offline ordering and caching.
  - Pinia persist keys (changing keys will invalidate stored sessions on devices).

If anything in this file is unclear or you want more examples (e.g., a pattern for adding a new persisted store or a step-by-step to add a new API route), tell me which area and I'll expand with concrete code snippets. 
