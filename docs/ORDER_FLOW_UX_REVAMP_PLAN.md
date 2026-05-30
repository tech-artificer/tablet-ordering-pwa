# Order Flow UX Revamp — Implementation Plan

> Status: **Proposal — pending approval. No application code changed by this document.**
> Scope: guest-facing order transaction cycle (entry → menu → cart → submit → refill → session end).
> Model context: **package-buffet with unlimited refills**, not à-la-carte. Every decision below is filtered through that model.

---

## 1. Background

A reference tablet-ordering app ("Sushi Station"-style) was used as a UX benchmark. Several of its
patterns are à-la-carte concepts that would actively confuse a buffet guest, so this plan **adopts the
good parts and explicitly rejects the traps**. It is paired with a full reference audit of the codebase so
that cleanup work does not create *new* dead code.

### Locked decisions (from review discussion)
- **Order History is a dedicated surface, not the cart drawer.** The drawer = "what you're about to send"
  (editable cart). History = "what you've already sent" (read-only, round-grouped).
- **History entry point = the existing order / "Live" badge in the header becomes tappable** (tap over
  scroll). Contextual: only present once an order exists.
- **Category-tab counters show the in-cart item count for that category, numerator only.** Never
  `x / total` — a denominator reads as a buffet cap and discourages ordering.
- **There IS a real limit, but it is per-item, not per-category:** max **5** of any one meat/side, enforced
  on the per-round draft (clears after each submit). It is a kitchen-batching rule — "max 5 per order,
  refill for more" — *not* a session cap. It is already enforced in code but **silently**; the work is to
  make it legible, not to add it.

---

## 2. Workstreams

### A. Benchmark-driven features

| # | Feature | Detail | Key files |
|---|---------|--------|-----------|
| A1 | **Order History overlay** | Full-screen, round-grouped, timestamped ledger built from `rounds[]` (`submittedAt`, `items`, `serverTotal`). Read-only. The post-order read-only "Your Order" block currently inside the drawer moves *here*. | new `components/order/OrderHistoryOverlay.vue`; data from `stores/Order.ts`; `CartSidebar.vue:181–246` (block to relocate) |
| A2 | **Tappable order badge → History** | The header order/"Live" badge opens A1. Only shown when an order exists. | `components/menu/MenuHeader.vue` |
| A3 | **Category-tab in-cart counters** | Small badge per tab = count of cart items in that category, shown only when `> 0`. **No denominator.** | `components/menu/MenuCategoryTabs.vue` |
| A4 | **SupportFab (fix latent bug)** | `<support-fab>` is rendered at `menu.vue:544` but **the component does not exist** — there is currently no working Call-Staff/Bill button. Build it; wire to the existing `handleSupportRequest` (`menu.vue:294`, POSTs `/api/service/request`). | new `components/order/SupportFab.vue` |

### B. Make the existing per-item cap legible

| # | Change | Detail | Key files |
|---|--------|--------|-----------|
| B1 | **`x/5` affordance on meat/side steppers** | When approaching the cap show `3/5`; at the cap the `+`/ADD goes disabled **with a reason**, not silently. On a blocked tap, one-line note: *"Max 5 per order — add more on your next refill."* Per-item only; never a category total. | `components/menu/MenuItemGrid.vue:35`; `components/order/CartSidebar.vue:313`; cap constant `stores/Order.ts:34` (`UNLIMITED_ITEM_CAP = 5`) |

### C. UI/UX + performance modifications

Tagged ⚡ performance / 👆 ergonomics. All anchored to real lines.

| # | Tag | Change | Where |
|---|-----|--------|-------|
| C1 | ⚡👆 | **Gate `hover:` styles behind `@media (hover: hover)`.** On a touch kiosk hover states "stick" after a tap and cause repaints. Keep only `active:` feedback. | `MenuItemGrid.vue:77,112,200,221–228`; cart pill; cards app-wide |
| C2 | ⚡ | **Precompute per-item state into one `decoratedItems` computed.** Today `isAvailable` (~5×), `isAddDisabled` (~3×), `getItemQuantity` (~3×, each a cart scan) run **per card per render**. | `MenuItemGrid.vue:32–49,76–84,88–91,194–202` |
| C3 | 👆 | **Touch targets ≥ 44px.** ADD button ~28–30px (`py-1.5`), steppers `w-9 h-9` = 36px. Bump steppers to `w-11 h-11`, pad ADD. | `MenuItemGrid.vue:197`; `CartSidebar.vue:294,309` |
| C4 | ⚡ | **Standardize on `NuxtImg`.** Review screen uses a raw `<img>` (no webp/lazy/sizes) while the grid correctly uses `NuxtImg`. | `OrderingStep3ReviewSubmit.vue:304` |
| C5 | ⚡ | **Reduce `backdrop-blur` on animated surfaces.** `backdrop-filter` is expensive on low-end tablet GPUs and sits on the sliding drawer footer. | `CartSidebar.vue:341`; overlays |
| C6 | 👆 | **Collapse the now-4 refill-mode signals to 1.** In-drawer "Refill Order" banner + page `RefillModeBanner` + dead `OrderPlacedBadge` + header badge. Keep header badge only. | `CartSidebar.vue:158–170`; `menu.vue:422`; `MenuHeader.vue` |
| C7 | 👆 | **Widen/bottom-sheet the drawer on small tablets.** `min(460px, 33.333vw)` = 256px on 768px portrait, too cramped for steppers. | `menu.vue:492` |

### D. Flow simplification (tiered)

> **Correction logged during audit:** both initial and refill orders route through `/order/review`
> (`menu.vue:333` → `OrderingStep3ReviewSubmit`, which imports both submit composables). They are
> **symmetric**, not asymmetric as first thought. The in-drawer countdown widget
> (`CartSidebar.vue:405–433`) is **dead UI** — `menu.vue` never passes `:is-counting-down`.

**Tier 1 — pure cleanup, no flow change (no UX risk)**
- Delete confirmed-dead components/composables (see §3 ✅ list).
- Collapse refill signals to one (C6).
- Build + wire SupportFab (A4); fix session-ended double-timer and add a manual "Return Home".

**Tier 2 — merge the separate review page into one in-drawer confirm (the big win)**
- The drawer already *is* the review. "Place Order" expands the drawer into a confirm state and submits
  in place — keeping a real "confirm before kitchen" beat, losing the full-page navigation.
- Initial order drops from **5 screens to 3**; presentation reuses the review screen's nicer layout.
- **This is a re-host, not a delete** — see §3 🔁.

**Tier 3 — retire `/order/in-session`, make the menu the persistent post-order hub (fast-follow)**
- Post-order, stay on the menu; History overlay (A1) + SupportFab (A4) already cover in-session's unique
  jobs. Eliminates the menu↔in-session ping-pong on every refill.
- **Relocate `endSession` + service-request out first** — see §3 🔁.

### Deliberately preserved (do not over-simplify)
- Package-selection screen (load-bearing: defines menu, pricing, tax; and a genuine centerpiece).
- A confirm beat before the kitchen (moved into the drawer, not removed).
- The session-end thank-you card (kept; just made skippable).

---

## 3. Reference integrity — "no new dead code" gating

Every deletion/refactor below is backed by a grep audit of the current tree. **Audit scope must include `plugins/`, `middleware/`, and `layouts/`** — not just `pages/components/composables/stores` — since route navigation (e.g. the kiosk back-gesture guard) lives there too.

### ✅ Safe to delete outright — 0 real external refs, no orphaned deps
- `components/order/OrderSummaryDrawer.vue`
- `components/common/SessionCompletionOverlay.vue`
- `components/order/OrderPlacedBadge.vue` — **0 refs; actually dead** (corrected during audit)
- `composables/useTimedSubmission.ts` — 0 callers; deps are pure Vue primitives
- `components/order/CartDrawer.vue`

> ⚠️ **Name-collision watch-out:** deleting `CartDrawer.vue` must **not** touch `cartDrawerOpen` (ref) or
> the `.cart-drawer` CSS class in `menu.vue:248,495,620` — those belong to the **live** `el-drawer`.

### 🔁 Move-don't-delete — engines that survive their host
Retiring a host UI must not orphan the logic it hosts:
- **Review page (Tier 2):**
  - `useOrderSubmit` — only real caller is the review component → **re-host into the drawer confirm.**
  - `useRefillSubmit` — only caller is the review component → **re-host.**
  - `useSubmitState` — shared with `SubmitStatusBanner` and both engines → keep.
  - `SubmitStatusBanner` — imported only by the review component (`:281`) → **re-mount in the new confirm or it dies.**
- **`/order/in-session` (Tier 3):**
  - `endSession()` (`in-session.vue:205`) and `callForService()` / service modal (`:252–266`) → **relocate to SupportFab/menu.**
  - Note `menu.vue:294` **already** POSTs `/api/service/request` → consolidate the in-session duplicate into one.

### 🔗 Stale-reference cleanups when routes are removed
- `/order/review` is also referenced by `components/common/SessionTracker.vue:15` (a progress step `path`) — update or it becomes a dead nav target.
- `/order/in-session` is referenced by `menu.vue:415` (`@back-to-session`), `review.vue:50` (post-submit redirect), `plugins/kiosk-guard.client.ts:25` (`router.replace("/order/in-session")` on back/forward gestures **while an order is live**), and a `"in-session"` literal in `stores/SessionEnd.ts:5` — repoint/remove all four. The kiosk guard is the critical one: if it is missed, live-order back gestures would navigate to a deleted route.

### 🟢 Survivors confirmed multi-consumer (no orphan risk)
- Order store (23 consumer files), Session (15), SessionEnd (2)
- `useSessionEndFlow` (5 callers — in-session is only one), `useBroadcasts`, `usePollingFallback`

---

## 4. Sequencing & PR breakdown

1. **PR 1 — Features + cap + UI/UX polish + Tier 1 cleanup** *(coherent, low-to-medium risk)*
   - A1–A4, B1, C1–C7, Tier 1 deletes.
2. **PR 2 — Tier 2** (review → in-drawer confirm; re-host engines; patch SessionTracker; drop the route).
3. **PR 3 — Tier 3** (retire in-session; relocate endSession + service request; repoint nav).

---

## 5. Definition of done (applies to every PR)

- [ ] Each deleted symbol/route: a final `grep` sweep returns **zero** live hits.
- [ ] Each touched composable: still consumed, or intentionally removed — **none left importable-but-unused.**
- [ ] Name-collision strings (`cartDrawerOpen`, `.cart-drawer`) intact after `CartDrawer.vue` removal.
- [ ] Touch targets in changed components ≥ 44px.
- [ ] Category counters render numerator-only; per-item cap shows `x/5` + reason, never a category total.
- [ ] Existing test suites pass; add coverage for the relocated submit/service logic in Tiers 2–3.
- [ ] No new dead code: the reference audit in §3 re-run clean.

---

*This document is the single artifact to approve before code changes begin.*
