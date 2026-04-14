# Offline Order Sync — Operator Runbook

> **Feature flag:** `NUXT_PUBLIC_OFFLINE_ORDER_SYNC=true` (default: `false`)  
> **Applies to:** `apps/tablet-ordering-pwa`

---

## Overview

When the tablet loses its network connection mid-session, the PWA queues the guest's order
in IndexedDB (via the Dexie outbox) and registers a Workbox Background Sync job. Once
connectivity is restored the custom service worker (`public/sw.ts`) replays the queued
`POST /api/devices/create-order` request and notifies the app via `postMessage` so polling
starts automatically — with no operator intervention required.

---

## Prerequisites

| Requirement | Check |
|---|---|
| PWA installed to tablet home screen (Add to Home Screen) | service worker must be registered |
| `NUXT_PUBLIC_OFFLINE_ORDER_SYNC=true` in `.env` | run `nuxi build` after changing |
| Chrome / Android WebView 88+ | Background Sync API required |

---

## 1. Installing the PWA on a Tablet

1. Open the app URL in Chrome on the tablet.
2. Tap ⋮ → **Add to Home Screen**.
3. Confirm by tapping **Add**.
4. Open the app from the home screen shortcut — it must launch full-screen (no browser chrome).

**Verify:**  
Open Chrome DevTools → Application → Service Workers — the `sw.ts` worker must be in **Activated** state.

---

## 2. Submitting an Order While Offline — Manual QA Flow

1. Open the app from the home screen.
2. On the Android device, disable Wi-Fi and mobile data (or enable Airplane Mode).
3. The orange **"No internet connection"** banner should appear at the top.
4. Select items and proceed to order confirmation — tap **Confirm Order**.
5. Expected outcome: modal closes immediately, a **"Queued for sync"** UX state is shown (no error).
6. Open Chrome DevTools → Application → IndexedDB → `woosoo-offline-outbox` → `orders` table.
   - One record should be present with `status: "queued_sw"`.

---

## 3. Verifying Queue Persistence (App Kill & Reopen)

1. With the order queued (offline, as per step 2 above), force-close the app.
2. Re-open from the home screen.
3. IndexedDB record should still be present with `status: "queued_sw"`.
4. The blue **"Syncing…"** banner should NOT appear yet (no connection).

---

## 4. Reconnecting and Verifying Auto-Sync

1. Re-enable Wi-Fi / mobile data.
2. Within 30–60 seconds (Background Sync timing is browser-controlled), the SW replays the request.
3. Expected sequence:
   - Blue **"Syncing…"** banner appears briefly.
   - Banner disappears — order polling starts in the background.
   - Order moves to the kitchen display as normal.
4. Check IndexedDB → `orders` table: the record should be **gone** (removed on success).

---

## 5. Duplicate-Order Prevention (409 Handling)

If the server received the original request but the SW did not get the response (flaky
connection), the replay will return `HTTP 409 Conflict`. The SW treats 409 as success:

- `orders-sync-409` postMessage is sent to the app.
- `orderStore.setOrderCreated()` + `orderStore.startOrderPolling()` are called.
- The outbox record is removed.
- No error is shown to the guest.

**To simulate:** Submit an order, let it go through normally, then manually re-trigger the
Background Sync via Chrome DevTools → Application → Background Services → Background Sync →
push `order-sync-queue` tag.

---

## 6. Token Expiry / Auth Error Path

If the Bearer token captured at queue time has expired by the time the SW replays the
request, the server returns `401 Unauthorized`. The SW cannot refresh tokens (it has no
access to cookies or localStorage), so:

1. The outbox record status is set to **`auth_error`**.
2. Chrome DevTools → Application → IndexedDB → `orders` table will show `status: "auth_error"`.
3. The app displays an error state (operator must re-authenticate the device).

**Operator action:**
1. Note the table number and items from the `payload` field in the IndexedDB record.
2. Re-authenticate the device (reopen the app, log in as the device user).
3. Manually re-enter the order through the normal flow.
4. Delete the `auth_error` record from IndexedDB to clear the error state:
   - DevTools → Application → IndexedDB → `woosoo-offline-outbox` → `orders` → select record → Delete.

---

## 7. Enabling / Disabling the Feature

### Enable (per-deployment)

```bash
# In apps/tablet-ordering-pwa/.env
NUXT_PUBLIC_OFFLINE_ORDER_SYNC=true
```

Then rebuild and redeploy:

```bash
cd apps/tablet-ordering-pwa
npm run build
```

Or via the Deployment Manager:

```bash
# In deployment_manager
python -m woosoo sync-pwa-env   # propagates flag from config
python -m woosoo build-pwa      # triggers Nuxt build
```

### Disable

Set `NUXT_PUBLIC_OFFLINE_ORDER_SYNC=false` (or omit the key — default is `false`) and rebuild.

When disabled, the feature's code paths are not activated (`useOrderSubmit` falls through to
the standard `orderStore.submitOrder` call). The outbox plugin is still loaded but dormant.

---

## 8. Monitoring

| Signal | Location |
|---|---|
| Queued orders in outbox | Chrome DevTools → IndexedDB → `woosoo-offline-outbox` → `orders` |
| SW sync events | Chrome DevTools → Application → Background Services → Background Sync |
| SW console logs | Chrome DevTools → Console (filter: `[SW]`) |
| App sync state | OfflineSyncStatus banner (top of screen) |

---

## 9. Known Limitations

| Limitation | Reason |
|---|---|
| Refill orders cannot be queued offline | Requires a confirmed `orderId` which must come from the server first |
| Background Sync timing is browser-controlled | May take up to several minutes after reconnect on some Android versions |
| Max retry window: 2 hours | After 2 hours, Workbox drops the queued request to prevent stale orders reaching the kitchen |
| Auth tokens captured at queue time may expire | Devices should re-authenticate daily; session tokens have short TTL |
