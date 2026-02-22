# STAGING MERGE AUDIT: tablet-ordering-pwa
**Detective:** Ranpo Edogawa  
**Date:** February 20, 2026  
**Priority:** P0 / CRITICAL  

---

## 🔍 BRANCH DIVERGENCE ANALYSIS

### Current State
- **Active Branch:** `main` (❌ WRONG - work should be on staging)
- **Main HEAD:** `9f54241` - "fix:order refill fix payload"
- **Staging HEAD:** `fc68b36` - "Add complete transaction and development workflow documentation to WORKFLOW.md"
- **Divergence:** 86 files changed (6,317 insertions, 6,222 deletions)

### Commit Divergence

**Main has 9 commits NOT in staging:**
1. `9f54241` - fix:order refill fix payload
2. `2ce8647` - improved transitions
3. `bc5f3b9` - Merge pull request #66 (UI inconsistencies)
4. `04b07e3` - Merge pull request #67 from staging
5. `15239cb` - Fix UI inconsistencies: Add missing Tailwind colors and fix store import casing
6. `520a3ca` - Initial plan for fixing UI inconsistencies
7. `a9b1509` - Initial plan
8. `d446962` - Merge pull request #63 from staging
9. `83b1353` - Merge pull request #62 from staging

**Staging has 12 commits NOT in main:**
1. `fc68b36` - Add complete transaction and development workflow documentation to WORKFLOW.md
2. `a21e831` - Fix: place order, next order session, order refill
3. `a083049` - Merge: Add PWA CI workflow and update dev config
4. `8ed9ef7` - Updates
5. `b96abf3` - updates
6. `2fe3dca` - ci: fix cache paths and working dir
7. `07dfb27` - chore: remove PR template gate
8. `98bb90e` - chore(ci): run workflows on push only
9. `01513b7` - fix: add staging branch to CI workflow trigger
10. `277b946` - chore: add CI workflow and enhance gitignore
11. `269cda0` - updated docs
12. `0e60cb3` - fixes
13. `e78424e` - fixes

---

## 📋 UNCOMMITTED CHANGES ON MAIN

### Modified Files (9):
1. `CASE_FILE.md` - ⚠️ Critical documentation
2. `composables/useBroadcasts.ts` - Real-time features
3. `pages/index.vue` - Home page
4. `pages/menu.vue` - Menu display
5. `pages/order/in-session.vue` - Order session
6. `pages/order/packageSelection.vue` - Package selection
7. `pages/order/review.vue` - Order review
8. `pages/order/start.vue` - Order start
9. `plugins/echo.client.ts` - WebSocket client
10. `stores/Device.ts` - Device store
11. `stores/Order.ts` - Order store
12. `stores/Session.ts` - Session store

### Untracked Files (9):
1. `AUDIT_TABLET_ORDERING_APP.md` - ✅ New documentation
2. `CHUYA_HANDOFF_API_MISMATCH.md` - ✅ New documentation
3. `ORDER_PLACEMENT_FLOW.md` - ✅ New documentation
4. `ORDER_SESSION_TERMINATION.md` - ✅ New documentation
5. `REALTIME_LOGGING.md` - ✅ New documentation
6. `SESSION_LIFECYCLE_LOGGING.md` - ✅ New documentation
7. `V2_API_IMPLEMENTATION_SIGNOFF.md` - ✅ New documentation
8. `components/RealtimeStatusPanel.vue` - ✅ New component
9. `composables/useRealtimeStatus.ts` - ✅ New composable

---

## 🎯 KEY CONFLICTS TO RESOLVE

### High-Risk Merge Conflicts

#### 1. **CASE_FILE.md**
- Main: Extensive updates (1425+ line changes)
- Staging: Different version
- Risk: **HIGH** - Critical project documentation
- Resolution: Manual merge required

#### 2. **stores/Order.ts**
- Main: Modified (437 line changes in diff)
- Staging: Different implementation
- Risk: **HIGH** - Core ordering logic
- Resolution: Careful merge, test order submission

#### 3. **stores/Session.ts**
- Main: Modified (333 line changes in diff)
- Staging: Different implementation
- Risk: **HIGH** - Session management
- Resolution: Careful merge, test session lifecycle

#### 4. **pages/menu.vue**
- Main: Modified (324 line changes in diff)
- Staging: Different implementation
- Risk: **MEDIUM** - Menu display logic
- Resolution: Review both versions

#### 5. **composables/useBroadcasts.ts**
- Main: Modified (64 line changes in diff)
- Staging: Different implementation
- Risk: **MEDIUM** - Real-time event handling
- Resolution: Ensure broadcast compatibility

#### 6. **plugins/echo.client.ts**
- Main: Modified (40 line changes in diff)
- Staging: Different implementation
- Risk: **MEDIUM** - WebSocket connection
- Resolution: Test Reverb connectivity

---

## 📦 DELETED FILES IN MAIN (NOT in staging)

These files exist in staging but were deleted in main:
1. `components/common/SessionCompletionOverlay.vue` (-29 lines)
2. `components/common/SessionTimerBanner.vue` (-89 lines)
3. `components/order/OrderPlacedBadge.vue` (-58 lines)
4. `components/ui/Button.vue` (-66 lines)
5. `composables/useOrder.ts` (-84 lines)
6. `middleware/order-guard.ts` (-58 lines)
7. `pages/order/package-selection-fallback.vue` (-79 lines)
8. `plugins/api.client.ts.backup` (-145 lines)
9. `stores/device.ts.backup` (-363 lines)
10. `utils/orderHelpers.ts` (-81 lines)
11. `docs/IMPLEMENTATION_SUMMARY_ORDER_RESTRICTIONS.md` (-671 lines)
12. `docs/PHASE3_MANUAL_TESTING.md` (-493 lines)
13. `docs/QUICK_REFERENCE_ORDER_RESTRICTIONS.md` (-391 lines)
14. `docs/WORKFLOW.md` (-36 lines)
15. `tests/contracts/order-submission.contract.spec.ts` (-246 lines)
16. `tests/order-restrictions.spec.ts` (-227 lines)

**Total Deletions:** ~3,016 lines removed in main

---

## 🆕 NEW FILES IN MAIN (NOT in staging)

Files that exist in main but not in staging:
1. `.github/workflows/pr_template_check.yml` (+42 lines)
2. `components/ui/SkeletonCard.vue` (+30 lines)
3. `docs/api.md` (+407 lines)
4. `docs/api/DeviceApiController.md` (+71 lines)
5. `docs/api/DeviceOrderApiController.md` (+114 lines)
6. `docs/api/DeviceOrderManagementApiController.md` (+77 lines)
7. `docs/api/OrderApiController.md` (+42 lines)
8. `docs/api/ServiceRequestApiController.md` (+73 lines)
9. `docs/api/backend-requirements.md` (+707 lines)
10. `types/index.d.ts` (+71 lines)

**Total Additions:** ~1,634 lines added in main

---

## 🔧 MERGE STRATEGY

### Recommended Approach: **Three-Way Merge with Manual Review**

#### Phase 1: Preparation
1. **Commit all uncommitted work on main** (including new docs + components)
2. **Create backup branch** from main (`main-backup-20260220`)
3. **Checkout staging branch**

#### Phase 2: Merge Execution
1. **Merge main into staging:** `git merge main`
2. **Resolve conflicts manually** (focus on high-risk files)
3. **Test critical paths:**
   - Device registration
   - Order placement
   - Order refill
   - Session termination
   - Real-time updates

#### Phase 3: Validation
1. **Run tests:** Check if any tests fail
2. **Manual QA:** Full end-to-end order flow
3. **Reverb connectivity:** Verify WebSocket events
4. **API compatibility:** Confirm V2 endpoints work

#### Phase 4: Cleanup
1. **Remove duplicate/outdated files**
2. **Update CASE_FILE.md** with merge summary
3. **Push to staging:** `git push origin staging`
4. **Sync main with staging:** Merge staging back to main

---

## ⚠️ CRITICAL WARNINGS

1. **DO NOT force push** without backup
2. **DO NOT merge without testing** realtime features
3. **DO NOT skip conflict resolution** on stores (Order, Session, Device)
4. **DO NOT merge package-lock.json blindly** - regenerate if needed
5. **DO test order submission** after merge (critical path)

---

## 🎬 EXECUTION COMMANDS

```bash
# Phase 1: Commit current work
git add .
git commit -m "feat: V2 API implementation + realtime status panel + comprehensive docs"

# Create backup
git branch main-backup-20260220

# Phase 2: Switch to staging
git checkout staging

# Phase 3: Merge main into staging
git merge main

# (Resolve conflicts manually)

# Phase 4: Test and push
npm run dev
# ... manual testing ...
git push origin staging

# Phase 5: Sync main with staging
git checkout main
git merge staging
git push origin main
```

---

## 🧪 POST-MERGE TESTING CHECKLIST

- [ ] Device registration works
- [ ] Package selection displays correctly
- [ ] Order placement succeeds
- [ ] Order refill works
- [ ] Session termination triggers properly
- [ ] Real-time order status updates received
- [ ] WebSocket connection established (port 6002)
- [ ] V2 API endpoints respond (packages, categories, etc.)
- [ ] Cart sidebar displays correctly
- [ ] Menu filtering works
- [ ] Guest counter increments
- [ ] Service requests submit

---

**Case Status:** MERGE PENDING — Awaiting President's approval to execute.
