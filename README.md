Wooserve Kiosk — Nuxt 3 tablet ordering app

Nuxt 3-based kiosk client for Woosoo Nexus. Intended to run on landscape tablets (for example Galaxy Tab A9).
Connects to the Laravel API to display menus and submit orders. Includes a fullscreen PWA manifest for kiosk mode.

## Deployment Options

This app can be deployed in two ways:

1. **Progressive Web App (PWA)** - Deploy to a web server and access via browser
2. **Native Android App** - Build as Android tablet app using Capacitor (see [docs/CAPACITOR.md](docs/CAPACITOR.md))

> **Note:** iOS is not supported. This app is designed specifically for Android tablets.

Quick start (development)
1. Ensure Node.js 18+ and npm are installed.
2. cd tablet-ordering-pwa
3. npm ci
4. cp .env.example .env and set `MAIN_API_URL` to your Laravel app base URL (e.g. http://127.0.0.1:8000)
5. npm run dev

Build & preview
- `npm run build` — build the production output
- `npm run preview` — preview the production build (server binds to 0.0.0.0)

Scripts of interest
- `dev`: development server (`npx nuxi dev --host 0.0.0.0`)
- `build`: `npx nuxi build`
- `preview`: `npx nuxi preview --host 0.0.0.0`
- `test`: `vitest`
- `rebuild:esbuild`: refreshes esbuild native binary (run automatically during `postinstall`)

Capacitor scripts (for native Android builds)
- `cap:sync:android` - Generate web app and sync to Android
- `cap:run:android` - Build and run on Android device/emulator
- `cap:open:android` - Open project in Android Studio
- `cap:build:android` - Build Android release APK

See [docs/CAPACITOR.md](docs/CAPACITOR.md) for complete Android build instructions.

Environment variables
- `MAIN_API_URL`: Laravel API base URL used by the client (API routes under `/api`)
- `NUXT_PUBLIC_PUSHER_KEY` / `NUXT_PUBLIC_PUSHER_CLUSTER`: Pusher/Echo realtime configuration

Notes
- `public/manifest.json` is configured for fullscreen and landscape orientation.
- Pinia is used for state management with persisted state plugin enabled.
- Capacitor integration provides enhanced native features (haptics, network monitoring, app lifecycle).
