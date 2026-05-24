// public/sw.ts
// Custom service worker for the Wooserve Tablet PWA.
// Strategy: injectManifest — @vite-pwa/nuxt injects self.__WB_MANIFEST at build time.
//
// Responsibilities:
//   1. Precache all build assets (injected by Workbox)
//   2. Runtime cache menus (NetworkFirst) and images (CacheFirst)
//
// Order submission model: LIVE-ONLY.
// POST /api/devices/create-order and refill routes use plain NetworkOnly — no
// background sync plugin. If the network is unavailable, the request fails
// immediately and useOrderSubmit.ts surfaces "Ordering is unavailable. Please
// call staff." to the user. Silent background retry is intentionally disabled
// to prevent duplicate orders when staff manually re-creates an order during
// an outage and the service worker later replays the queued request.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
  skipWaiting(): void
}

// ---------------------------------------------------------------------------
// 1. Precaching
// ---------------------------------------------------------------------------

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Navigation strategy: NETWORK-FIRST with offline fallback to the precached
// app shell.
//
// Why network-first (not precache-bound): kiosk tablets never close the tab,
// so a precache-bound shell keeps serving stale UI across deploys forever.
// A reachable tablet (these run on the venue LAN) must always get the freshest
// index.html so a new build is picked up on the next controlled reload. When
// the network is unavailable we fall back to the revisioned precached "/" so
// the app still boots offline.
const offlineShellHandler = createHandlerBoundToURL('/')

registerRoute(
  new NavigationRoute(
    async (options) => {
      // 3 s matches the networkTimeoutSeconds used for menus; on a healthy LAN
      // navigation responses arrive in <100 ms, so this only fires on hung/stalled
      // connections that would otherwise block the app shell indefinitely.
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      try {
        // Always try the live document first (LAN is fast; this is what makes
        // a new deployment actually reflect on the tablet).
        const networkResponse = await fetch(options.request, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (networkResponse && networkResponse.ok) {
          return networkResponse
        }
        // Non-OK (5xx/HTML error) — fall back to the cached shell rather than
        // showing a server error page on a customer-facing kiosk.
        return await offlineShellHandler(options)
      } catch {
        // Offline, network failure, or timeout — serve the precached app shell.
        clearTimeout(timeoutId)
        return offlineShellHandler(options)
      }
    },
    {
      denylist: [
        /^\/api/,
        /^\/_nuxt\//,
        /^\/@vite\//,
        /\.(?:js|mjs|css|map|json|webmanifest)$/,
        // Certificate download endpoints must bypass app-shell fallback.
        // If intercepted as navigation, tablets can land back in SPA flow
        // (e.g., settings lock redirect) instead of downloading the CA file.
        /^\/ca\.crt$/,
        /^\/ca\.der$/,
        /^\/ca\.pem$/,
        // Laravel admin/backend routes — must not be served by the PWA shell
        /^\/(login|logout|forgot-password|reset-password|verify-email|confirm-password|dashboard|orders|menus|packages|package-configs|tablet-categories|media|admin|configuration|users|roles|permissions|branches|devices|accessibility|service-requests|event-logs|manual|reports|monitoring|settings|storage|docs|horizon|pulse|telescope|sanctum|broadcasting)([\/]|$)/,
      ],
    },
  ),
)

// ---------------------------------------------------------------------------
// 2. Runtime caching — menus (NetworkFirst, 1-day TTL)
// ---------------------------------------------------------------------------

registerRoute(
  ({ url }: { url: URL }) => /\/api\/menus/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'menus-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 86400, // 1 day
      }),
    ],
  }),
)

// ---------------------------------------------------------------------------
// 3. Runtime caching — images (CacheFirst, 7-day TTL)
// ---------------------------------------------------------------------------

registerRoute(
  ({ url }: { url: URL }) => /\.(png|jpg|jpeg|webp|svg)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 604800, // 7 days
      }),
    ],
  }),
)

// ---------------------------------------------------------------------------
// 4. Order submission — live-only (no background sync)
// ---------------------------------------------------------------------------

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    /\/api\/devices\/create-order$/.test(url.pathname) && request.method === 'POST',
  new NetworkOnly(),
  'POST',
)

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    /\/api\/order\/\d+\/refill$/.test(url.pathname) && request.method === 'POST',
  new NetworkOnly(),
  'POST',
)
