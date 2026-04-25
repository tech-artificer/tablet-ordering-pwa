# Tablet Ordering PWA — API Trace Reference

This document is the trace-first reference for the customer journey and the settings transactions in `tablet-ordering-pwa`.

It is meant to answer three questions quickly:

1. **What screen triggers which API call?**
2. **Does the backend route actually exist?**
3. **Are there any accuracy gaps or stale endpoint constants to watch?**

> Verification basis: static audit against `tablet-ordering-pwa` call sites and `woosoo-nexus/routes/api.php` backend routes.
> Runtime smoke verification is still recommended before any release decision.

---

## Trace legend

- `✅` = route exists in backend and the call site is known
- `⚠️` = route exists, but behavior or contract needs attention
- `❌` = stale, misleading, or missing reference
- `🧪` = not runtime-tested in this session

---

## Journey map

```mermaid
flowchart TD
    A([Welcome /]) --> B{Settings PIN?}
    B -->|Yes| C[Settings /settings]
    B -->|No| D[Begin the Feast]

    C --> C1[Auto: POST /api/device/table or GET fallback\nTrace: S1]
    C1 --> C2[Auto: GET /api/devices/login\nTrace: S2]
    C2 --> C3[Verify token: GET /api/token/verify\nTrace: S3]
    C3 --> C4[Refresh token: POST /api/devices/refresh\nTrace: S4]
    C4 --> C5[Save override: PUT /api/devices/{id}\nTrace: S5]
    C5 --> C6[Test order: POST /api/devices/create-order\nTrace: S6]

    D --> E[Order start /order/start]
    E --> F[Package selection /order/packageSelection]
    F --> G[Menu /menu]
    G --> H[Review /order/review]
    H --> I[Submit: POST /api/devices/create-order\nTrace: J1]
    I --> J[In-session /order/in-session]
    J --> J1[Sync session: GET /api/session/latest\nTrace: J2]
    J --> J2[Poll order: GET /api/device-order/by-order-id/{orderId}\nTrace: J3]
    J --> J3[Service request: POST /api/service/request\nTrace: J4]
    J --> J4[Refill: POST /api/order/{orderId}/refill\nTrace: J5]
    J --> K[Session ended /order/session-ended]
    K --> A
```

---

## Trace index

### Settings path

| Trace ID | File / action | Method | Endpoint | Auth | Backend handler | Verification | Notes |
|---|---|---:|---|---|---|---|---|
| S1 | `pages/settings.vue` mount: table lookup by IP | `POST` / `GET` fallback | `/api/device/table` | `auth:device` | `DeviceApiController@getTableByIp` | ✅ route exists | Primary flow uses POST; GET is fallback if 405 is returned. If called before auth exists, it may 401. |
| S2 | `deviceStore.authenticate()` | `GET` | `/api/devices/login` | guest | `DeviceAuthApiController@authenticate` | ✅ route exists | Used for IP-based login / auto-auth. |
| S3 | `settings.vue` token check | `GET` | `/api/token/verify` | `auth:device` | inline route closure | ✅ route exists | Confirms current bearer token state. |
| S4 | `deviceStore.refresh()` | `POST` | `/api/devices/refresh` | `auth:device` | `DeviceAuthApiController@refresh` | ✅ route exists | Reissues token and extends device session continuity. |
| S5 | `saveTableOverride()` | `PUT` | `/api/devices/{id}` | `auth:device` | `DeviceApiController@update` | ✅ route exists | Used for table / network override updates. |
| S6 | diagnostics order test | `POST` | `/api/devices/create-order` | `auth:device` | `DeviceOrderApiController` | ✅ route exists | Real order creation path; treat as a live backend write. |

### Customer journey path

| Trace ID | Screen / store | Method | Endpoint | Auth | Backend handler | Verification | Notes |
|---|---|---:|---|---|---|---|---|
| J1 | `orderStore.submitOrder()` | `POST` | `/api/devices/create-order` | `auth:device` | `DeviceOrderApiController` | ✅ route exists | Includes idempotency key and offline queue fallback. |
| J2 | `SessionStore.syncFromServer()` | `GET` | `/api/session/latest` | `auth:device` | `SessionApiController@current` | ✅ route exists | Keeps client timer aligned with server state. |
| J3 | `OrderStore.startOrderPolling()` / recovery | `GET` | `/api/device-order/by-order-id/{orderId}` | `auth:device` | `OrderApiController@showByExternalId` | ✅ route exists | Primary order-status poll and recovery lookup. |
| J4 | service request flow | `POST` | `/api/service/request` | `auth:device` | `ServiceRequestApiController@store` | ✅ route exists | Uses `order_id` and `table_service_id`. |
| J5 | refill flow | `POST` | `/api/order/{orderId}/refill` | `auth:device` | `OrderApiController@refill` | ✅ route exists | Secondary order submission path for refill items. |

### Menu loading path

| Trace ID | Store method | Method | Endpoint | Auth | Backend handler | Verification | Notes |
|---|---|---:|---|---|---|---|---|
| M1 | `menuStore.fetchPackages()` | `GET` | `/api/v2/tablet/packages` | `auth:device` | `TabletApiController@packages` | ✅ route exists | Package carousel source. |
| M2 | `menuStore.fetchPackageDetails(id)` | `GET` | `/api/v2/tablet/packages/{id}` | `auth:device` | `TabletApiController@packageDetails` | ✅ route exists | Includes package detail + meat selection context. |
| M3 | `menuStore.fetchMeatCategories()` | `GET` | `/api/v2/tablet/meat-categories` | `auth:device` | `TabletApiController@meatCategories` | ✅ route exists | Meat tab data source. |
| M4 | `menuStore.fetchTabletCategories()` | `GET` | `/api/v2/tablet/categories` | `auth:device` | `TabletApiController@categories` | ✅ route exists | Drives sides / desserts / beverages category resolution. |
| M5 | `menuStore.fetchDesserts()` / `fetchSides()` / `fetchBeverages()` | `GET` | `/api/v2/tablet/categories/{slug}/menus` | `auth:device` | `TabletApiController@categoryMenus` | ✅ route exists | Category-specific menu list. |

---

## Accuracy notes

These are the items to watch when tracing whether the PWA is using the right endpoint contract.

| Item | Status | Why it matters |
|---|---|---|
| `config/api.ts` → `DEVICE_LOGIN` | ❌ stale | Points to `/api/device/login`, but the backend route is `/api/devices/login`. |
| `config/api.ts` → `DEVICE_SESSION` | ❌ stale | No matching backend route was found in the audit. |
| `config/api.ts` → `DEVICE_STATUS` | ❌ stale | No matching backend route was found in the audit. |
| `settings.vue` table lookup before auth | ⚠️ needs attention | `/api/device/table` is protected by `auth:device`, so a cold start can 401 before token bootstrap completes. |
| `POST /api/sessions/join` | ⚠️ semantic alias | Backend maps it to the same handler as `GET /api/sessions/current`; route exists, but the verb semantics are unusual. |
| `GET /api/tables/services` | ✅ verified | Route exists and should be used for service-option lookup if the UI needs dynamic data. |

---

## Endpoint confidence summary

### Verified as existing in backend routes

- `GET /api/devices/login`
- `POST /api/devices/register`
- `POST /api/devices/refresh`
- `GET /api/token/verify`
- `POST`/`GET /api/device/table`
- `PUT /api/devices/{id}`
- `POST /api/devices/create-order`
- `GET /api/session/latest`
- `GET /api/v2/tablet/packages`
- `GET /api/v2/tablet/packages/{id}`
- `GET /api/v2/tablet/meat-categories`
- `GET /api/v2/tablet/categories`
- `GET /api/v2/tablet/categories/{slug}/menus`
- `GET /api/device-order/by-order-id/{orderId}`
- `GET /api/device-orders`
- `POST /api/order/{orderId}/refill`
- `POST /api/service/request`
- `GET /api/tables/services`

### Still worth runtime smoke-checking

- IP bootstrap on a cold tablet after a hard refresh
- Settings lookup when the device is not yet authenticated
- Real order submission with idempotency key replay
- Refill flow after order completion and after offline recovery
- Service request flow when service options are populated dynamically

---

## Fast tracing tips

1. Start in `pages/index.vue` for the welcome entry point.
2. Use the trace IDs in this doc to jump from screen to endpoint.
3. If you are checking a specific request, search for the exact endpoint string in `tablet-ordering-pwa` first, then confirm the handler in `woosoo-nexus/routes/api.php`.
4. When a route is marked `⚠️`, verify both the HTTP verb and middleware before calling it a working contract.

---

## Related files

- `tablet-ordering-pwa/CASE_FILE.md`
- `tablet-ordering-pwa/docs/WORKFLOW.md`
- `woosoo-nexus/docs/API_MAP.md`
- `woosoo-nexus/docs/END_TO_END_WORKFLOW.md`
