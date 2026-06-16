# Grillpad — Tablet Ordering PWA

Nuxt 3 kiosk client for the **Woosoo** restaurant ecosystem. Runs on landscape tablets (e.g.
Galaxy Tab A9) at each table. Connects to **woosoo-nexus** for menus and order submission; listens
to Laravel Reverb for session lifecycle events.

Part of the production **3-app chain**: tablet → Nexus → Print Bridge.

Ecosystem map: [`../docs/WOOSOO_ECOSYSTEM_OVERVIEW.md`](../docs/WOOSOO_ECOSYSTEM_OVERVIEW.md)
(platform repo).

## Role

- Customer-facing ordering: guest count → package → menu → review → submit
- Sends **intent only** to Nexus (`guest_count`, `package_id`, `items[]`) — no pricing or order state
- Session recovery and kiosk UX; Echo/Reverb for `order.completed`, `order.voided`, `session.reset`
- Fullscreen PWA manifest for kiosk mode

## Stack

- Nuxt 3, Pinia, Tailwind, PWA
- Laravel Echo / Reverb client

## Quick start (development)

1. Ensure Node.js 18+ and npm are installed.
2. `cd tablet-ordering-pwa`
3. `npm ci`
4. Copy `.env.example` to `.env` and keep `NUXT_PUBLIC_API_BASE_URL=/api` for the canonical
   Docker/LAN setup behind nginx.
5. `npm run dev`

## Build and preview

- `npm run build` — production build
- `npm run generate` — static generate to `dist/` with post-build integrity verification
- `npm run preview` — preview production build (binds to `0.0.0.0`)

## Scripts of interest

- `dev`: `npx nuxi dev --host 0.0.0.0`
- `build`: `npx nuxi build`
- `pregenerate`: removes stale generated artifacts from `public/` before static build
- `generate`: static build + integrity check that chunk hashes in HTML exist in `dist/`
- `preview`: `npx nuxi preview --host 0.0.0.0`
- `test`: `vitest`

## Environment variables

- `NUXT_PUBLIC_API_BASE_URL` — Laravel API base URL. Use `/api` for canonical Docker/LAN via nginx.
- `NUXT_PUBLIC_PUSHER_KEY` / `NUXT_PUBLIC_PUSHER_CLUSTER` — Echo/Reverb configuration

## Deployment

Production builds are served from the platform-root Docker stack (`woosoo-platform/compose.yaml`,
`tablet-pwa` service). Deploy from the platform repo — see
`woosoo-platform/docs/deployment/DEPLOYMENT_GUIDE.md`.

## Contracts

Tablet → Nexus payload and rules: `woosoo-platform/contracts/tablet-api.contract.md`

WebSocket events: `woosoo-platform/contracts/websocket-events.contract.md`

## Notes

- `public/manifest.json` — fullscreen, landscape orientation
- Pinia with persisted state for recovery
- Production nginx: no-cache HTML; immutable hashed assets under `/_nuxt/`
