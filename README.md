Wooserve KBBQ — Kiosk Nuxt 3 app (Galaxy Tab A9 - landscape)

Quick start:
1. npm install
2. npx nuxi prepare
3. npm run dev

Env:
- MAIN_API_URL -> your Laravel API base (/api)
- NUXT_PUBLIC_PUSHER_KEY / CLUSTER -> Echo config

Notes:
- Fullscreen kiosk manifest is in public/manifest.json (display fullscreen & orientation landscape)
- Pinia persistence enabled via pinia-plugin-persistedstate
- Use `npx nuxi dev` to run on the tablet or emulate with device-specific CSS media query
