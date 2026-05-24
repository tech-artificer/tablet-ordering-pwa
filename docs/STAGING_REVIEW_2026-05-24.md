# Staging Branch Review — 2026-05-24

Reviewed `origin/staging` (38 commits ahead of main as of this date). This branch (`claude/staging-review-improvements-3rdLm`) already implements the menu-screen redesign, in-session restructure, PLACING ORDER overlay, theme-green removal, refill-only navigation guard, and thank-you-screen redesign — those items are marked Done below. The rest is triage for a future pass.

## Section 1 — Top fixes worth doing soon

A short prioritized list where impact is real. Items 1–4 below are addressed in commits on this branch.

1. **Done** — Touch-only "Coming soon" tooltips on disabled buttons. Replaced with inline subtext on `pages/order/in-session.vue` Request Bill button ("Ask a server to settle — touch billing coming soon") at lines 297–298.

2. **Done** — Cart FAB sat in the tablet thumb zone at `bottom-36 right-5`. Replaced with a wider cart pill anchored `bottom-6 right-6` in `pages/menu.vue` at line 525 (`fixed bottom-6 right-6 z-40`).

3. **Done** — Item "Unavailable" with no reason. Split into two distinct visuals in `components/menu/MenuItemGrid.vue`: a subtle UPGRADE lock (image still visible) for items not in the package at lines 143–149 (opacity 65%), and a heavier UNAVAILABLE overlay with EyeOff icon for runtime-unavailable items at lines 151–155 (opacity 40%, secondary/85 background).

4. **Done** — Confetti blocks the UI for 2s on submit. Addressed in commit 9a5b7d9 ("feat(submit): cancellable PLACING ORDER overlay; drop confetti") — removed confetti import and added a Cancellable PLACING ORDER overlay in `components/order/OrderSubmittingOverlay.vue`.

5. **Order status names lack a legend** — `pages/order/in-session.vue` tracks status from order broadcasts (Pending/Confirmed/Preparing/Ready at line 20, and terminal states at line 89). These mean different things to staff and guests (e.g., "Preparing" to guests = "cooking started"; to staff = "food in progress at line X of grill"). Either add a one-line subtitle under each state in the UI or a small "?" affordance opening a glossary modal. **Open.**

6. **`canvas-confetti` dep still in `package.json`** — the only call site was removed in this branch. The package is listed at line 30 but never imported in the codebase (only mocked in tests at `tests/order-submit-handoff.spec.ts`). Prune from dependencies. **Open.**

---

## Section 2 — UI / UX polish (worth a sweep, not urgent)

- **PIN modal accessibility.** `aria-labelledby` targets `pin-modal-title` which is set to a 1-word "Settings" header (`pages/index.vue:37`). Screen readers announce only "Settings" without context; consider "Settings PIN Entry" or move longer text to `aria-describedby`. The modal itself has good structure (role="dialog", aria-modal="true"), but the label is too terse for users who don't see the UI.

- **PIN input appears editable but is readonly.** Input at `pages/index.vue:49` is `readonly` but styled with `bg-white/5` and white text, making it look interactive. Users may tap it expecting to edit. Adding `inputmode="none"` plus a caption like "Tap number pad below" clarifies it's display-only.

- **Cart drawer width crowds menu on small screens.** The cart is not explicitly width-constrained in current code, but if it's using a modal drawer component, ensure it doesn't exceed 50vw on tablets under 900px wide. Check `pages/menu.vue` for any `el-drawer` width binding.

- **Quantity badge and add button are small touch targets.** Badge at `components/menu/MenuItemGrid.vue:89` is `w-8 h-8` (32px diameter), below the 48px recommended threshold. Bump to `w-10 h-10` for greasy fingers in high-paced restaurants. The ADD button at line 203 is also tight on spacing; its `py-1.5 px-3.5` is ~36px tall.

- **Refill banner and service modal don't trap focus.** `components/menu/RefillModeBanner.vue` and the service dialog in `pages/order/in-session.vue` (line 316, `<ElDialog>`) lack focus trap. A screen-reader user opening either will focus still outside, losing context. Wrap modals with a focus-trap directive or manually manage `tabindex`.

- **Settings IP detection hangs indefinitely.** `pages/settings.vue:81` sets `localIpAddress.value = "Loading..."` but lines 179–203 have no timeout. If the server doesn't respond to the IP query, the setting sticks at "Loading..." forever, leaving staff confused about whether discovery is running. Add a 5s timeout and fallback message.

- **Welcome screen conflates unregistered and expired-token cases.** `pages/index.vue` shows "Set up in Settings" for both no-token and stale-token scenarios, but the staff remediation differs (initial setup vs. reauthenticate). A brief subtitle like "No auth yet" vs. "Auth expired — ask your manager" would reduce support overhead.

- **Menu card tap zones overlap at density.** Quantity badge (top-right corner) and ADD button (bottom-right) sit close together on smaller items. Tapping near the corner can hit the badge instead of the button. Consider expanding button padding or moving the badge into the button itself.

---

## Section 3 — Code quality (what's worth touching)

- **`stores/Device.ts` has loose types on auth state.** `lastAuthResponse: any | null` at line 23 accepts any shape, making it impossible to reliably extract device ID or branch ID downstream. The auth payload from the API is stable (JWT with device_id, branch_id, table_id, etc.). Create a `DeviceAuthResponse` interface in `types/index.d.ts` and use it here so IDE autocomplete and refactoring work correctly. Current code uses this response at device initialization but the type haziness invites bugs.

- **`stores/Order.ts` `extractFirstListItem` walks four possible response shapes.** Lines 178–193 try `responseData?.data?.data`, `responseData?.data`, `responseData?.orders`, and raw `responseData` in sequence. This pattern hides API contract evolution. Initial-order responses (POST `/devices/create-order`) use one shape; refill responses (POST `/refills`) use another. Replace the generic fallback with explicit shape extraction per endpoint, documented at each call site. This makes version mismatches obvious at code-review time.

- **`public/sw.ts` 3s navigation timeout is a magic literal.** Line 62: `setTimeout(() => controller.abort(), 3000)` has no explanation or constant. Make it `const NAV_TIMEOUT_MS = 3000` near the top of the file (alongside the module docstring). Better yet, read from `runtimeConfig` so ops can tune the timeout without rebuilding for different LAN configurations (slow/fast wifi).

- **`composables/useBroadcasts.ts` uses unnamed constants.** While well-structured overall (e.g., `RECONNECTION_BACKOFF` array at line 160), the file mixes named and unnamed delays. Line 190 has `window.setTimeout(...)` with implicit timing. Pull any long-delay thresholds (especially those affecting user-facing waits like "stale state timeout" or "session idle threshold") into named constants at the top.

- **`stores/Order.ts` swallows `refreshError` in the refill flow.** Lines 541–542 catch and log at `warn` level when menu refresh fails after a 422 error (item unavailable). But if a token expired right before the refill, this hides the real cause (auth failure) behind "Failed to refresh menus". Check if the error is a 401/403 (auth expired) and log that separately at `error` level with context for ops (e.g., "User may be logged out — manual re-auth required"). This would surface auth issues faster than a generic menu-refresh message.

- **`(window as any).Echo` casts throughout the codebase.** Broadcast setup in `composables/useBroadcasts.ts` and device store initialization cast `(window as any).Echo` and `(window as any).initEcho` without type safety. Create a `types/window.d.ts` with:
  ```typescript
  declare global {
    interface Window {
      Echo?: any
      initEcho?: (config: any) => void
    }
  }
  export {}
  ```
  This allows proper IDE support and prevents accidental typos.

---

## Section 4 — Workflow & process

- **README references Pusher, code uses Reverb.** `README.md` lists `NUXT_PUBLIC_PUSHER_KEY` / `NUXT_PUBLIC_PUSHER_CLUSTER` at lines 29, but `.env.example` (line 30) and the code (`composables/useBroadcasts.ts`, nuxt.config.ts) use Reverb. New developers will misconfigure setup. Update README to match Reverb config.

- **Lint budget unenforced in CI.** `.lint-budget.json` caps warnings at 66, but `.github/workflows/ci.yml` line 34 runs `npm run lint` without `--max-warnings`. If a contributor adds 5 warnings, CI passes silently. One-line fix: change to `npm run lint -- --max-warnings 66`.

- **Pre-commit only runs lint-staged, no typecheck or test.** `.husky/pre-commit` (line 1) runs `npx lint-staged` only. Recent commits like `ab401e1` ("resolve ESLint errors blocking CI") show developers can push breaks that only fail later in GitHub. Add `npm run typecheck` (and optionally `npm test`) to catch issues locally first.

- **No error reporting in production.** Kiosk tablet failures (service worker errors, broadcast disconnection, submission failures) are silent on-device. Sentry, Highlight, or GlitchTip (5-min setup) would catch crashes and help ops debug. Consider budgeting a half-day to wire one up.

- **No CHANGELOG and stuck at version 1.0.0.** `package.json` version is hardcoded at `1.0.0` (line 3). With 466 commits on `main`, it's impossible to know what shipped in a given deployment. Start a `CHANGELOG.md` and tag releases (e.g., `v1.1.0` on each merge to main).

- **Page filename convention drift.** `pages/order/packageSelection.vue` (camelCase) vs `pages/order/in-session.vue` (kebab). Kebab-case matches the ecosystem convention (Vue Router, Nuxt docs). Either rename `packageSelection.vue` to `package-selection.vue` or document the exception.

- **TAB-CASE IDs have no registry.** Commits reference TAB-CASE-002, 004, 005, 006 but there's no index. Create `docs/cases/` with one `.md` per case (e.g., `TAB-CASE-002.md` listing the issue, reproduction steps, and resolution). Makes handoffs recoverable.

- **No e2e in CI.** `playwright` is in devDeps but no `.github/workflows/` step runs it. Even one happy-path test (login → order → confirm) would catch most regressions the unit tests miss. Budget 2–3 hours to write a minimal spec and add a CI step.

- **UpdateBanner revert is undocumented.** Commit `4be9d88` reverted the global banner because update UX is now route-controlled (Settings + Welcome only, not a floating bar on every page). Worth a paragraph in a `docs/PWA_UPDATES.md` explaining the decision and how to trigger updates.

---

## Section 5 — What's already good (don't-touch list)

Strong architectural decisions are in place and worth keeping:

- **Pinia store mutex, in-flight fetch cancellation, broadcast reconnect backoff** (`composables/useBroadcasts.ts:160` exponential with 30s cap / 10 attempts). Watchers and timers cleaned up on component unmount. Persisted state ownership is clear (Device, Order, Session stores).

- **Service worker strategy.** NetworkOnly for order POSTs (no offline queue by design; silent retries = duplicate orders in outages). 3s nav timeout with offline-shell fallback. Sensible cache TTLs for menus (NetworkFirst) and images (CacheFirst). Decision rationale is documented in `public/sw.ts:8–15`.

- **Nginx config.** Recent fixes to `build-info.json` 404 bypass and duplicate block handling (commit `4be9d88`) are correct and necessary for PWA updates to work.

- **Test discipline.** Contract specs like `tests/order-submit-source-contract.spec.ts` and the new `tests/in-session-summary-contract.spec.ts` enforce architectural decisions. `_shouldBlock` ESLint fix on `stores/Connection.ts` is structural, not a band-aid. `MenuUnavailableError` in `stores/Order.ts:553` is correctly used. Deleted submission composables (`useOfflineOrderQueue`, `useOrderSubmission`, `useSubmissionIdempotency`) are cleanly removed with test enforcement.

---

## Section 6 — Suggested next steps

1. **Fix #5 (status legend) and #6 (prune canvas-confetti).** 30 min. Status legend: add a small glossary badge or inline help for order states. Confetti: `npm uninstall canvas-confetti`, remove mock from tests.

2. **CI/lint-budget/typecheck-on-pre-commit.** 1 hour. Add `--max-warnings 66` to `.github/workflows/ci.yml` line 34. Add `npm run typecheck &&` to `.husky/pre-commit` before lint-staged.

3. **README Reverb fix.** 15 min. Update lines 29–30 to reference Reverb env vars and link to `.env.example` for current canonical values.

4. **Pick a Sentry-equivalent and wire it.** Half a day. Evaluate Sentry (industry standard, generous free tier), Highlight (privacy-friendly, local-first), or GlitchTip (self-hosted). Integrate error boundary in `app.vue`, wire `window.onerror` and service worker errors, test with a failing order submission.

5. **Everything else: backlog.** UX polish (Section 2) and code quality improvements (Section 3) are good to have; schedule after the above stabilization work.

---

## Closing note

Items 1–4 in Section 1 plus the green-removal, menu-screen redesign, in-session restructure, and thank-you-screen redesign were implemented on this branch (`claude/staging-review-improvements-3rdLm`). See commit history for specifics: green theme at `d923a68`, menu redesign at `f3cc4b1`, in-session restructure at `b7da067`, thank-you redesign at `9e615e2`, and confetti removal at `9a5b7d9`. When merging to staging, bump the version in `package.json` and open a PR to main; code quality is solid.
