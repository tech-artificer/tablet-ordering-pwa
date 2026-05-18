---
status: canonical
last_reviewed: 2026-05-14
verified_by: route list + active test suite
scope: tablet-ordering-pwa
---

# Tablet Ordering PWA Production Stability Audit

## 1. Executive summary

- The PWA is a Nuxt 3 SPA built for kiosk use: fullscreen-first, hard route recovery through `/`, and staff-only operational access through `/settings`. It assumes the Laravel backend (`woosoo-nexus`) is the source of truth for device identity, menu/package data, session state, order creation, refill handling, and realtime order status.
- The biggest correctness risk is the **offline-ordering contradiction**: the service worker (`public/sw.ts`) and offline outbox plugin queue create-order POSTs for background sync, but `OrderingStep3ReviewSubmit.vue` blocks submit whenever offline, and `useOrderSubmit.ts` documents itself as live-only. The app advertises offline infrastructure without a consistent active transaction path.
- A **second class of risk is duplicated submit abstractions**: `useOrderSubmit.ts`, `useOrderSubmission.ts`, `useSubmissionIdempotency.ts`, `useSubmitState.ts`, and `useOfflineOrderQueue.ts` overlap. Tests/docs can pass while production uses a different path.
- Bootstrap is forgiving by design but **too tolerant of partial backend failure**: a failed `fetchLatestSession()` or menu preload is logged as a warning and the client can still mark the session active locally.
- Recovery paths (`/recovery`, `/sw-reset`, hard-navigation chunk-error escape) are real and well thought through, but the surrounding multi-writer architecture (watchers + polling + Reverb + timers + SW) means terminal transitions still depend on guard ordering.

## 2. Runtime facts

### 2.1 Real entrypoint

The real runtime entrypoint is `pages/index.vue` — not a multi-route wizard. That page handles device readiness, session start, settings PIN access, active-order recovery, and redirect into the ordering flow. Control plane: `app.vue`, `middleware/boot.global.ts`, `plugins/api.client.ts`, `plugins/echo.client.ts`, `plugins/error-handler.client.ts`.

### 2.2 Persistence model

| Surface | Mechanism | Files |
|---|---|---|
| Device/session/order state | Pinia persisted state in `localStorage` | `stores/Device.ts`, `stores/Session.ts`, `stores/Order.ts` |
| Short-lived auth/session helpers | `sessionStorage` | `pages/index.vue`, `stores/Session.ts`, `stores/Order.ts` |
| Offline outbox bookkeeping | Dexie IndexedDB | `plugins/offline-outbox.client.ts`, `types/offline-order.ts` |
| Service worker caching / background sync | Workbox SW | `public/sw.ts` |

This app is designed to survive kiosk refreshes and partial offline incidents, but its actual transaction model is still primarily live-online. Initial order submit has traces of offline infrastructure; refill and service-call flows are explicitly online-only.

### 2.3 Pages and routes

| Route | File | Purpose | Required state | Status |
|---|---|---|---|---|
| `/` | `pages/index.vue` | Welcome/bootstrap/recovery | none | implemented (real start screen + active-order recovery) |
| `/settings` | `pages/settings.vue` | Staff ops screen | PIN-gated in page | implemented (registration, diagnostics, API URL override, fullscreen, update control) |
| `/auth/register` | `pages/auth/register.vue` | Standalone registration | none | implemented (thin wrapper over `Auth/DeviceRegistration.vue`; redundant with `/settings`) |
| `/menu` | `pages/menu.vue` | Menu/cart/refill/service-request | authed device, active session | implemented / fragile (cart + refill mode + service calls + terminal watchers + overlay cleanup) |
| `/order/start` | `pages/order/start.vue` | Guest-count | started session | implemented |
| `/order/packageSelection` | `pages/order/packageSelection.vue` | Package selection | started session + menus | implemented / partial (extra recovery logic that looks redundant given centralized guards) |
| `/order/review` | `pages/order/review.vue` | Final review + submit | active draft/cart | implemented (delegates to `OrderingStep3ReviewSubmit.vue`) |
| `/order/in-session` | `pages/order/in-session.vue` | Live order tracking + refill | active order/session | implemented / fragile (status rendering, timer, refill nav, service requests, terminal transition) |
| `/order/session-ended` | `pages/order/session-ended.vue` | Terminal transition | none, accepts query params | implemented (auto-returns home) |
| `/recovery` | `pages/recovery.vue` | Chunk/SW/build mismatch recovery | system entry | implemented / suspicious (hard nav only) |
| `/sw-reset` | `pages/sw-reset.vue` | Full SW/cache wipe | system entry | implemented / suspicious (emergency path) |
| `error.vue` | `error.vue` | Global Nuxt error surface | n/a | implemented (escalates chunk/load failures into recovery) |

`middleware/boot.global.ts` treats `/`, `/settings`, `/auth/register`, and `/order/session-ended` as public. It redirects hard-refresh or direct entry to most internal routes back to `/`, making `/` the intended state-recovery point. `/recovery` and `/sw-reset` are reached through `window.location.href` from `plugins/error-handler.client.ts`.

Suspicious / duplicated:

1. `pages/menu.vue` and `pages/order/packageSelection.vue` still contain recovery-oriented logic even though `boot.global.ts` already centralizes it.
2. `pages/auth/register.vue` looks secondary now that `pages/settings.vue` embeds `components/Auth/DeviceRegistration.vue`.

### 2.4 Stores / composables / middleware / plugins

| Area | Main files | Real responsibility |
|---|---|---|
| Route/bootstrap | `app.vue`, `middleware/boot.global.ts` | Silent auth checks, public-route handling, wake/resume behavior, guard resets |
| Device identity/auth | `stores/Device.ts` | Registration, login, refresh, table assignment polling, persisted token/table/broadcast config |
| Session lifecycle | `stores/Session.ts` | Active flag, timer, server sync, mutex-protected start/end/reset, local persistence cleanup |
| Order state | `stores/Order.ts` | Draft cart, rounds ledger, initial vs refill mode, submit payload, server status/total, idempotency |
| Menu/package state | `stores/Menu.ts`, `plugins/menu-init.ts` | Loading, cache freshness, opportunistic refresh |
| Realtime | `plugins/echo.client.ts`, `composables/useBroadcasts.ts`, `composables/useRealtimeStatus.ts` | Echo/Reverb config, subscription tracking, status fanout |
| Submit orchestration | `composables/useOrderSubmit.ts`, `composables/useRefillSubmit.ts`, `components/order/OrderingStep3ReviewSubmit.vue`, `composables/useSubmitState.ts` | Final submit UX, online/offline gating, state banners |
| Recovery and update | `plugins/error-handler.client.ts`, `pages/recovery.vue`, `pages/sw-reset.vue`, `composables/useAppUpdate.ts`, `utils/pwaReset.ts` | Stale chunk / build-mismatch / SW recovery; staff-controlled apply |
| Offline plumbing | `plugins/offline-outbox.client.ts`, `public/sw.ts`, `types/offline-order.ts`, `stores/OfflineSync.ts` | Background sync + Dexie/local queue, only partially aligned with live submit |

Overlapping abstractions around submission and offline handling:

1. `useOrderSubmit.ts` — active wrapper used by the review component.
2. `useOrderSubmission.ts` — parallel idempotency wrapper built on `useSubmissionIdempotency.ts`.
3. `useOfflineOrderQueue.ts` — localStorage queue.
4. `plugins/offline-outbox.client.ts` + `public/sw.ts` — Dexie + Workbox queueing.

### 2.5 Workflows

**App boot.** `middleware/boot.global.ts` blocks direct entry → `/`. `app.vue` resolves auth, starts network monitoring, initializes update checks and broadcasts after auth. `pages/index.vue` is the real recovery surface via `composables/useActiveOrderRecovery.ts`. Failure: chunk/runtime failures intercepted by `plugins/error-handler.client.ts` → `/recovery` or `/sw-reset`.

**Device registration.** Operator enters 6-digit security code → `Auth/DeviceRegistration.vue` → `stores/Device.ts -> register()` posts to `/api/devices/register` → persists token/table/broadcast config → starts polling if table assignment is delayed. Tries to attach an IPv4 address from WebRTC or server-detected fallback. Failure paths: partial auth payload without table assignment, stale token + missing table, IP detection failure.

**Session bootstrap.** Welcome screen only allows starting when `deviceStore.isAuthenticated`. `stores/Session.ts -> start()` fetches the latest server session, preloads menus, optionally preserves guest/package selection, marks the client session active, starts local timers. Also writes a lightweight `session_active` flag to `localStorage`. **Risk:** the client can mark itself active even when server session fetch / menu preload had warnings — those failures are logged non-fatal.

**Order flow.** `/` → `/order/start` (guest count) → `/order/packageSelection` → `/menu` (cart) → `/order/review` → `OrderingStep3ReviewSubmit.vue` → `useOrderSubmit.ts` (initial) or `useRefillSubmit.ts` (refill). `buildPayload()` enforces package selected, `guest_count >= 1`, non-empty items, numeric `menu_id`, `quantity >= 1`. The review UI is stricter — it blocks guest counts below 2 (contract mismatch with the store). Menu unavailability triggers forced reload + cart pruning; 409 resumes existing order; 503 `SESSION_NOT_FOUND` yields a POS-session message; offline initial submit is currently hard-blocked.

**Refill / service request.** Refill starts from `pages/order/in-session.vue -> goToRefill()` (toggles refill mode → returns to `/menu`). Refill submission validates `meat`/`side` category items, verifies the live order is still non-terminal via `/api/device-order/by-order-id/{id}`, then posts `/api/order/{orderId}/refill`. `useRefillSubmit.ts` explicitly forbids offline queueing — network loss = hard block. Service requests posted from `pages/order/in-session.vue` to `/api/service/request`. Billing/payment is not a customer flow — terminal completion comes from backend/admin/POS events.

**Realtime.** Echo config resolved from persisted broadcast config, `/api/config`, or runtime config. `app.vue` initializes after auth. `useBroadcasts.ts` owns channel subscriptions and order/session updates; `useRealtimeStatus.ts` is mostly observability. **Risk:** order state can be mutated from both realtime and polling/watcher flows. Terminal transitions are protected by `stores/SessionEnd.ts` / `useSessionEndFlow.ts` ("first caller wins"), but the architecture is still multi-writer.

**Offline / reconnect.** `plugins/error-handler.client.ts` catches chunk/import/SW failures → `/recovery`. `pages/recovery.vue` and `pages/sw-reset.vue` clear caches and unregister SW. `stores/Session.ts` clears persisted order/session/idempotency/offline markers on `end()` and `reset()`. `useActiveOrderRecovery.ts` recovers from persisted active order/session and clears stale state when terminal/inconsistent. **Major mismatch:** `public/sw.ts` queues `POST /api/devices/create-order` with Workbox Background Sync, but the active review UI blocks initial submit when offline. Offline infrastructure exists but the current UX path largely prevents it from being exercised.

## 3. Contracts impacted

| Method + path | Called from | Request | Expected response | Auth | last_verified | Notes / risks |
|---|---|---|---|---|---|---|
| `POST /api/devices/register` | `stores/Device.ts -> register()` | `security_code`, optional `name`, `ip_address`, `ip` | device/token/table/broadcast or partial "registered but waiting" | bootstrap | 2026-05-14 | Store treats some error-shaped responses as partial success when device/token fields are present |
| `POST /api/devices/login` | `stores/Device.ts -> authenticate()` | device identifier / IP auth | device/token/table/broadcast | device bootstrap | 2026-05-14 | Active path; `config/api.ts` still defines stale `/api/device/login` (singular) |
| `POST /api/devices/refresh` | `stores/Device.ts -> refresh()` | existing bearer | refreshed token/device/table/config | bearer | 2026-05-14 | Used for renewal and table-assignment refresh |
| `GET /api/session/latest` | `stores/Session.ts` | none | current session/order/timer snapshot | bearer | 2026-05-14 | Sync remaining time + session/order identity |
| `GET /api/menus` | `stores/Menu.ts`, `plugins/menu-init.ts` | none | menu list | bearer/device-ready | 2026-05-14 | SW caches with `NetworkFirst` |
| `GET /api/menu/packages` | `stores/Menu.ts` | none | package list | bearer/device-ready | 2026-05-14 | Preloaded before order flow |
| `POST /api/devices/create-order` | `stores/Order.ts -> submitOrder()` | `guest_count`, `package_id`, `items[]`, optional `client_submission_id` | `{ success, order { order_id, order_number, ... } }`; 409 may return existing order | bearer | 2026-05-14 | `X-Idempotency-Key` header used; response handling distinguishes `order.order_id` vs `order.id` |
| `GET /api/device-orders` | `stores/Order.ts -> initializeFromSession()` | none | active order list / current | bearer | 2026-05-14 | Active-order recovery when local state exists |
| `GET /api/device-order/by-order-id/{id}` | `stores/Order.ts -> submitRefill()`, polling | none | live order snapshot | bearer | 2026-05-14 | Guard before refill |
| `POST /api/order/{id}/refill` | `stores/Order.ts -> submitRefill()` | `order_id`, `items[]`, optional `client_submission_id` | refill result / updated order | bearer | 2026-05-14 | `X-Idempotency-Key` used; offline path explicitly disabled |
| `POST /api/service/request` | `pages/menu.vue`, `pages/order/in-session.vue` | `order_id`, `table_service_id` | toast-only success assumed | bearer | 2026-05-14 | No rich response handling |
| `GET /api/device/ip` | `pages/settings.vue` | none | `{ ip }` | bearer or same-origin | 2026-05-14 | Diagnostics only |
| `GET /api/config` | `plugins/echo.client.ts` | none | broadcast host/port/scheme | public / weak | 2026-05-14 | Realtime bootstrap fallback |

Stale contract markers:

1. `config/api.ts` still defines unused / wrong endpoints: `DEVICE_LOGIN = "/api/device/login"`, `DEVICE_SESSION`, `DEVICE_STATUS`, `TABLES`, `TABLE_STATUS`, `PAYMENTS`, `PAYMENT_METHODS`.
2. The live code path uses direct literals and store logic more than `config/api.ts`, so the config file overstates the active contract surface.
3. `docs/API_TRACE_REFERENCE.md` already acknowledges some of this drift.

## 4. Issues by severity

### Critical

1. **Offline ordering is internally contradictory.** SW + outbox + offline-order types vs review-component online block + `useOrderSubmit` live-only docs. → Fix: pick one model; remove or unify the other.
2. **Multiple submit abstractions create drift risk.** `useOrderSubmit`, `useOrderSubmission`, `useSubmissionIdempotency`, `useOfflineOrderQueue`. → Fix: keep one production path.
3. **Session start tolerates partial backend failure.** Failed `fetchLatestSession()` or menu preload is logged non-fatal; the client still proceeds to active session. → Fix: explicit failure policy.

### High

4. **Stale API constants in `config/api.ts`.** Especially `/api/device/login` (singular). → Fix: prune to active surface; require imports go through it.
5. **Guest-count rule mismatch.** Review enforces ≥ 2; store validates ≥ 1. → Fix: align both at the store level; UI defers.
6. **Manual persistence vs Pinia persistence.** `stores/Session.ts` writes raw `"session-store"` to `localStorage` during `clearInternal()` and `reset()` while also being Pinia-persisted. → Fix: one writer.
7. **Order hydration can restore stale transactional state.** `stores/Order.ts` persists `rounds`, `draft`, `serverOrderId`, `serverStatus`, `mode` without a hydration-time validity guard against the current session boundary. → Fix: validate against current session before restoring.
8. **Token refresh is not serialized.** `stores/Device.ts -> startRefreshTimer()` can invoke `refresh()` from a repeating interval without an in-flight guard. → Fix: mutex or single-flight.
9. **Settings and registration are duplicated surfaces.** `/auth/register` duplicates the flow embedded in `/settings`. → Fix: pick one operator surface.
10. **Multi-writer terminal-state race.** Watchers, polling, realtime broadcasts, and timer expiry all converge on terminal handling. `SessionEnd` reduces duplicate redirects but multiple writers remain. → Fix: single-writer terminal transition, others observe.

### Medium

11. **Long-lived watchers/listeners are not consistently cleaned up.** `plugins/api.client.ts` token watcher; `composables/useGuestReset.ts` undisposed watch; `composables/useRealtimeStatus.ts` partial dead cleanup around `connectionMonitorInterval`.
12. **Large page-level components concentrate risk.** `pages/menu.vue`, `pages/settings.vue`, `pages/order/in-session.vue` each own too much logic.
13. **Recovery routes are special-case and easy to misunderstand.** `/recovery` and `/sw-reset` depend on hard navigation, not middleware. Brittle if future routing changes assume standard behavior.
14. **Page-level duplicated recovery logic.** `pages/menu.vue` and `pages/order/packageSelection.vue` contain recovery code already centralized at `/`.

### Low

15. Legacy commented type definitions in `types/index.d.ts` ahead of active declarations.
16. Aspirational "production ready" language in docs (some now archived in the 2026-05-14 pass) no longer maps to the active runtime.

## 5. Action items (prioritized)

1. **Resolve the offline-ordering contradiction.** Choose live-only or true offline; rewrite the review-component online block accordingly; remove the abandoned half. *Acceptance:* a single submit path passes both online and (if applicable) offline integration tests. *Rollback:* revert offline plumbing files.
2. **Consolidate submission + idempotency.** Keep `useOrderSubmit.ts` (or a single replacement); delete `useOrderSubmission.ts`, `useSubmissionIdempotency.ts`, `useOfflineOrderQueue.ts` once production references are migrated. *Acceptance:* `tests/order-submit-source-contract.spec.ts` and equivalents pin one path; the others are removed.
3. **Tighten bootstrap failure handling.** Treat `fetchLatestSession()` and critical menu preload failure as hard errors that prevent session start. *Acceptance:* a forced backend failure prevents `/` from transitioning to `/order/start`. *Rollback:* trivial.
4. **Prune `config/api.ts`** to active endpoints only; make stores/composables import from it consistently. *Acceptance:* grep finds no live use of `/api/device/login` (singular). *Rollback:* trivial.
5. **One persistence owner for session/order cleanup.** Remove manual `localStorage` writes from `stores/Session.ts`; let Pinia persistence be the single writer. Add an explicit order-hydration validity check tied to the current session. *Acceptance:* terminating a session clears all surfaces in a single audited path.
6. **Lifecycle hygiene pass.** Fix `useGuestReset.ts`, `useRealtimeStatus.ts`, and `plugins/api.client.ts` watcher disposal. *Acceptance:* no leaked watchers after navigation under HMR.
7. **Single-writer terminal transition.** Designate one trigger for `session-ended`; demote others to observers via `SessionEnd` events. *Acceptance:* simulated concurrent watchers do not produce duplicate redirects.
8. **Collapse registration into `/settings`.** Remove or feature-gate `/auth/register`. *Acceptance:* operator flow is one screen.
9. **Decompose `pages/order/in-session.vue`** into composables for timer, service requests, status stream, refill launcher. *Acceptance:* each composable has its own test surface.
10. **Remove duplicated page-level recovery code** in `menu.vue` and `packageSelection.vue` once centralized `/` recovery covers their cases.

## 6. Verification plan

```bash
bash scripts/pre-merge-check.sh --app tablet-ordering-pwa
```

Wraps:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run generate`

Manual smoke after any submit/idempotency/persistence change:

1. Fresh device boot from `/`; complete an initial order; verify `X-Idempotency-Key` retry replays the same `order.order_id`.
2. While in `/order/in-session`, refill; confirm offline guard rejects refill cleanly.
3. Force a chunk error (e.g. delete a built JS file); confirm `/recovery` is reached and the session resumes cleanly afterwards.
4. Suspend/resume the tablet during an active session; confirm `useActiveOrderRecovery` reaches the same `/order/in-session` view.
5. End the session via terminal-status broadcast; confirm exactly one redirect to `/order/session-ended`.

## 7. Cross-references

- [Ecosystem review](../../docs/WOOSOO_ECOSYSTEM_ENGINEERING_REVIEW_2026-05-14.md) — cross-app context
- [Nexus audit](../../woosoo-nexus/docs/WOOSOO_NEXUS_STABILIZATION_AND_HARDENING_AUDIT_2026-05-14.md) — backend side of these contracts
- [Print Bridge audit](../../woosoo-print-bridge/docs/WOOSOO_PRINT_BRIDGE_PRODUCTION_RELIABILITY_AUDIT_2026-05-14.md) — print bridge specifics
- [Agent quality gate](AGENT_QUALITY_GATE.md) — repo-specific gate
- [API trace reference](API_TRACE_REFERENCE.md) — controller-call trace
- [Offline sync runbook](OFFLINE_SYNC_RUNBOOK.md) — offline operational notes
- [Session end UX runbook](SESSION_END_UX_RUNBOOK.md) — terminal transition runbook
- [Documentation audit 2026-05-14](../../docs/audits/DOCS_AUDIT_2026-05-14.md) — what moved where
