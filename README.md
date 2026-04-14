Wooserve Kiosk — Nuxt 3 tablet ordering app

Nuxt 3-based kiosk client for Woosoo Nexus. Intended to run on landscape tablets (for example Galaxy Tab A9).
Connects to the Laravel API to display menus and submit orders. Includes a fullscreen PWA manifest for kiosk mode.

Quick start (development)
1. Ensure Node.js 18+ and npm are installed.
2. cd tablet-ordering-pwa
3. npm ci
4. cp .env.example .env and set `MAIN_API_URL` to your Laravel app base URL (e.g. http://127.0.0.1:8000)
5. npm run dev

Build & preview
- `npm run build` — build the production output
- `npm run generate` — static generate to `dist/` with post-build integrity verification
- `npm run preview` — preview the production build (server binds to 0.0.0.0)

Scripts of interest
- `dev`: development server (`npx nuxi dev --host 0.0.0.0`)
- `build`: `npx nuxi build`
- `pregenerate`: removes stale generated artifacts from `public/` before static build
- `generate`: static build + integrity check that all chunk hashes in HTML exist in `dist/`
- `preview`: `npx nuxi preview --host 0.0.0.0`
- `test`: `vitest`
- `rebuild:esbuild`: refreshes esbuild native binary (run automatically during `postinstall`)

Environment variables
- `MAIN_API_URL`: Laravel API base URL used by the client (API routes under `/api`)
- `NUXT_PUBLIC_PUSHER_KEY` / `NUXT_PUBLIC_PUSHER_CLUSTER`: Pusher/Echo realtime configuration

Notes
- `public/manifest.json` is configured for fullscreen and landscape orientation.
- Pinia is used for state management with persisted state plugin enabled.
- For production nginx static hosting, configure HTML (`/index.html`, `/200.html`, `/404.html`) as no-cache and keep hashed assets under `/_nuxt/` immutable.
