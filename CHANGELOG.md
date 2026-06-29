# Changelog

All notable changes to this repo are documented here.
Format: Keep a Changelog; commits follow Conventional Commits.

### Bug Fixes

- Show real LAN IP from WebRTC instead of WSL2 gateway (tab-case-013)
- Exclude playwright tests from vitest glob (tab-case-011 oversight)
- Normalize diagnostic error display, remove APP_DEBUG instruction (tab-case-012)
- Align active-order recovery filter with Nexus five-status scope
- Sync orderStore.serverOrderId on order.created (P1)
- Feed silent-death watchdog from transport activity
- Add WS silent-death watchdog to useBroadcasts (TAB-CASE-009)
- Harden npm ci against WiFi drops on Pi (INFRA-CASE-003)
- Restore image assets still referenced from source
- Share refresh in-flight promise; correct macOS IP command
- Address PR #172 review findings (impact-bearing fixes)
- Suppress errorMessage after boot-time refresh failure; fix TS errors in tests
- Remove redundant token guard, add refresh in-flight lock, use $patch in tests
- Correct NUXT_PUBLIC_API_BASE_URL to use dev machine IP, not nexus host
- Scope boot-time token expiry check to startup only
- Validate device token expiry at boot (non-blocking)
- Correct payload types, collapse device channel, guarantee session end on terminal status
- Wake lock reacquire after tab hide + polling for orders during escalated phase
- Resolve TypeScript errors caught by CI type check
- Duplicate-call guard returns cancelled instead of empty success
- Resolve 5 critical submit/idempotency correctness issues
- Capture router at setup; invert progress bar direction
- Clarify in-session timer copy
- Fixed The IP auth fallback
- Verify order terminal status before ending session
- Trim header, drop tab icons, force 4-col grid
- QA pass on customer-flow overhaul + add staging review report
- Unref grandTotal/refillTotal in cart pill for type safety
- Revert UpdateBanner from app.vue; fix watcher leak; fix nginx 404 bypass
- Wire UpdateBanner into app.vue; fix isContinueOnly offline guard
- Drop useless ok reassignment from authenticate fallback
- Complete Raleway/Kanit font compliance on package selection
- Stop refresh loop when table assigned; add authenticate fallback
- Move actions to header, shrink image, tighten details layout
- Harmonize card text, fix badge overlap, add 2-step header
- Logo PNG, grid bg, flame fade transition, gear icon, compact layout
- Refresh table assignment on broadcast
- Initialize broadcasts after auth
- Use canonical desserts category slug
- Subscribe order channel reactively; fix session timer
- Dead-code cleanup + header dedup + clearer disabled labels
- Broken-image fallback + modal padding clip (1340x800 tablet)
- Cap bootstrap auth at 10s so splash never hangs on downed server
- Modal featured pane scrollable, white text on badges and button
- Package selection — View-only button label, white modal text
- Remove duplicate /build-info.json location block in tablet nginx config
- Order-safe PWA auto-update + network-first SW navigation
- TAB-CASE-005 package card UI delta + TAB-CASE-006 meat filter wiring
- Package card UI delta, inspector contrast, meat filter wiring
- TAB-CASE-002 — reduce any types, audit cross-store coupling, harden error paths, add fetch cancellation
- Fix 4 — no silent bootstrap failure; surface errors as settings redirect
- Fix 3 — single persistence owner, remove manual localStorage writes
- Prerender /build-info.json and add Nginx no-store block
- Fix 2 — remove dead submission composables, centralise idempotency key
- Resolve offline ordering contradiction — enforce live-only contract
- Auto-update installed PWA on deploy without breaking orders
- Correct Connection.ts ESLint fix using _shouldBlock pattern
- Resolve ESLint errors blocking CI
- Phase 0+1 — dead code removal, bundle fix, UX/error hardening
- TASK C Priority 2 — rewrite in-session tests to exercise rounds[] primary path
- Update allOrderedItems to read from rounds[] ledger
- Order data persists across refills + in-session shows all rounds
- Update lockfile for uuid dependency
- Add safety check for confetti to prevent black screen
- Add error handling for order submission and navigation
- Handle 419 CSRF errors and fix navigation to review page
- Unwrap selectedPackageId ref in submit-order handler
- Package flow stability — fetch-only packages, preserve packageId through review route
- Add .agents to gitignore and fix navigator.onLine cleanup in tests
- Package ID contract - send krypton_menu_id for order payload; fix session end fullscreen preservation
- Removed new line
- Dead meta flag, correct directory, double space formating, target reference directory
- Make order items list scrollable on review page
- Align stale tests with current PWA contracts
- Scope tablet pwa cache resets
- Disable external font CDN providers to fix agent firewall blocks
- Fail closed on offline order and refill submit
- Address Vue component and test issues from code review
- Startup hang, router consistency, quote-agnostic sw test
- Persist and reuse refill idempotency key across retries
- Finalize order transaction flow and tests
- Permanent solution for submit state lock and offline refill
- Startup hang, router consistency, quote-agnostic sw test
- Remove double route remounts
- Remove /api suffix from baseURL to prevent double /api in endpoints
- Enable overflow-y-auto on review page to allow scrolling
- Resolve all 12 pre-existing test failures
- Add pwa update validation script
- Correct billing total source and isUnlimited field in in-session.vue
- Add missing Nuxt imports in echo.client.ts
- Clean duplicate PWA update implementations, fix all lint warnings, update CI triggers
- Ensure runtime-config script executes before app boot
- Load runtime-config.js before Nuxt app boot
- Phase 0-C — session handoff, polling race, category normalization, router fallback, PIN security
- Disable HTTP caching for sw.js
- Review screen navigation and state debugging
- Session lifecycle hardening — router fallback, broadcast ownership, runtime test guard
- Harden session-end lifecycle and broadcast ownership
- Harden nuxt dev server env for Windows CI
- Resolve TS errors in OrderingStep3ReviewSubmit — unref activeCart and submittedItems
- Cart blockers, recovery guard, session-start deferral, refill-review lock
- Re-resolve package from fresh menu data after loadAllMenus; add transactional-reset coverage test
- Preserve guest selection on package start
- Align engines.node to >=20.18.0 for lint-staged v16 compatibility
- Stabilize order/session/echo contracts and align tests
- Session residue reset + Place Order no-op
- Block refill on terminal orders and reset submit state
- Tighten RC-3 stale-session imminent-expiry guard
- Override serialize-javascript to 7.0.5 (GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v)
- Handle cancelled order status and lock guest count in cart
- Stabilize menu/session recovery and status handling
- Resolve auto-submit, auth lockout, session contamination, and blank screen crashes
- CSP blocking API calls, double /api/ URL, wrong wsPort, IP detection
- Import unref from vue in DeviceRegistration.vue
- Non-root Docker user, unref table refs, dedup WS subscriptions, IP auth UI
- Restore device registration auth flow
- Remove NODE_ENV=production from builder stage
- Document tablet PWA Docker API and Reverb env
- Align tablet PWA Docker runtime with Nuxt node server
- Use reloadCategory() instead of broken dynamic dispatch in error retry button
- Use .value for errorMessage Ref assignments in DeviceRegistration
- Resolve TS/lint errors in DeviceRegistration, settings, and security-code test
- Remove trailing comma in api.client.ts watch call (comma-dangle error)
- Resolve all staging lint warnings and errors
- Resolve merge conflicts and restore flame.gif on welcome screen
- Apply CodeRabbit auto-fixes
- Align tablet auth and socket config
- Explicit useNuxtApp import, remove static preset, update .env.example
- Skip dev-server test on non-Windows CI runners
- Set NITRO_PRESET=node-server in CI and harden Dockerfile
- Regenerate package-lock.json to fix npm ci lockfile mismatch
- Guest counter increment button
- Rebuild pwa runtime changes
- Sync pwa lockfile for ci
- Replace hardcoded production IP/port fallbacks with localhost defaults
- Merge duplicate nitro blocks and remove invalid serverMiddleware
- Remove duplicate return and normalize lockfile state
- Restore device channel casing and polling endpoint paths
- Welcome screen shows Offline due to WebSocket check, not network status
- Remove dead replayMissedEvents broadcast replay code; npm audit fix
- Resolve TypeScript errors in in-session page and add Nuxt auto-import globals
- Remove duplicate test page text classes
- Reconcile auth and order state merge
- Add staging branch to CI workflow trigger
- Fixes
- Fixes
- Resolve build errors - dotenv loading and duplicate class attributes
- Order refill fix payload
- Remove direct session_active write; standardize window.localStorage usage
- Safe window.localStorage checks; await session.end() in test
- Ensure session end clears client order/session state
- Fixed printer issue
- Fixed device auth
- Fixed realtime notifications
- Fixed table name

### Chores

- Remove dead config/components and centralise session endpoint
- Remove duplicate, dead, and bloat files (cleanup pass 1)
- Remove .agents directory
- Ignore skills-lock.json (AI agent runtime file)
- Sync remaining staging changes
- Apply pending tablet pwa changes
- Bump fast-uri from 3.1.0 to 3.1.2
- Bump @babel/plugin-transform-modules-systemjs
- Commit pending tablet updates
- Add husky + lint-staged pre-commit tooling
- Adjust Dockerfile and settings interface
- Apply review fixes — remove vestigial code field, drop name param, swap console.log
- Sync main back into staging after merge
- Regenerate package-lock.json from clean npm install
- Regenerate package-lock.json to sync with package.json
- Enforce blocking lint typecheck tests and strict output verification
- Sync lockfile and remove deprecated esbuild rebuild flag
- Bump axios from ^1.5.0 to ^1.15.0 and update lockfile
- Add service worker and PWA icon assets
- Sync app state with deployment-manager audit
- Fix cache paths and working dir
- Remove PR template gate
- Run workflows on push only
- Add CI workflow and enhance gitignore
- Require node >=18 and rebuild esbuild on postinstall
- Add Copilot agent guidelines and enforcement
- Add Copilot agent guidelines and enforcement
- Session and order store stability + preserve fullscreen; replace reloads with SPA navigation; tests and types fixes

### Documentation

- Retire package-selection doc set + stale archive duplicates
- Relocate Copilot onboarding to docs/AI_ONBOARDING.md (Claude-only)
- Claude-only entrypoint framing
- Include kiosk-guard in in-session route cleanup (Codex review)
- Add order-flow UX revamp implementation plan
- Retitle browse-menus API reference, remove AI meta-commentary, clarify QUICK_REFERENCE scope and IPs
- Add cross-platform dev command
- Align package selection documentation
- Executable refactor plan for downstream agents (TASKs A-E)
- Add tablet PWA review handover protocol
- Add PWA offline and testability review
- Add tablet API and event contract review
- Add tablet PWA workflow review
- Add tablet PWA architecture review
- Add tablet PWA technical review case file
- Clarify cross-repo mirror hard-stop reference
- Add tablet update deployment contract
- Add authoritative responsive spec and deprecate split-layout guide
- Quick Issue Reference
- Update README for tablet-ordering-pwa
- Standardize JSON fields, add error examples and printer responses; deprecate singular printer route

### Features

- Update PackageCard + packageSelection inspector for v2 API allowed_menus shape
- Update to v2 API shape — allowed_menus, base_price, is_most_popular
- Canonical order_id sync + order.details.updated handler
- Echo infinite reconnect + post-order menu cache refresh
- Production stability fixes — polling fallback, Zod validation, wake lock, debug snapshot
- Restaurant-appropriate copy for thank-you screen
- Restructure to header + Order Summary sidebar
- Cancellable PLACING ORDER overlay; drop confetti
- Redesign thank-you card with gold progress bar
- Cart pill, compact + ADD, upgrade vs unavailable states
- Replace green semantics with warm-gold for palette harmony
- Redesign welcome screen with new logo, dark theme, and table badge
- Add Reverb connection status indicator to session banner
- Package card inspector flow + tests
- Package selection UI redesign + blue text fix
- Implement kiosk stale-shell auto-update with ?debug=pwa gate
- Production-stability hardening (2026-05-14 audit)
- Admin-controlled PWA update system - kiosk-safe architecture
- P0 black screen recovery system
- Add error recovery and build version utilities
- Full-width menu grid with right-side cart drawer + floating FAB
- Add explicit submit state machine and status banner
- Implement offline queueing for refill orders
- Add build fingerprint and debug panel
- Add build fingerprint visibility in settings and docker args
- Expand session-end trigger + review screen audit
- Wire visible pwa update banner and safe sw update flow
- Add Dockerfile for tablet PWA (SPA/Nitro Node server)
- Improve security code handling in settings flow
- CT-01/CT-06 alias sunset — remove code alias from register()
- Proactive token refresh timer + GET retry on transient network errors
- Add Dockerfile for containerized deployment
- Harden token bootstrap and service-worker startup
- Mission-9 - Fix deferred bugs (BUG-7, BUG-9, BUG-13)
- Offline sync, session-end flow, kiosk guard, and test suite
- Add GuestCounter component, layout and page refinements
- Offline queue, idle detection, legacy stubs, component auto-import fix

### Other

- Merge remote-tracking branch 'origin/dev' into reconcile/spec-align-2026-06
- Merge pull request #210 from tech-artificer/staging

Staging
- Merge pull request #208 from tech-artificer/dev

Dev
- Merge pull request #209 from tech-artificer/agent/tab-case-packages-api-v2

refactor(packages): remove as-any casts + orphaned CSS (code-simplifi…
- Merge pull request #207 from tech-artificer/agent/tab-case-packages-api-v2

feat(packages): update PWA to v2 packages API (allowed_menus shape)
- @
fix: address PR #210 follow-up review (terminal statuses, IP accessor)

- stores/Order.ts: export a single TERMINAL_ORDER_STATUSES constant and use it
  in submitRefill, initializeFromSession, and useActiveOrderRecovery. submitRefill
  previously omitted "archived" from its terminal set, so an archived order could
  slip past the refill terminal guard — now consistent with the rest.
- pages/settings.vue: use the normalized displayDevice accessor for the
  fetchDeviceByIp fallback. deviceStore.device may be a plain object after
  rehydration, so device?.value?.last_ip_address could silently drop the fallback.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
@
- @
fix: address PR #210 review nits (viewport, IP lookup order, dep range)

- playwright.config.ts: re-apply 1280x800 viewport after the Desktop Chrome
  device spread, which otherwise overrides it with its own 1280x720 preset.
- settings.vue: prefer the WebRTC-detected LAN IP over the backend-stored
  last_ip_address (WSL gateway in dev) for fetchDeviceByIp, guarded by
  isValidIpv4 so the backend value still serves as a real fallback.
- package.json: align playwright devDependency floor to ^1.59.1 to match
  @playwright/test (already resolved to 1.59.1 in the lockfile).

Skipped CodeRabbit suggestion to rename auth mock paths to singular
/api/device/{login,refresh}: stores/Device.ts calls the plural
/api/devices/{login,refresh}, so the existing mock is correct (e2e passes).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
@
- Merge pull request #206 from tech-artificer/dev

Dev
- Merge pull request #205 from tech-artificer/claude/refine-local-plan-a7w26b

Claude/refine local plan a7w26b
- Merge pull request #190 from tech-artificer/staging

Staging
- Merge pull request #203 from tech-artificer/dev

Dev
- Merge pull request #202 from tech-artificer/agent/tab-case-012-settings-diagnostic-hardening

fix(settings): normalize diagnostic error display, remove APP_DEBUG instruction (tab-case-012)
- Merge pull request #201 from tech-artificer/agent/tab-case-011-recovery-followup

test(tablet): TAB-CASE-011 recovery integration tests
- Merge pull request #200 from tech-artificer/dev

Dev
- Merge pull request #199 from tech-artificer/agent/tab-case-011-active-order-recovery-filter

fix(tablet): active-order recovery includes in_progress and served
- Updated README.md
- Merge pull request #197 from tech-artificer/dev

promote: dev → staging (TAB-CASE-010 + TAB-CASE-009)
- Merge pull request #196 from tech-artificer/agent/tab-case-010-canonical-order-id-and-detail-sync

feat(tab-010): canonical order_id sync + order.details.updated handler
- Merge pull request #195 from tech-artificer/dev

Dev
- Merge pull request #194 from tech-artificer/claude/funny-pasteur-rd0Se

fix(broadcasts): feed silent-death watchdog from transport activity
- Merge pull request #192 from tech-artificer/dev

Dev
- Merge agent/tab-case-009-broadcast-silent-death-detector: WS zombie watchdog (APPROVED)
- Merge agent/infra-case-003-pi-docker-build-npm-ci-wifi: harden npm ci for Pi WiFi (APPROVED)
- Merge pull request #193 from tech-artificer/chore/tablet/claude-only-agents-consistency

updated project context
- Updated project context
- Merge pull request #191 from tech-artificer/chore/tablet/claude-only-agents-consistency

docs(agents): Claude-only entrypoint framing
- Merge pull request #189 from tech-artificer/dev

Dev
- Merge pull request #188 from tech-artificer/claude/trusting-thompson-d2h5n

docs: order-flow UX revamp implementation plan
- Merge pull request #185 from tech-artificer/claude/trusting-hawking-2f2q5

chore: remove duplicate, dead, and bloat files (cleanup pass 1)
- Merge pull request #172 from tech-artificer/staging

Staging
- Merge pull request #182 from tech-artificer/dev

Dev
- Merge pull request #181 from tech-artificer/claude/relaxed-darwin-WmkwD

dev/fixed-staging-comments
- Merge pull request #178 from tech-artificer/dev

Dev
- Merge pull request #180 from tech-artificer/claude/stoic-brahmagupta-t3a46

fix: suppress errorMessage after boot-time refresh failure; fix TS er…
- Merge pull request #179 from tech-artificer/claude/stoic-brahmagupta-t3a46

Prevent duplicate token refresh requests in flight
- Merge pull request #176 from tech-artificer/claude/magical-wozniak-hC89p

docs: fix browse-menus API reference framing and clean up QUICK_REFERENCE IPs
- Merge pull request #177 from tech-artificer/fix/echo-reconnect-and-menu-refresh

fix(P1): validate device token expiry at boot (non-blocking)
- Dev → staging for Pi deployment
- Merge pull request #175 from tech-artificer/fix/echo-reconnect-and-menu-refresh

feat: Echo infinite reconnect + post-order menu cache refresh
- Merge pull request #174 from tech-artificer/claude/upbeat-wozniak-VXs2C

feat: production stability fixes — polling fallback, Zod validation, wake lock, debug snapshot
- Merge pull request #171 from tech-artificer/fix/submit-idempotency-and-state-correctness

fix: resolve 5 critical submit/idempotency correctness issues
- Merge pull request #169 from tech-artificer/dev

fix(menu): trim header, drop tab icons, force 4-col grid The MenuHeader was rendering the full package `description` text (e.g. "A step up for the adventurous — all five classic pork samgyupsal cuts plus premium beef..."), pushing the header tall and creating visual noise next to the table name. The category tabs also carried lucide icons (Beef/UtensilsCrossed/CakeSlice/ Wine) that competed with the text labels for attention.
- Add abort passthrough in stores/Order.ts, hide cancel button during refill mode in pages/order/review.vue
- Merge pull request #167 from tech-artificer/claude/staging-review-improvements-3rdLm

Claude/staging review improvements 3rd lm
- Merge branch 'feat/welcome-screen-redesign' into claude/staging-review-improvements-3rdLm
- Merge pull request #168 from tech-artificer/menu-changes

Menu changes
- Menu screen menuheader and menu item grid updates
- Merge remote-tracking branch 'origin/staging' into claude/staging-review-improvements-3rdLm
- Merge pull request #159 from tech-artificer/staging

Staging
- ClearTimeout called in both the success path
- Merge pull request #164 from tech-artificer/fix/tablet/pwa-auto-update

fix(tablet): order-safe PWA auto-update + network-first SW navigation
- Merge remote-tracking branch 'origin/staging' into agent/tab-case-002-validated-review-followups
- Merge pull request #160 from tech-artificer/agent/tab-case-002-validated-review-followups

fix(tablet): TAB-CASE-002 — reduce any types, audit cross-store coupl…
- Merge pull request #158 from tech-artificer/agent/tab-case-004-build-info-prerender

Agent/tab case 004 build info prerender
- Merge pull request #149 from tech-artificer/staging

Staging
- Potential fix for pull request finding 'Unused variable, import, function or class'

Co-authored-by: Copilot Autofix powered by AI <223894421+github-code-quality[bot]@users.noreply.github.com>
- Potential fix for pull request finding 'Unused variable, import, function or class'

Co-authored-by: Copilot Autofix powered by AI <223894421+github-code-quality[bot]@users.noreply.github.com>
- Merge pull request #156 from tech-artificer/docs/tablet-package-ui-documentation-cleanup

docs(tablet): align package selection documentation
- Merge pull request #155 from tech-artificer/feature/ui-enhancements

UI Enhancements
- UI Enhancements
- Merge pull request #152 from tech-artificer/refactor/order-ledger

Refactor/order ledger
- Updates
- TASK C Priority 1 — Fix 12 failing tests by rewriting middleware assertions to boot.global.ts

- order-lock-refill-carveout.spec.ts: Rewrote 4 tests to assert boot.global.ts PUBLIC_ROUTES
  and redirect logic instead of deleted order-lock.global.ts file
- package-flow-stability.spec.ts: Removed 6 tests asserting deleted middleware; rewrote to
  test boot.global.ts consolidation and actual packageSelection.vue behavior
- app-update-wiring.spec.ts: Fixed test to check for useAppUpdate usage in app.vue
  (UpdateBanner no longer exists in template)
- order-submit-handoff.spec.ts: Updated error message assertion to match current
  review.vue error handling ('Order sent, but navigation failed' vs 'Your order was sent')
- useAppUpdate.spec.ts: Removed tests relying on deprecated isUpdateApplyBlocked parameter;
  rewrote to test actual current behavior (canApplyUpdate reflects needRefresh state)

All 12 formerly-failing tests now pass. Full test suite: 297 passed, 0 failures.

Per TASK C Priority 1 spec: Deleted sections asserting auth.global.ts, order-lock.global.ts,
order-guard.ts, menu-check.ts. Added replacement assertions on boot.global.ts PUBLIC_ROUTES
and redirect rule.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
- Revert "fix(TASK C Priority 2): Update allOrderedItems to read from rounds[] ledger"

This reverts commit 90f54e8cb352873c7d6ab73506cc922ab4b3d190.
- Spec doc + transition cross-fade + drawer-close-wait + runtime type fixes + Order ledger types
- Realtime UI synchronization hardening
- Merge branch 'perf/ws5-pwa-bundle' into staging
- Add bundle analysis tool to PWA
- Merge branch 'feature/ws4-submission-idempotency' into staging
- Implement PWA client submission idempotency
- Merge pull request #151 from tech-artificer/copilot/harden-pwa-update-cache-purge

Harden tablet PWA reset flow for shared-origin deployments
- Changes before error encountered

Agent-Logs-Url: https://github.com/tech-artificer/tablet-ordering-pwa/sessions/50991f71-698e-4ba9-bf54-a49b22c807dc
- Merge remote-tracking branch 'origin/staging' into copilot/harden-pwa-update-cache-purge

# Conflicts:
#	pages/sw-reset.vue

Co-authored-by: ryanpastorizadev-bit <262295171+ryanpastorizadev-bit@users.noreply.github.com>
- Merge remote-tracking branch 'origin/main' into staging
resolve diverged branch
- Handle menu item unavailable flow
- Merge pull request #148 from tech-artificer/feat/refill-offline-queue

refactor: auto-reset submit state on component lifecycle
- Merge staging and resolve sw-reset conflicts

Agent-Logs-Url: https://github.com/tech-artificer/tablet-ordering-pwa/sessions/35ddc437-90ca-451c-816b-3694dd778606
- Initial plan
- Merge pull request #146 from tech-artificer/staging

fix(build): disable external font CDN providers to fix agent firewall…
- Merge pull request #136 from tech-artificer/dependabot/npm_and_yarn/fast-uri-3.1.2

chore(deps-dev): bump fast-uri from 3.1.0 to 3.1.2
- Merge pull request #145 from tech-artificer/dependabot/npm_and_yarn/babel/plugin-transform-modules-systemjs-7.29.4

chore(deps-dev): bump @babel/plugin-transform-modules-systemjs from 7.29.0 to 7.29.4
- Merge pull request #124 from tech-artificer/staging

Staging
- Merge pull request #144 from tech-artificer/refactor/menu-cleanup-drawer

fix: startup hang, router consistency, quote-agnostic sw test
- Merge branch 'staging' of https://github.com/tech-artificer/tablet-ordering-pwa into staging
- Merge pull request #143 from tech-artificer/feat/refill-offline-queue

fix: permanent solution for submit state lock and offline refill
- Merge pull request #142 from tech-artificer/feat/refill-offline-queue

Feat/refill offline queue
- Merge pull request #141 from tech-artificer/refactor/menu-cleanup-drawer

refactor(menu): cleanup legacy components and convert cart sidebar to…
- Merge pull request #125 from tech-artificer/docs/technical-review

Docs/technical review
- Potential fix for pull request finding 'Useless assignment to local variable'

Co-authored-by: Copilot Autofix powered by AI <223894421+github-code-quality[bot]@users.noreply.github.com>
- Merge pull request #135 from tech-artificer/copilot/add-build-fingerprint-debug-visibility

Add build fingerprint/runtime visibility in Settings and wire Docker build metadata
- Merge pull request #134 from tech-artificer/copilot/document-tablet-update-contract

Add deployment contract for deterministic tablet updates
- Initial plan
- Merge pull request #133 from tech-artificer/copilot/fix-pwa-update-banner

Wire visible PWA update banner with safe, gated service worker activation
- Merge branch 'staging' into copilot/fix-pwa-update-banner
- Merge pull request #132 from tech-artificer/copilot/fix-runtime-config-loading

Load runtime overrides before Nuxt boot via `runtime-config.js`
- Merge pull request #131 from tech-artificer/fix/pwa-update-runtime-config

Fix/pwa update runtime config
- Merge branch 'staging' into fix/pwa-update-runtime-config
- Updates
- Add PWA update wiring contract test
- Add runtime config script contract test
- Wire PWA update banner into app shell
- Load runtime config before app boot
- Add safe PWA update watcher
- Add visible PWA update banner
- Initial plan
- Merge pull request #123 from tech-artificer/staging

Staging
- Merge pull request #122 from tech-artificer/fix/guest-count-menu-sync-2026-05-03

fix(session): preserve guest selection on package start
- Merge pull request #121 from tech-artificer/staging

Staging
- Merge pull request #118 from tech-artificer/staging

chore: sync main back into staging after merge
- Merge pull request #120 from tech-artificer/copilot/fix-root-ca-endpoint-issue

Fix public CA endpoint test to use a repo-tracked nginx config
- Merge pull request #119 from tech-artificer/feat/device-registration-security-code-ui-2026-04-25

feat(device-registration): improve security code handling in settings…
- Update tests/unit/stores/Device.store.security-code.test.ts

Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>
- Update components/Auth/DeviceRegistration.vue

Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>
- Update stores/Device.ts

Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>
- Merge staging into main
- Lock cart guest count on menu screen
- Simplify tablet setup code registration
- Removed flame on other pages except welcome, disabled back button on menu sceen
- Merge pull request #113 from tech-artificer/staging

Staging
- Removed back button from menu screen.
- Merge branch 'staging' of https://github.com/tech-artificer/tablet-ordering-pwa into staging
- Merge pull request #116 from tech-artificer/fix/lockfile-sync

fix: regenerate package-lock.json to fix CI npm ci failure
- Merge pull request #115 from tech-artificer/claude/deployment-readiness-docs-3oFSa

feat: add Dockerfile for containerized deployment
- Merge pull request #109 from tech-artificer/staging

Staging
- Merge pull request #82 from tech-artificer/dev

UI: enhanced package selection page
- Merge pull request #114 from tech-artificer/dev

Merge pull request #69 from tech-artificer/copilot/update-package-loc…
- Merge pull request #69 from tech-artificer/copilot/update-package-lock-file

chore(ci): sync package-lock.json with package.json and merge dev
- Merge pull request #112 from tech-artificer/copilot/update-package-lock-file

Copilot/update package lock file
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Kiosk pwa overhaul — composables, stores, middleware, tests 2026-04-24
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Potential fix for pull request finding

Co-authored-by: Copilot Autofix powered by AI <175728472+Copilot@users.noreply.github.com>
- Merge pull request #108 from tech-artificer/dev
- Merge pull request #107 from tech-artificer/copilot/fix-bump-prs

chore(deps): consolidate all dependabot bump PRs into staging
- Merge remote-tracking branch 'origin/staging' into copilot/fix-bump-prs
Co-authored-by: ryanpastorizadev-bit <262295171+ryanpastorizadev-bit@users.noreply.github.com>
- Merge pull request #100 from tech-artificer/dev

Dev
- Merge remote dev + add dotenv for build env loading

Merged 21 upstream commits from origin/dev including:
- Offline order queue implementation
- Session end flow UX
- Guest counter components
- Order restrictions logic
- CI/CD workflows

CONFLICT RESOLUTION:
- nuxt.config.ts: Kept dotenv import + accepted upstream comments
- package.json/lock: Accepted upstream, re-added dotenv dev dependency

LOCAL ADDITIONS PRESERVED:
✓ dotenv/config import in nuxt.config.ts (fixes MAIN_API_URL not found error)
✓ SessionEndCard.vue duplicate class attribute fixes
✓ dotenv package as dev dependency

BUILD STATUS: ✓ Validated (48.2 MB, 19 MB gzip)
- Merge branch 'origin/staging' into dev - resolve all merge conflicts

Co-authored-by: ryanpastorizadev-bit <262295171+ryanpastorizadev-bit@users.noreply.github.com>
- Add complete transaction and development workflow documentation to WORKFLOW.md
- Place order, next order session, order refill
- Add PWA CI workflow and update dev config
- Updates
- Updates
- Updated docs
- Enhanced package selection page
- Update tablet-ordering-pwa nuxt.config.ts head links (favicon + apple-touch-icon)
- Updates
- Updates
- Phase 2: Frontend stores merge - add session timer + timeout cleanup

MERGED:
Session.ts:
- Added timer state (sessionStartedAt, sessionEndsAt, remainingMs, timerExpired)
- Added timer functions (startTimer, ensureTimer, stopTimerInterval, updateRemaining)
- Integrated startTimer() call in start() function
- Integrated stopTimerInterval() in clear() and reset()
- Updated persist config to save timer state

useBroadcasts.ts:
- Added orderCompletionTimeoutId and reloadTimeoutId tracking
- Updated both setTimeout() calls to track IDs
- Enhanced cleanup() to clear both timeout IDs
- Added onUnmounted() hook for proper cleanup

Store imports already PascalCase (Session, Device, Menu, Order)
- Improved transitions
- Merge pull request #66 from tech-artificer/copilot/fix-ui-inconsistencies

Fix undefined Tailwind colors and inconsistent store import casing
- Fix UI inconsistencies: Add missing Tailwind colors and fix store import casing

Co-authored-by: ryanpastoriza <6611842+ryanpastoriza@users.noreply.github.com>
- Initial plan for fixing UI inconsistencies

Co-authored-by: ryanpastoriza <6611842+ryanpastoriza@users.noreply.github.com>
- Initial plan
- Merge pull request #67 from tech-artificer/staging

minor cleanup and UI enhancement
- Minor cleanup and UI enhancement
- Merge pull request #63 from tech-artificer/staging

Staging
- UI updates
- Merge pull request #62 from tech-artificer/staging

App Enhancements
- App Enhancements
- Merge pull request #61 from tech-artificer/docs/readme-updates

docs: update README for tablet-ordering-pwa
- Merge pull request #60 from tech-artificer/chore/fix-esbuild

chore(pwa): require node >=18 and rebuild esbuild on postinstall
- Merge pull request #59 from tech-artificer/chore/copilot-guidelines

Chore/copilot guidelines
- Merge pull request #58 from tech-artificer/hotfix/session-end-clear-state

fix(session): ensure session end clears client order/session state
- Merge pull request #55 from tech-artificer/chore/fix-fullscreen-order-tests

Chore/fix fullscreen order tests
- Added splash screen
- Updates
- Update printerHandler.vue
- Printing rawbt
- Added fullscreen functionality
- Minor fixes
- Beta version
- Refinement
- Ssl cert
- Merge branch 'main' into staging
- Merge pull request #35 from tech-artificer/dependabot/npm_and_yarn/ipx-2.1.1

Bump ipx from 2.1.0 to 2.1.1
- Bump ipx from 2.1.0 to 2.1.1

Bumps [ipx](https://github.com/unjs/ipx) from 2.1.0 to 2.1.1.
- [Release notes](https://github.com/unjs/ipx/releases)
- [Changelog](https://github.com/unjs/ipx/blob/main/CHANGELOG.md)
- [Commits](https://github.com/unjs/ipx/compare/v2.1.0...v2.1.1)

---
updated-dependencies:
- dependency-name: ipx
  dependency-version: 2.1.1
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
- Merge pull request #36 from tech-artificer/dependabot/npm_and_yarn/tmp-0.2.4

Bump tmp from 0.2.3 to 0.2.4
- Bump tmp from 0.2.3 to 0.2.4

Bumps [tmp](https://github.com/raszi/node-tmp) from 0.2.3 to 0.2.4.
- [Changelog](https://github.com/raszi/node-tmp/blob/master/CHANGELOG.md)
- [Commits](https://github.com/raszi/node-tmp/compare/v0.2.3...v0.2.4)

---
updated-dependencies:
- dependency-name: tmp
  dependency-version: 0.2.4
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
- Merge pull request #34 from tech-artificer/dependabot/npm_and_yarn/multi-239536eb65

Bump @eslint/plugin-kit and @nuxt/eslint
- Bump @eslint/plugin-kit and @nuxt/eslint

Bumps [@eslint/plugin-kit](https://github.com/eslint/rewrite/tree/HEAD/packages/plugin-kit) to 0.3.4 and updates ancestor dependency [@nuxt/eslint](https://github.com/nuxt/eslint/tree/HEAD/packages/module). These dependencies need to be updated together.


Updates `@eslint/plugin-kit` from 0.3.1 to 0.3.4
- [Release notes](https://github.com/eslint/rewrite/releases)
- [Changelog](https://github.com/eslint/rewrite/blob/main/packages/plugin-kit/CHANGELOG.md)
- [Commits](https://github.com/eslint/rewrite/commits/plugin-kit-v0.3.4/packages/plugin-kit)

Updates `@nuxt/eslint` from 1.4.1 to 1.7.1
- [Release notes](https://github.com/nuxt/eslint/releases)
- [Commits](https://github.com/nuxt/eslint/commits/v1.7.1/packages/module)

---
updated-dependencies:
- dependency-name: "@eslint/plugin-kit"
  dependency-version: 0.3.4
  dependency-type: indirect
- dependency-name: "@nuxt/eslint"
  dependency-version: 1.7.1
  dependency-type: direct:development
...

Signed-off-by: dependabot[bot] <support@github.com>
- Refinement
- Order updates
- Removed mobile restriction
- Update menu.vue
- Update menu.vue
- Update laravel-echo.client.ts
- Update orderProgressViewer.vue
- [Update] confirm order fix css and table name
- Order details
- Guest Counter Update, Fixed Dessert
- Is active
- Change <img >to <NuxtImg>
- Add page transition
- Nuxt Configuration (nuxt.config.ts) #40
- Update cartMenu.vue
- Reset status and reset guest count
- IsCartLoading
- Update homeHeadline.vue
- Update supportMenu.vue
- Change authentication style
- Add badge
- Add decimals
- Fix cart
- Add device name
- UX: When adding an order on the menu screen. User taps multiple times #39
- [Update] woosoo optimize component
- Add voided and cancelled
- Add loading select package auto close modal confirm order
- Categorize menu list & fetch desserts, sides, beverage categorieze & group
- Menu list filter
- Revert "Update Device.ts"

This reverts commit d0bee72f223e6e19b12b96c79fc34db22a786afe.
- Update Device.ts
- Update packageCard.vue
- Websocket confirmed and complete
- 3 items for product Menu
- Fix scroll and menu Cart default position
- Smooth scroll
- Let's grill loading required & remove function getCategories()
- Merge branch 'main' into staging
- Merge pull request #32 from tech-artificer/staging

Staging
- Change food pictures and change filter cart menu
- Continue dev
- Add uuid after logout to relog
- Fix payload cartMenu and Card & vat
- Menu history  & order progress viewer
- Cart men and package card add subtotal, device_id & price
- Revert "[Update]: laravel-reverb"

This reverts commit c36cdf9b6b7b9171bf942306e437c16af767f811.
- Laravel-reverb
- OrderStore export
- Design layout
- Remove error image in placeholder
- Revert "Reapply "[Update]: remove reverb and echo-js and add default image as loading . .""

This reverts commit 6fbf96638d2a2571fabef9a9263ff42d94b17595.
- Reapply "[Update]: remove reverb and echo-js and add default image as loading . ."

This reverts commit fb06bcc10099f23f02d562b3202520bbdca2f083.
- Reapply "[Update]: from dialog to drawer cart"

This reverts commit 8a6a0c2d73ec03b0602b70b5ee44531937dc8f38.
- Revert "[Update]: from dialog to drawer cart"

This reverts commit d7a5841c4c61ef4768031ebea2f2ab46fce860ad.
- Revert "[Update]: remove reverb and echo-js and add default image as loading . ."

This reverts commit 8cb022ab66dbdf8400bcf0e51b007d294ab63c11.
- Remove reverb and echo-js and add default image as loading . .
- From dialog to drawer cart
- Change layout and design from modal to layout login & register
- [Vercel-fix]; UpperCase Device CustomFetch
- Fix width and  default package bug fix
- Sticky bottom total and vat
- Quantity update
- Device login fix (change from GET to POST method)
- Implment device login, modify quantity limit in cart preview
- Order integrate save
- Websocket laravel reverb
- Cart default category and menus
- Cart and packages
- 480 px device prevent access
- Merge pull request #23 from tech-artificer/dependabot/npm_and_yarn/brace-expansion-1.1.12

Bump brace-expansion from 1.1.11 to 1.1.12
- Bump brace-expansion from 1.1.11 to 1.1.12

Bumps [brace-expansion](https://github.com/juliangruber/brace-expansion) from 1.1.11 to 1.1.12.
- [Release notes](https://github.com/juliangruber/brace-expansion/releases)
- [Commits](https://github.com/juliangruber/brace-expansion/compare/1.1.11...v1.1.12)

---
updated-dependencies:
- dependency-name: brace-expansion
  dependency-version: 1.1.12
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
- Merge pull request #28 from tech-artificer/staging

[Update]: prevent mobile device access
- Prevent mobile device access
- Merge pull request #27 from tech-artificer/staging

[BugFix]: flex col upper device
- Flex col upper device
- Merge pull request #26 from tech-artificer/staging

[Update]: remove device flex-row for landscape orientation
- Remove device flex-row for landscape orientation
- Merge pull request #25 from tech-artificer/staging

Staging
- Default orientation landscape
- Partial responsive
- Package card modify design
- Merge branch 'main' of https://github.com/tech-artificer/tablet-ordering-pwa
- Merge pull request #24 from tech-artificer/staging

Staging
- Cart menu error/success message
- Cart meny order confirmation
- Getter vat, subtotal
- Change width cart-menu from  w-80 -> w-96
- Merge pull request #22 from tech-artificer/staging

Staging
- [CodeRabbit-issue-fix]:
- Set fix size support card
- New UI Development
- Search bar skeleton hidden
- Merge pull request #21 from tech-artificer/staging

Staging
- Product card
- Merge pull request #20 from tech-artificer/Interface-Adjustments-#18

Interface Adjustments #18
- 3 product card only
- Interface Adjustments #18

Fixed Issue:

 1. Adjust margin between carousel and menu buttons.

 2. Add gap between buttons/links
- Merge pull request #19 from tech-artificer/dependabot/npm_and_yarn/multi-2f20eee292

Bump tar-fs
- Bump tar-fs

Bumps  and [tar-fs](https://github.com/mafintosh/tar-fs). These dependencies needed to be updated together.

Updates `tar-fs` from 2.1.2 to 3.0.9
- [Commits](https://github.com/mafintosh/tar-fs/compare/v2.1.2...v3.0.9)

Updates `tar-fs` from 3.0.8 to 3.0.9
- [Commits](https://github.com/mafintosh/tar-fs/compare/v2.1.2...v3.0.9)

---
updated-dependencies:
- dependency-name: tar-fs
  dependency-version: 3.0.9
  dependency-type: indirect
- dependency-name: tar-fs
  dependency-version: 3.0.9
  dependency-type: indirect
...

Signed-off-by: dependabot[bot] <support@github.com>
- Merge pull request #17 from tech-artificer/staging

Staging
- Add collapsable order table
- Add skeleton and fix staff not to be destructable
- Merge pull request #16 from tech-artificer/staging

[Update]: remove example
- Remove example
- Merge pull request #15 from tech-artificer/staging

[Update]: woosoo menu
- Woosoo menu
- Change to cover
- Merge pull request #14 from tech-artificer/staging

Staging
- Remove exess script tag
- Heading page
- Add woosoo fonts
- Merge pull request #13 from tech-artificer/staging

[Update]: woosoo theme
- Woosoo theme
- Merge pull request #12 from tech-artificer/staging

[Update]: design and partial store models
- Fix rabbitcode
- Design and partial store models
- Merge pull request #11 from tech-artificer/staging

[Update]: internet connection checker
- Add internet connection ping google icon
- Add slideUp / SlideDown Component with ConnectionStatus Stores
- Merge pull request #10 from tech-artificer/staging

Staging
- PWA Integration
- Add pwa package
- Merge pull request #8 from tech-artificer/staging

Staging
- Merge branch 'main' into staging
- Merge pull request #7 from tech-artificer/staging

[Update]: new forms components
- [Update] : advance demo
- New forms components
- Merge pull request #6 from tech-artificer/staging

[Update]: components, input, password, button, textarea, link
- Components, input, password, button, textarea, link
- Merge pull request #5 from tech-artificer/staging

Staging
- Update componentDemo.vue
- Update componentDemo.vue
- Merge pull request #4 from tech-artificer/staging

[Update]: responsive
- Responsive
- Merge pull request #3 from tech-artificer/staging

Components & Example Demo (Initials)
- Merge pull request #2 from tech-artificer/TECH-ARTIFICER-1

components & Examples demo (initials)
- Initial components
- Dynamic  theme system
- Merge pull request #1 from tech-artificer/staging

install dependencies, packages, config
- Editorconfig, assets, composables, components, layouts
- Create dependency package
- Nuxt 3 installation

### Refactor

- Remove as-any casts + orphaned CSS (code-simplifier pass)
- Drop packageDetails, modifiers, alacartes, meatCategories, tabletCategories — package.modifiers is the single source of truth for meats
- Remove duplicate active-order recovery from /menu, /order/packageSelection, and /order/start
- Collapse 4 middleware into single boot.global.ts
- Remove on-demand menu fetching from setCategory
- Auto-reset submit state on component lifecycle
- Auto-reset submit state on component lifecycle
- Cleanup legacy components and convert cart sidebar to drawer
- Inline styles → Tailwind; coordinate terminal state with store
- Consolidate lifecycle hooks + dedupe recovery + guard helpers
- Add centralized configuration files

### Tests

- Playwright mocked TAB-CASE-011 recovery e2e
- TAB-CASE-011 recovery integration tests and archived guard
- Update contract assertion for renamed CTA button
- Fix ESM __dirname compatibility in test files
- Add rounds[] ledger regression spec for refill data persistence
- Update in-session-ordered-items to use rounds[] ledger
- Fix middleware-deleted and boot.global.ts assertions, delete debug page
- Align refill review submit spec with current refill state contract
- Fix submit state reset in OrderingStep3ReviewSubmit tests
- Avoid brittle runtime script lookup assumptions
- Harden Nuxt config runtime script assertion
- Assert runtime-config script via parsed Nuxt config
- Make runtime-config head assertion less brittle
- Add runtime coverage for app update composable flow
- Resolve nginx fixture path from repo root
- Use tracked nginx config for public CA endpoint
- Add test:run script and stabilize polling fallback spec
- Fix order submission and cart sidebar tests; add .vue shims

