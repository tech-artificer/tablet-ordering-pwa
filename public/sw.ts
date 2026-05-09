// public/sw.ts
// Custom service worker for the Wooserve Tablet PWA.
// Strategy: injectManifest — @vite-pwa/nuxt injects self.__WB_MANIFEST at build time.
//
// Responsibilities:
//   1. Precache all build assets (injected by Workbox)
//   2. Runtime cache menus (NetworkFirst) and images (CacheFirst)
//   3. Queue POST /api/devices/create-order with BackgroundSyncPlugin (2-hour max)
//   4. Bridge Background Sync lifecycle events back to window clients via postMessage

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

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

// Navigation fallback: bind to the revisioned root app shell.
// The prerendered "/" entry is revisioned by Nuxt, so this avoids the stale
// unrevisioned "/index.html" path staying alive across deployments.
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/'),
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
// 4. Background Sync — order submission queue (2-hour max retention)
// ---------------------------------------------------------------------------

const ORDER_QUEUE_NAME = 'order-sync-queue' as const
const ORDER_MAX_RETENTION_MS = 2 * 60 * 60 * 1000 // 2 hours

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage(message)
  }
}

const bgSyncPlugin = new BackgroundSyncPlugin(ORDER_QUEUE_NAME, {
  maxRetentionTime: ORDER_MAX_RETENTION_MS / 60 / 1000, // Workbox expects minutes
  async onSync({ queue }) {
    await notifyClients({ type: 'orders-sync-start' })
    let entry = await queue.shiftRequest()
    while (entry) {
      try {
        const response = await fetch(entry.request.clone())
        if (response.ok || response.status === 409 || response.status === 201) {
          const body = await response.clone().json().catch(() => null)
          if (response.status === 409) {
            await notifyClients({ type: 'orders-sync-409', order: body?.order ?? body })
          } else {
            await notifyClients({ type: 'orders-sync-success', order: body?.order ?? body })
          }
        } else if (response.status === 401) {
          // Auth error — put back and notify; do not retry indefinitely
          await queue.unshiftRequest(entry)
          await notifyClients({ type: 'orders-sync-error', message: 'auth_error: 401 — device token expired' })
          break
        } else if (response.status === 429 || response.status >= 500) {
          // Retryable server/rate-limit error — re-queue and stop so Workbox retries later
          await queue.unshiftRequest(entry)
          await notifyClients({
            type: 'orders-sync-error',
            message: `Retryable server response ${response.status}`,
          })
          throw new Error(`Retryable server response ${response.status}`)
        } else {
          // Non-retriable client/server response
          await notifyClients({
            type: 'orders-sync-error',
            message: `Server responded ${response.status}`,
          })
        }
      } catch (err) {
        // Network failure — re-queue and stop (Workbox will retry on next sync event)
        await queue.unshiftRequest(entry)
        await notifyClients({
          type: 'orders-sync-error',
          message: err instanceof Error ? err.message : 'Network error',
        })
        throw err
      }
      entry = await queue.shiftRequest()
    }
  },
})

registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    /\/api\/devices\/create-order$/.test(url.pathname) && request.method === 'POST',
  new NetworkOnly({
    // Only bgSyncPlugin — it handles queueing on failure AND all replay notifications
    // via onSync. syncBridgePlugin was removed: it fired orders-sync-start/success
    // for every live request, causing spurious UI banner flashes and duplicate
    // setOrderCreated calls for normal online orders.
    plugins: [bgSyncPlugin],
  }),
  'POST',
)
