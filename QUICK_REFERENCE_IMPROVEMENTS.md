# Quick Reference: UI Improvements & Missing Features

## Overview Dashboard

```
Current Status: ~80% Feature Complete ✅

┌─────────────────────────────────────────────────────────────────┐
│ TABLET ORDERING PWA - FEATURE COMPLETENESS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Device Auth & Registration ████████░░ 85%  ✅                 │
│  Package Selection           ████████░░ 85%  ✅                 │
│  Menu Browsing              ████████░░ 80%  ✅                 │
│  Cart Management            ████████░░ 85%  ✅                 │
│  Order Placement            ████████░░ 85%  ✅                 │
│  Real-Time Updates          ██████░░░░ 70%  🟡                 │
│  Refill Workflow            ██████░░░░ 70%  🟡                 │
│  Service Requests           ██████░░░░ 60%  🟡                 │
│  Order History              ░░░░░░░░░░  0%  ❌                 │
│  Payment/Bill               ░░░░░░░░░░  0%  ❌                 │
│  Accessibility              ███░░░░░░░ 30%  🔴                 │
│  Offline Support            ████░░░░░░ 45%  🟡                 │
│  Error Recovery             ███░░░░░░░ 30%  🔴                 │
│  Admin Tools                ░░░░░░░░░░  0%  ❌                 │
│  Analytics                  ░░░░░░░░░░  0%  ❌                 │
│                                                                 │
│  ✅ = Production Ready   🟡 = Partial   ❌ = Missing           │
│  🔴 = Needs Work         █ = Complete   ░ = Incomplete        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10 Critical Missing Features (Ranked by Priority)

### 🔴 **1. Order History & Reorder**
- **Status:** ❌ Missing (placeholder only)
- **Impact:** Users cannot review past orders or quickly reorder
- **Effort:** Medium (API + UI page)
- **Files to Create:**
  - `pages/order/history.vue`
  - `components/order/OrderHistoryCard.vue`
  - `components/order/OrderDetailModal.vue`

### 🔴 **2. Error Recovery & Retry Logic**
- **Status:** 🟡 Partial (no retry button on failure)
- **Impact:** Customers stuck if order submission fails
- **Effort:** Medium (error handlers, retry service)
- **Files to Update:**
  - `stores/Order.ts` (add retry state)
  - `pages/order/review.vue` (show retry button)
  - Create `services/errorRecoveryService.ts`

### 🔴 **3. Payment & Bill Splitting**
- **Status:** ❌ Missing
- **Impact:** Unclear if payment should be on tablet or POS
- **Effort:** Large (design needed first)
- **Files to Create:**
  - `pages/order/payment.vue`
  - `components/order/BillSplitModal.vue`

### 🟡 **4. Accessibility (a11y)**
- **Status:** 🔴 Poor (30% WCAG compliance)
- **Impact:** Cannot serve vision-impaired or keyboard-only users
- **Effort:** Medium (labeling + keyboard nav)
- **Quick Wins:**
  - Add `aria-label` to all buttons
  - Add `role="region"` to cart/order sections
  - Create `composables/useKeyboardNavigation.ts`

### 🟡 **5. Modifier Validation**
- **Status:** 🟡 Partial (no required/exclusive logic)
- **Impact:** Orders can be incomplete (missing required sauce, etc.)
- **Effort:** Small (add validation to Modal)
- **Files to Update:**
  - `components/menu/ModifierModal.vue` (add validation logic)

### 🟡 **6. Offline Robustness**
- **Status:** 🟡 Partial (caching works, but no queue/sync)
- **Impact:** Orders placed offline may be lost
- **Effort:** Large (queue service + sync logic)
- **Files to Create:**
  - `composables/useOfflineQueue.ts`
  - `services/offlineQueueService.ts`

### 🟡 **7. Admin Override Panel**
- **Status:** ❌ Missing
- **Impact:** Staff cannot reset kiosk or unlock in emergencies
- **Effort:** Small (UI only, backend event exists)
- **Files to Create:**
  - `components/common/AdminOverridePanel.vue`

### 🟡 **8. Quantity Warnings & Confirmations**
- **Status:** ❌ Missing
- **Impact:** Users might accidentally order 100 items
- **Effort:** Small (add confirmation dialogs)
- **Files to Update:**
  - `stores/Order.ts` (add warning logic)

### 🟡 **9. Recommendation Engine**
- **Status:** ❌ Missing
- **Impact:** Users don't discover new items or popular choices
- **Effort:** Medium (compute recommendations, UI)
- **Files to Create:**
  - `components/menu/RecommendedItems.vue`
  - `composables/useRecommendations.ts`

### 🟡 **10. Session Analytics & Telemetry**
- **Status:** ❌ Missing
- **Impact:** No insights into user behavior or issues
- **Effort:** Medium (service + API endpoint)
- **Files to Create:**
  - `services/analyticsService.ts`
  - `composables/useAnalytics.ts`

---

## High-Value UI Improvements (Non-Breaking)

### Visual Enhancements
```
Current                          Improved
┌──────────────────────┐        ┌──────────────────────┐
│ Cart Summary         │        │ 🛒 Cart (3 items)    │
│ Subtotal: ₱2,500     │        ├──────────────────────┤
│ Tax: ₱300            │        │ Samgyupsal    ₱600×2 │
│ Total: ₱2,800        │        │ Soju          ₱200×1 │
│                      │        ├──────────────────────┤
│ [Submit Order]       │        │ Subtotal    ₱1,400   │
└──────────────────────┘        │ Tax            ₱168   │
                                │ ─────────────────── │
                                │ TOTAL        ₱1,568  │
                                │                      │
                                │ ⬅ Clear  [Order ➜]  │
                                └──────────────────────┘
```

### Cart Mini-Preview
```
MenuHeader.vue Enhancement:
┌────────────────────────────────────────────┐
│ 🏠 Wooserve    Table 4    Guest Count: 4   │ 🛒 [3]
├────────────────────────────────────────────┤
│ Premium Package (4 guests)                 │
│ ₱3,200 × 1 = ₱3,200                       │
└────────────────────────────────────────────┘
    ↓ (click cart icon to show mini-cart)
    ┌────────────────┐
    │ Cart Preview   │
    ├────────────────┤
    │ Samgyupsal  ✕  │
    │ Soju        ✕  │
    │ Coke        ✕  │
    └────────────────┘
```

### Order Status Timeline
```
Current                      Improved
Pending                      ✓ Received → ⏳ Preparing → Ready
                             Order at 2:15 PM
                             ~8 min remaining
```

### Split-Screen Layout (Landscape)
```
    ┌─────────────────────────────┬──────────────────┐
    │                             │   Cart Sidebar   │
    │  Menu Items                 ├──────────────────┤
    │  (60% width)                │ Samgyupsal    ₱ │
    │                             │ Soju          ₱ │
    │  • Meats                    │ Coke          ₱ │
    │    - Samgyupsal             │                │
    │    - Bulgogi                │ Subtotal  ₱1400 │
    │                             │ Tax         ₱168│
    │  • Sides                    │ ──────────────── │
    │    - Kimchi                 │ TOTAL   ₱1,568  │
    │                             │                │
    │  • Drinks                   │ [Order] [Clear] │
    │    - Soju                   │                │
    │    - Coke                   │                │
    │                             │                │
    │                             │ 🔔 Status      │
    │                             │ Preparing...   │
    │                             │ ~5 min left    │
    └─────────────────────────────┴──────────────────┘
    
    vs. Current (Single column, mobile-first)
```

---

## Quick Win: Add ARIA Labels (15 min)

```vue
<!-- Before -->
<button @click="addToCart(item)">
  + Add
</button>

<!-- After -->
<button 
  @click="addToCart(item)"
  :aria-label="`Add ${item.name} (₱${item.price}) to cart`"
  :title="`Add ${item.name} to cart`"
>
  + Add
</button>
```

Apply to:
- MenuItemCard.vue (~5 buttons)
- CartSidebar.vue (~3 buttons)
- ModifierModal.vue (~10 options)
- MenuHeader.vue (~2 buttons)

**Time:** ~30 minutes | **Impact:** ⭐⭐⭐ (accessibility score)

---

## File Change Summary

### New Files to Create (10 files)
```
tablet-ordering-pwa/
├── components/order/
│   ├── OrderHistoryCard.vue
│   ├── OrderDetailModal.vue
│   ├── OrderTimeline.vue
│   ├── BillSplitModal.vue
│   └── OfflineOrderQueue.vue
├── components/menu/
│   ├── RecommendedItems.vue
│   └── PopularBadge.vue
├── components/common/
│   ├── AccessibilityToggle.vue
│   └── AdminOverridePanel.vue
├── pages/order/
│   ├── history.vue
│   └── payment.vue
├── composables/
│   ├── useOfflineQueue.ts
│   ├── useKeyboardNavigation.ts
│   └── useAnalytics.ts
└── services/
    ├── analyticsService.ts
    └── errorRecoveryService.ts
```

### Files to Update (8 files)
```
├── components/order/CartSidebar.vue       (+ ARIA labels)
├── components/menu/ModifierModal.vue      (+ validation logic)
├── components/common/NetworkIndicator.vue (+ sync status)
├── components/menu/MenuItemCard.vue       (+ ARIA labels)
├── components/menu/MenuHeader.vue         (+ cart icon + guest display)
├── stores/Order.ts                        (+ retry + warning logic)
├── pages/order/review.vue                 (+ error recovery)
└── pages/order/in-session.vue             (+ history link)
```

### No Changes Needed (Safe)
```
✅ pages/order/packageSelection.vue (good UI)
✅ components/menu/MenuCategoryTabs.vue (functional)
✅ composables/useDeviceAuth.ts (auth solid)
✅ stores/Device.ts (stable)
```

---

## Testing Matrix

| Feature | Desktop | Tablet Portrait | Tablet Landscape | Mobile | Offline |
|---------|---------|-----------------|------------------|--------|---------|
| Order History | ✅ | ✅ | ✅ | ✅ | 🟡 Cached |
| Error Recovery | ✅ | ✅ | ✅ | ✅ | ✅ Queue |
| Payment | ✅ | ✅ | ✅ | ✅ | ❌ N/A |
| Accessibility | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Offline Queue | 🟡 | ✅ | ✅ | ✅ | ✅ |

---

## Backend API Endpoints Needed

```
Device Orders
├── GET  /api/v1/devices/orders/history
├── GET  /api/v1/devices/orders/{id}/detail
└── POST /api/v1/devices/orders/{id}/reorder

Menu Recommendations
├── GET  /api/v1/menus/recommendations?packageId=1&limit=5
└── GET  /api/v1/menus/trending

Analytics
└── POST /api/v1/analytics/events (batch)

Admin Actions
├── POST /api/v1/devices/{id}/reset
├── POST /api/v1/devices/{id}/lock
├── POST /api/v1/devices/{id}/unlock
└── POST /api/v1/devices/{id}/reload

Payment (if tablet-based)
├── GET  /api/v1/devices/bills/split?orderId=1&method=equal&count=4
└── POST /api/v1/devices/bills/{id}/finalize
```

---

## Phased Implementation Timeline

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1: CRITICAL (Week 1-2)                                    │
├──────────────────────────────────────────────────────────────────┤
│ • Order History page + API integration               (3 days)    │
│ • Error Recovery (retry logic) for failed orders     (2 days)    │
│ • ARIA labels + keyboard navigation                 (2 days)    │
│ • Payment/Bill flow (if needed)                      (3 days)    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ PHASE 2: HIGH VALUE (Week 3-4)                                  │
├──────────────────────────────────────────────────────────────────┤
│ • Modifier validation (required, exclusive)          (2 days)    │
│ • Offline queue + sync                               (3 days)    │
│ • Admin override panel                               (1 day)     │
│ • Enhanced error messages                            (1 day)     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3: POLISH (Week 5+)                                       │
├──────────────────────────────────────────────────────────────────┤
│ • Recommendation engine                              (2 days)    │
│ • Quantity warnings & confirmations                  (1 day)     │
│ • Analytics framework                                (2 days)    │
│ • UI polish (timeline, mini-cart, split screen)      (2 days)    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

After implementation, target:
- **Lighthouse Score:** 90+ (current: TBD)
- **WCAG Compliance:** AA (from ~30%)
- **Order Completion Rate:** 98%+ (reduce abandonment)
- **Error Recovery Rate:** 95%+ (failed orders recovered)
- **Offline Sync Success:** 99%+ (queue reliability)
- **User Satisfaction:** 4.5+/5 (from feedback)
- **Support Tickets:** -30% (self-service order history)

---

## Next Steps

1. **Review & Approve** this analysis with stakeholders
2. **Prioritize** which features to tackle first
3. **Design** payment/bill flow (if needed)
4. **Create JIRA/GitHub Issues** with acceptance criteria
5. **Kick off Phase 1** implementation

---

**Document Version:** 1.0  
**Created:** January 3, 2026  
**Owner:** AI Development Agent  
**Status:** Ready for Review
