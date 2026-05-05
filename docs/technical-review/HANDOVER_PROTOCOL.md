# HANDOVER_PROTOCOL: Tablet Ordering PWA Technical Review

## Current Status

Documentation branch created from `staging`:

```txt
tech-artificer/tablet-ordering-pwa -> docs/technical-review
```

## Documents Added

```txt
docs/technical-review/CASE_FILE.md
docs/technical-review/ARCHITECTURE.md
docs/technical-review/WORKFLOWS.md
docs/technical-review/API_AND_EVENT_CONTRACTS.md
docs/technical-review/PWA_OFFLINE_AND_TESTABILITY.md
docs/technical-review/HANDOVER_PROTOCOL.md
```

## Confirmed Technical Baseline

- Nuxt 3 SPA with `ssr: false`.
- Pinia state management with persisted state.
- Custom Workbox service worker using `injectManifest`.
- Background Sync for `POST /api/devices/create-order`.
- Laravel Echo/Pusher client for Reverb realtime events.
- Device auth, table assignment, token refresh, and broadcast config are coordinated through `stores/Device.ts`.
- Order creation, payload construction, idempotency key lifecycle, refill handling, and polling fallback are coordinated through `stores/Order.ts`.

## Highest Priority Follow-Ups

### P1: Backend Idempotency Verification

The frontend sends `X-Idempotency-Key` for initial order creation and refills. Production safety requires WooSoo-Nexus to persist and enforce the key per device/session/table.

Verify in backend:

- `DeviceOrderApiController`
- order service/action classes
- migrations related to idempotency keys or order requests
- conflict handling for HTTP `409`

### P1: Event Contract Verification

Confirm exact Reverb channels, event names, and payloads. Every terminal/reset event must include enough identifiers to reject stale events.

Minimum required identifiers:

- `device_id`
- `table_id`
- `session_id`
- `order_id`
- `status`
- `occurred_at`

### P1: Public Runtime Config Review

`runtimeConfig.public.deviceAuthPasscode` exists. Because public runtime config is browser-visible, it must not be used as a privileged secret.

Confirm:

- Whether the passcode is still used.
- Whether it is only a UX convenience.
- Whether backend security codes are one-time or server-authorized.

### P1: Offline Replay Safety

The PWA queues order submissions for up to two hours. Confirm queued requests cannot create orders after:

- device reassignment
- table reassignment
- session reset
- POS terminal session closure
- token expiry and refresh

### P2: v2 Menu Cache Policy

The service worker caches `/api/menus`, while the tablet browse routes are `/api/v2/tablet/*`. Decide whether v2 routes should be cached, explicitly online-only, or stored through Dexie.

## Recommended Next Repository

Continue in backend repository:

```txt
tech-artificer/woosoo-nexus
```

Use a separate backend docs branch, for example:

```txt
docs/technical-review
```

Do not modify backend and frontend in a single commit.

## Backend Files to Inspect Next

```txt
routes/api.php
routes/channels.php
config/auth.php
config/sanctum.php
config/broadcasting.php
config/database.php
app/Http/Controllers/Api/V1/Auth/DeviceAuthApiController.php
app/Http/Controllers/Api/V1/DeviceOrderApiController.php
app/Http/Controllers/Api/V1/OrderApiController.php
app/Http/Controllers/Api/V1/SessionApiController.php
app/Http/Controllers/Api/V2/TabletApiController.php
app/Models/Device.php
app/Models/DeviceOrder.php
app/Events/*
app/Jobs/*
app/Services/*
database/migrations/*
```

## Completion Definition

The full platform review is complete only when both repositories document:

- architecture
- workflows
- API contracts
- event contracts
- database/local storage schema
- race condition audit
- security boundary audit
- state machine audit
- testability audit
- production readiness criteria

## Final Operator Note

The frontend is not architecturally careless. It already contains several mature protections: centralized submit locking, idempotency key reuse, offline queueing, refill terminal-state verification, Echo reinit protection, and polling fallback. The remaining confidence gap lives mostly at the boundary between the PWA and WooSoo-Nexus: backend idempotency, event payload precision, and session/table ownership enforcement.
