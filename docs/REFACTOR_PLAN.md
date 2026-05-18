# Order Ledger Refactor — Execution Plan

**Branch:** `refactor/order-ledger`
**Spec (source of truth):** `docs/DATA_MODEL.md` — read this first.
**Status:** 3 commits landed (foundation + bug fix + middleware collapse). Remaining work is below.

---

## Context for executing agents

The transactional flow stores order data in `stores/Order.ts`. The legacy design had three overlapping fields (`cartItems`, `submittedItems`, `history`) synchronized via copy-and-clear writes during submit; this caused two production bugs:

1. **Refill submit overwrote `submittedItems`**, so initial-order items disappeared after the first refill.
2. **Validator wiped `submittedItems` on rehydrate** when `currentOrder` was transiently absent (race during submit→navigate).

The fix is a new append-only ledger: `rounds: OrderRound[]`. Each successful POST to the server appends one round. `rounds[]` is the canonical source for "what has the customer ordered". It is never cleared mid-session.

**Already done in the 3 commits (do not redo):**

- `docs/DATA_MODEL.md` — full spec (read it)
- `stores/Order.ts` — `OrderRound` type, new state fields (`rounds`, `draft`, `mode`, `serverOrderId`, `serverStatus`, `serverTotal`), `appendRound()` helper, dual-writes in `setOrderCreated` and `submitRefill` success paths, validator no longer wipes `submittedItems`, `submitRefill` APPENDS to `submittedItems`
- `pages/order/in-session.vue` — `displaySubmittedItems` reads `rounds[]` first with legacy fallbacks
- `middleware/boot.global.ts` — single global guard; deleted `auth.global.ts`, `order-lock.global.ts`, `order-guard.ts`, `menu-check.ts`
- `pages/order/review.vue` and `pages/order/in-session.vue` — `middleware: ["order-guard"]` stripped from `definePageMeta`
- `assets/css/main.css`, `layouts/kiosk.vue`, `nuxt.config.ts` — page transitions cross-fade (no `out-in`)
- `pages/menu.vue` — drawer waits for `@closed` event before `router.push`
- `composables/useSubmissionIdempotency.ts` — explicit `readonly`/`ref` import
- `types/index.d.ts` — `OrderPayload.client_submission_id?` and new `RefillPayload` type

---

## Pending work — ordered by safety/value ratio

Execute in this order. Each task is self-contained and runnable; verify after each before moving to the next.

---

### TASK A — Strip recovery duplication in `/menu` and `/order/packageSelection`

**Goal:** Welcome (`/`) is the only place that runs `recoverActiveOrderState()`. Other pages must trust the state they receive.

**Why:** With `boot.global.ts` enforcing welcome-as-only-entry-point, recovery on intermediate pages is dead code that adds latency and a redirect bounce.

**Files:**

1. `pages/menu.vue` — locate the `onMounted` block that calls `shouldAttemptActiveOrderRecovery()` / `recoverActiveOrderState("menu")`. Remove that entire block. Keep the rest of `onMounted` (resize listener, etc.).

2. `pages/order/packageSelection.vue:33-47` — remove the `if (shouldAttemptActiveOrderRecovery()) { ... }` block. The `console.log("[📦 Package Selection] Page loaded …")` line stays.

3. `composables/useActiveOrderRecovery.ts` — leave as-is. Welcome (`pages/index.vue`) is the only remaining caller.

**Verification:**

```bash
# Should return only pages/index.vue (welcome) as caller
grep -rn "recoverActiveOrderState\|shouldAttemptActiveOrderRecovery" pages/ composables/ --include="*.vue" --include="*.ts"
```

```bash
npx nuxi typecheck
# Pre-existing test errors (tests/error-handler.spec.ts, tests/pwa-recovery.spec.ts)
# are acceptable. New errors are not.
```

**Manual smoke:**

- Welcome → Begin → Guest count → Package → Menu: should be smooth, no recovery-related console logs from `/menu` page.
- Refresh on `/menu`: should bounce to `/` (boot.global.ts), and welcome should resume the active order back to `/menu` correctly.

**Commit message:** `refactor: remove duplicate active-order recovery from /menu and /order/packageSelection`

**Risk:** Low. Welcome already runs the recovery. Pages are no longer reachable via direct URL after the middleware collapse.

---

### TASK B — Trim `stores/Menu.ts`

**Goal:** Remove dead fields and methods that duplicate `package.modifiers` and contract-deprecated catalogs.

**Files:** `stores/Menu.ts`

**Remove these state fields:**

```ts
packageDetails: {} as Record<number, PackageDetails>
modifiers: [] as Modifier[]
alacartes: [] as MenuItem[]            // verify usage first; see check below
meatCategories: [] as MeatCategory[]   // verify usage first
tabletCategories: [] as TabletCategory[] // verify usage first
```

**Remove these getters:**

```ts
isLoadingModifiers
isLoadingPackageDetails
isLoadingAlacartes  // if alacartes removed
```

**Remove these actions:**

```ts
fetchPackageDetails(packageId, meatCategory?)
fetchModifiers()
invalidatePackageCache()  // if no other callers
```

**Remove from the `loading` object:**

```ts
modifiers, packageDetails, alacartes, meatCategories, tabletCategories
```

**Remove from the `errors` object:** same keys.

**Remove from `clearAllErrors`, `$reset`, persist `pick`:** same keys.

**Verification before removal — confirm zero usage outside `Menu.ts`:**

```bash
grep -rn "packageDetails\|fetchPackageDetails\|isLoadingPackageDetails" --include="*.vue" --include="*.ts" | grep -v "Menu.ts"
grep -rn "menuStore.modifiers\|fetchModifiers" --include="*.vue" --include="*.ts" | grep -v "Menu.ts"
grep -rn "menuStore.alacartes\|menuStore.meatCategories\|menuStore.tabletCategories" --include="*.vue" --include="*.ts" | grep -v "Menu.ts"
```

If any consumer hits — STOP and report. Don't delete the field.

**Update `pages/menu.vue` `meats` computed if needed:**

The current code prefers `menuStore.packageDetails[packageId].allowed_menus.meat[]` first, falls back to `pkg.modifiers`. After removal, the fallback to `pkg.modifiers` is the only source. Per `docs/DATA_MODEL.md`: meats === `package.modifiers`. This is intentional.

**Verification:**

```bash
npx nuxi typecheck
npm run test -- tests/menustore  # if menu-store specs exist; check tests/ directory
```

**Manual smoke:** package selection still loads; meats appear in `/menu`.

**Commit message:** `refactor(menu-store): drop packageDetails, modifiers, alacartes, meatCategories, tabletCategories — package.modifiers is the single source of truth for meats`

**Risk:** Medium. Hidden consumer may exist. The grep checks are mandatory before deletion.

---

### TASK C — Test rewrites against the new contract

**Goal:** Make CI green again. Several specs assert the legacy `Order.ts` shape (`cartItems`, `submittedItems`, `history`, `hasPlacedOrder`) and the deleted middleware files.

**Files to audit/rewrite:**

```
tests/package-flow-stability.spec.ts
tests/active-order-recovery-skip.spec.ts
tests/order-submit-offline.spec.ts
tests/order-auth-replay.spec.ts
tests/contracts/order-submission.contract.spec.ts
tests/in-session-ordered-items.spec.ts
tests/in-session-status-end.spec.ts
tests/order-restrictions.spec.ts
tests/cartsidebar.ui.spec.ts
tests/order-submit-handoff.spec.ts
tests/order-submit-source-contract.spec.ts
tests/refill-submit-offline.spec.ts
tests/ordering-step3-review-submit.spec.ts
tests/store-contracts.spec.ts
tests/e2e.transaction.spec.ts
tests/order.submit.spec.ts
tests/order.polling.spec.ts
tests/session.start.spec.ts
tests/session-ended-guard.spec.ts
tests/session-end.spec.ts
tests/useGuestReset.spec.ts
```

**Approach for each spec:**

1. Run it. If it passes, leave it alone.
2. If it asserts deleted middleware files (`order-guard.ts`, `auth.global.ts`, `order-lock.global.ts`, `menu-check.ts`):
   - **Delete** that section of the test. The middleware no longer exists; its responsibility is now in `boot.global.ts` and welcome-page logic.
   - Add a new section asserting `middleware/boot.global.ts` content (PUBLIC_ROUTES, the `to.path === from.path` redirect rule).
3. If it asserts `cartItems`/`refillItems`/`submittedItems`/`history`/`hasPlacedOrder`/`isRefillMode`/`currentOrder` shape:
   - **Don't delete** these assertions if they still pass. Legacy fields are still written for backward compatibility; this is intentional.
   - **Add** parallel assertions on `rounds[]`, `draft`, `mode`, `serverOrderId`, `serverStatus`, `serverTotal` per `docs/DATA_MODEL.md`.
4. If a spec specifically tests the bugs we fixed (refill overwrites submittedItems, validator wipes submittedItems): rewrite it to assert the new behavior:
   - After 1st submit: `rounds.length === 1`, `rounds[0].kind === "initial"`, `rounds[0].items.length === N`, `submittedItems.length === N`.
   - After 2nd submit (refill): `rounds.length === 2`, `rounds[1].kind === "refill"`, `rounds[1].number === 2`, `submittedItems.length === N + M` (cumulative, NOT overwritten).
   - On rehydrate with `hasPlacedOrder=true` and `currentOrder=null`: `submittedItems` is preserved (validator only flips `hasPlacedOrder` to false).

**Pre-existing test errors NOT in scope:**

- `tests/error-handler.spec.ts:204` — `'abc123' vs 'def456'` no-overlap
- `tests/pwa-recovery.spec.ts:100` — same

These are pre-existing TS comparison issues unrelated to this refactor. Leave them alone unless explicitly asked.

**Verification:**

```bash
npm test
# Goal: all specs pass except the two pre-existing comparison warnings.
```

**Commit message:** `test: align suite with rounds[] ledger and boot.global.ts contracts`

**Risk:** Medium. Test rewrites are tedious; bugs in test logic can hide regressions. Run each spec individually after rewriting.

---

### TASK D — Add a `rounds[]` regression spec

**Goal:** Lock in the bug fix with a dedicated spec.

**File:** create `tests/order-rounds-ledger.spec.ts`

**Test cases (minimum):**

1. After successful initial submit: `orderStore.rounds.length === 1`, `rounds[0].kind === "initial"`, `rounds[0].number === 1`, `rounds[0].items` matches the cart at submit time.
2. After successful refill submit: `orderStore.rounds.length === 2`, `rounds[1].kind === "refill"`, `rounds[1].number === 2`, `rounds[0]` (initial) is unchanged.
3. After 5 successful refills: `rounds.length === 6`, every round has correct `kind`, `number`, `items`, `serverTotal`.
4. After validator runs on rehydrate with stale `hasPlacedOrder=true` and missing `currentOrder`: `rounds` is unchanged, `submittedItems` is unchanged, `hasPlacedOrder` flips to `false`.
5. `appendRound()` is idempotent in the sense that pushing N rounds yields N entries — no dedupe, no overwrites.
6. `mode` flips from `"initial"` to `"refill"` after the first successful submit and stays `"refill"` thereafter.

**Verification:**

```bash
npm test -- tests/order-rounds-ledger.spec.ts
```

**Commit message:** `test: add rounds[] ledger regression spec for refill data persistence`

**Risk:** None — additive tests.

---

### TASK E — (Optional / large) Big-bang back-compat removal

**Goal:** Make `Order.ts` match the spec exactly — single source of truth, no legacy fields.

**Pre-conditions:**

- TASK A done
- TASK B done
- TASK C done with all tests green
- TASK D added and green
- Real-tablet validation done by product owner (5+ refills across at least 3 devices)

**Scope:**

Per `docs/DATA_MODEL.md` "Migration plan / commit 3":

1. Delete state fields from `stores/Order.ts`: `cartItems`, `refillItems`, `submittedItems`, `history`, `hasPlacedOrder`, `isRefillMode`, `currentOrder`, `pollingOrderId`, `isPolling`, `pollInflight`.
2. Delete getters/computeds: `activeCart`, `refillTotal` (re-derive against `rounds`), `getCartItemQuantity` (against `draft`), `hasServerBackedOrder`, `validateAndRepair` (no longer needed), `hasConfirmedInitialOrder` (replace with `rounds.length > 0`).
3. Delete typed accessors: `setCartItems`, `setRefillItems`, `setSubmittedItems`, `setHistory`, `setCurrentOrder`, `setHasPlacedOrder`, `setIsRefillMode`, `clearCart`, `clearRefillItems`, `clearSubmittedItems`, `clearHistory`, `clearCurrentOrder`, `getCartItems`, `getRefillItems`, `getSubmittedItems`, `getHistory`, `getCurrentOrder`, `getCurrentOrderStatus`, `clearOrder`, `resetTransactionalState` (replace with `reset()`), `completeOrder`, `patchOrderItems`.
4. Delete polling: `startPolling`, `stopPolling`, `startOrderPolling`, `stopOrderPolling`, `isPolling`, `pollInflight`, `pollingOrderId`, `pollIntervalId`, `pollStartTime`, `maxPollingRuntimeMs`. **NOTE:** confirm with product owner that polling is acceptable to remove. Per session memory, recurring polling was already removed; the one-shot fetch in `initializeFromSession` should be preserved (move it into welcome's recovery composable).
5. Update persist `pick` to: `["package", "guestCount", "rounds", "draft", "serverOrderId", "serverStatus", "serverTotal", "mode"]`.
6. Update cart mutators (`addToCart`, `updateQuantity`, `remove`, `clearRefillCart`) to mutate `state.draft`.
7. Update `toggleRefillMode` to set `state.mode = enabled ? "refill" : "initial"` (note: per spec, mode auto-flips to "refill" after first submit; manual toggle off is only valid before first submit).
8. Update `buildPayload` and `buildRefillPayload` to consume `state.draft` instead of `state.cartItems`/`state.refillItems`.
9. Update `setOrderCreated` to drop the legacy `state.submittedItems = ...`, `state.cartItems = []`, `state.history = ...` writes. `appendRound("initial", ...)` is the only mutation needed.
10. Update `submitRefill` success path to drop the legacy `state.submittedItems = [...]`, `state.refillItems = []`, `state.history = ...` writes.
11. Update all 43 consumer files (run `grep -rn "orderStore\." --include="*.vue" --include="*.ts"` for the list) to read from new fields:
    - `cartItems`/`activeCart` → `draft`
    - `refillItems` → `draft` (when `mode === "refill"`)
    - `submittedItems` → flatten `rounds[].items` or read `rounds[rounds.length - 1].items` for "last round"
    - `history` → `rounds`
    - `hasPlacedOrder` → `rounds.length > 0`
    - `isRefillMode` → `mode === "refill"`
    - `currentOrder.status` → `serverStatus`
    - `currentOrder.total_amount` → `serverTotal`
    - `currentOrder.order_id` → `serverOrderId`
    - `currentOrder.items` → `rounds[rounds.length - 1].items` (last round) or all-rounds aggregate

12. Update `composables/useOrderSubmit.ts` and `composables/useRefillSubmit.ts` to drop dual-writes; only `appendRound` runs.
13. Rewrite all tests touching the legacy contract (TASK C should already cover this — re-verify).

**Verification:**

```bash
grep -rn "cartItems\|refillItems\|submittedItems\b\|hasPlacedOrder\|isRefillMode\|\.currentOrder" --include="*.vue" --include="*.ts" stores/ pages/ components/ composables/
# Expected output: only references inside stores/Order.ts (the new state itself? no — they should be GONE)
# After this task, the grep should return ZERO results outside docs/, README, and historical tests.
```

```bash
npx nuxi typecheck
npm test
```

**Manual smoke:** full transaction flow, multiple refills, refresh tests, deep-link tests.

**Commit message:** `refactor(order-store): remove legacy fields — rounds[] / draft / server-mirror is single source of truth`

**Risk:** High. 600+ lines changed across 43 files. Do not start until A/B/C/D are landed and validated. Recommend doing on a child branch off `refactor/order-ledger` and merging back only after a manual e2e pass on a real tablet.

---

## Acceptance criteria for the whole refactor

- [ ] `npx nuxi typecheck` — only the two pre-existing unrelated test errors
- [ ] `npm test` — green (or only pre-existing unrelated failures)
- [ ] Manual: welcome → guest → package → menu → submit → in-session → 5 refills → all rounds visible chronologically with correct labels
- [ ] Manual: refresh on `/order/in-session` mid-session → all rounds still visible, no data loss
- [ ] Manual: type `/menu` in URL bar → bounces to `/`, then `/` recovers state and forwards back to `/menu` with `draft` intact (or to in-session if order is live)
- [ ] Manual: `/settings` and `/auth/register` direct URL still work
- [ ] No console errors in normal flow
- [ ] Build: `npm run build` passes
- [ ] `git log refactor/order-ledger --oneline` reads as a clean linear history

---

## Out of scope (do NOT do unless explicitly asked)

- Server-side changes to `/api/device/orders/*` endpoints
- WebSocket / broadcast handler refactor (`composables/useBroadcasts.ts`, `composables/useRealtimeStatus.ts`) — keep contracts unchanged
- UI redesign of `/order/in-session` beyond rendering `rounds[]` chronologically (a polished collapsible/expandable round view is a follow-up)
- Removing the one-shot session-state fetch in `initializeFromSession` — preserve until welcome's recovery composable absorbs it (TASK E covers this)
- Changing the page transition CSS or drawer-close-wait logic — these were fixed and validated separately
- Touching `app.vue`, `composables/useBroadcasts.ts`, `pages/order/in-session.vue` (the pre-existing parts), `stores/Device.ts`, `stores/Menu.ts` (other than TASK B), `stores/Session.ts` working-tree changes — these were carried over from `staging` and are owned by other work

---

## File-by-file index of pending touches

| File | TASK |
|---|---|
| `pages/menu.vue` (recovery block in `onMounted`) | A |
| `pages/order/packageSelection.vue:33-47` | A |
| `stores/Menu.ts` | B |
| `tests/*.spec.ts` (~21 files; audit each) | C |
| `tests/order-rounds-ledger.spec.ts` (new) | D |
| `stores/Order.ts` | E |
| `composables/useOrderSubmit.ts` | E |
| `composables/useRefillSubmit.ts` | E |
| `pages/menu.vue` (cart reads) | E |
| `pages/order/review.vue` | E |
| `pages/order/in-session.vue` (drop fallback chain) | E |
| `components/order/CartSidebar.vue` | E |
| `components/order/CartDrawer.vue` | E |
| `components/order/OrderingStep3ReviewSubmit.vue` | E |
| `components/order/OrderPlacedBadge.vue` | E |
| `components/GuestCounter.vue` | E |
| `components/ui/UiHeader.vue` | E |
| `composables/useActiveOrderRecovery.ts` | E |
| `composables/useBroadcasts.ts` (only the order-state mutations) | E (carefully) |
| `composables/useGuestReset.ts` | E |
| `composables/useRealtimeStatus.ts` | E |
| `composables/useSessionEndFlow.ts` | E |
| `pages/order/start.vue` | E |
| `plugins/kiosk-guard.client.ts` | E |
| `stores/Session.ts` (any `orderStore.X` calls) | E |
| `stores/OfflineSync.ts` | E (or delete if dead per session memory) |

---

## Reviewer's note

This plan was authored after the foundation commits (`1f8cf86`, `d779e4c`, `09cd86a`) landed. The user-visible bugs ("data disappears", "blank screen on transition", "URL-bar bypass", "transition feels slow") are already fixed by those three commits. TASKs A through E are cleanup and contract-tightening — value is engineering hygiene, not customer-facing.

If time pressure forces cuts, the priority order is: **A (low risk, immediate value) → D (regression lock) → C (CI green) → B (cleanup) → E (last)**.
