# Tablet Ordering PWA — UI Improvements & Missing Functionality Analysis

**Last Updated:** January 3, 2026  
**Scope:** Tablet-ordering-pwa (Nuxt 3 PWA)  
**Focus:** Identify missing features and propose UI enhancements for a complete, production-ready kiosk experience.

---

## Executive Summary

The Wooserve tablet ordering kiosk is **80% feature-complete** with strong foundations in:
- Device registration & authentication ✅
- Package selection (grid + carousel responsive UI) ✅
- Menu browsing with modifiers ✅
- Cart management & order placement ✅
- Real-time order status updates (WebSocket) ✅
- Refill workflow ✅
- Service requests (call staff, refill water, change grill) ✅

**Critical Gaps** requiring attention:
1. **Order history & past order details** — Missing UI to view previous orders
2. **Recommendation engine** — No "suggested items" based on package or history
3. **Modifier validation & constraints** — Some modifiers lack required/exclusive logic
4. **Payment & bill splitting** — No explicit payment flow (assumed handled at POS)
5. **Accessibility** — Limited ARIA labels, keyboard navigation, screen reader support
6. **Offline robustness** — Cache strategy exists but offline fallback UX incomplete
7. **Error recovery flows** — Limited retry/fallback mechanisms for failed orders
8. **Admin override/reset** — No kiosk lock/reset mechanism for staff troubleshooting
9. **Quantity limits & confirmations** — No warnings for unusually large orders
10. **Analytics & tracking** — No user interaction telemetry or session logging

---

## Current Architecture Overview

### Pages (Routes)
- `/` — Landing page with PIN-protected settings access
- `/auth/` — Device registration/login
- `/settings` — Device configuration, API diagnostics, token management
- `/order/start` — Entry point; guides to package selection
- `/order/packageSelection` — Grid/carousel package picker
- `/menu` — Browse menus by category (meats, sides, desserts, beverages)
- `/order/review` — Order summary and submission
- `/order/in-session` — Refill/support dashboard (post-order)
- `/test` — Diagnostic page

### State Management (Pinia Stores)
1. **`Device`** — Device ID, token, table, IP address, registration status
2. **`Menu`** — Packages, modifiers, items by category (meats, sides, drinks, desserts)
3. **`Order`** — Cart items, guest count, package selection, order submission state
4. **`Session`** — Session active flag, timing, cleanup

### Real-time Communication
- **WebSocket (Reverb/Pusher)** via `useBroadcasts.ts`:
  - `device.{deviceId}` — Device control events (restart, lock, message)
  - `orders.{orderId}` — Order status updates
  - Service request acknowledgments
  - Fallback polling for unprinted orders (Flutter printer)

### Components
**Ordering Flow:**
- `PackageSelection.vue` — Grid + carousel mode, responsive
- `InitialOrder.vue` — Meat/side selection tabs
- `InSessionMain.vue` — Refill buttons, support requests, order history placeholder
- `OrderingStep3ReviewSubmit.vue` — Review cart and submit order

**Menu & Cart:**
- `MenuHeader.vue` — Package info, guest counter, assistance button
- `MenuItemGrid.vue` — Grid of items by category
- `ModifierModal.vue` — Modifier selection (checkboxes/radio for exclusive groups)
- `CartSidebar.vue` — Order summary, totals, submission button, order status display
- `CartItemCard.vue` — Single cart item with remove/update quantity

**Common:**
- `PrimaryButton.vue`, `SessionTracker.vue`, `NetworkIndicator.vue`

---

## Missing Features & Functionality

### 1. **Order History & Previous Order Review** 🔴 HIGH PRIORITY
**Current State:** Placeholder button in `InSessionMain.vue` ("View Past Orders") does nothing.

**Missing:**
- API endpoint to fetch order history by device/session
- Page/modal to display past orders with details
- "Quick reorder" button (add previous order items to new cart)
- Order timeline (dates, totals, status)
- Filter/search by order number or date range

**Suggested Endpoints (Backend):**
```
GET /api/v1/devices/orders/history?limit=10&offset=0
GET /api/v1/devices/orders/{orderId}/detail
POST /api/v1/devices/orders/{orderId}/reorder
```

**Component to Create:**
- `pages/order/history.vue` — Paginated list of past orders
- `components/order/OrderHistoryCard.vue` — Individual order summary
- `components/order/OrderDetailModal.vue` — Full order breakdown

---

### 2. **Recommendation Engine** 🔴 HIGH PRIORITY
**Current State:** No suggestions; static menu display.

**Missing:**
- "Popular this week" badge on frequently ordered items
- Suggested add-ons based on selected package (e.g., "Customers also ordered...")
- "Reorder" suggestions from session history
- Personalized recommendations if device is repeat customer

**Suggested Features:**
```typescript
// Compute in Menu store
interface RecommendationData {
  packageId: number
  suggestedItems: MenuItem[]  // Top 3 by popularity
  reason: 'popular' | 'paired_with_package' | 'trending' | 'your_favorite'
}
```

**Component to Create:**
- `components/menu/RecommendedItems.vue` — Horizontal scroll of suggested add-ons
- `components/menu/PopularBadge.vue` — "Top Seller" badge

---

### 3. **Modifier Validation & Constraints** 🟡 MEDIUM PRIORITY
**Current State:** Modifiers display, but no validation for:
- **Required modifiers** (e.g., must select sauce level for meat)
- **Exclusive modifier groups** (e.g., only ONE sauce per item, not multiple)
- **Min/max selections** (e.g., "select 2-3 toppings")
- **Dependent modifiers** (e.g., ice level only shows if beverage is cold)

**Missing:**
- UI feedback for invalid modifier states
- "Complete selections" prompt if required modifiers missing
- Visual distinction (red asterisk) for required modifiers

**Example Modifier Schema (from API):**
```json
{
  "id": 1,
  "name": "Sauce Level",
  "type": "exclusive",  // or "multiple"
  "required": true,
  "min_selections": 1,
  "max_selections": 1,
  "options": [
    { "id": 101, "name": "Mild", "price_adjustment": 0 },
    { "id": 102, "name": "Spicy", "price_adjustment": 0 }
  ]
}
```

**Component to Update:**
- `components/menu/ModifierModal.vue` — Add validation logic and UI feedback

---

### 4. **Payment & Bill Splitting** 🔴 HIGH PRIORITY
**Current State:** No payment UI; assumed handled externally (terminal/POS integration).

**Missing:**
- Bill splitting interface (split by number of guests, custom split, separate checks)
- Cash/card payment selection indicator
- Payment status tracking
- Receipt printing confirmation
- Tip selection / service charge confirmation

**Note:** If payment is handled by main POS (not tablet), consider:
- Add "Pay at Register" messaging
- Show final bill amount prominently
- Confirmation that order is ready for payment

**Component to Create:**
- `pages/order/payment.vue` — Bill summary, splitting options, payment method
- `components/order/BillSplitModal.vue` — Split calculator

---

### 5. **Accessibility (a11y) Enhancements** 🟡 MEDIUM PRIORITY
**Current State:** Limited ARIA labels, no keyboard navigation, minimal screen reader support.

**Missing:**
- ARIA labels on all interactive buttons and inputs
- Tab order (tabindex) for keyboard navigation
- Screen reader descriptions for images/icons
- High contrast mode toggle (for readability in bright restaurant environments)
- Font size adjustment for vision-impaired users
- Keyboard shortcuts (arrow keys for menu navigation, Enter to select, ESC to close modals)

**Priority Updates:**
```vue
<!-- ModifierModal.vue -->
<el-checkbox :aria-label="`Select ${modifier.name}`" ... />

<!-- MenuItemCard.vue -->
<button :aria-label="`Add ${item.name} to cart`" @click="add">
  <span class="sr-only">{{ item.name }}, ₱{{ item.price }}</span>
</button>

<!-- CartSidebar.vue -->
<div :role="region" aria-live="polite" aria-label="Order summary">
  Cart has {{ cartItems.length }} items
</div>
```

**Component to Create:**
- `components/common/AccessibilityToggle.vue` — Font size, high contrast switches
- `composables/useKeyboardNavigation.ts` — Global keyboard event handling

---

### 6. **Offline Robustness & Fallback UX** 🟡 MEDIUM PRIORITY
**Current State:**
- PWA with workbox caching enabled
- Menu cache strategy: `NetworkFirst` (30-min TTL)
- Service worker configured in `nuxt.config.ts`

**Missing:**
- Offline indicator in header (show red X when disconnected)
- Offline mode notice on menu items (greyed out if not cached)
- "Retry" mechanism for failed order submissions
- Local queue of pending orders while offline
- Sync indicator when coming back online ("syncing 2 pending orders...")
- Graceful degradation (show cached menu if API unavailable)

**Suggested Pattern:**
```typescript
// composables/useOfflineQueue.ts
export const useOfflineQueue = () => {
  const pendingOrders = ref<PendingOrder[]>([])
  
  const queueOrder = (order: Order) => {
    pendingOrders.value.push({
      ...order,
      queuedAt: Date.now(),
      retries: 0
    })
    localStorage.setItem('pending_orders', JSON.stringify(pendingOrders.value))
  }
  
  const syncPendingOrders = async () => {
    for (const order of pendingOrders.value) {
      try {
        await api.post('/devices/create-order', order)
        // Remove from queue on success
      } catch (e) {
        order.retries++
        if (order.retries > 3) {
          // Mark as failed, show error to user
        }
      }
    }
  }
  
  onMounted(() => {
    window.addEventListener('online', syncPendingOrders)
  })
}
```

**Components to Update:**
- `components/NetworkIndicator.vue` — Enhance with sync status
- `pages/order/review.vue` — Handle offline submission gracefully

---

### 7. **Error Recovery & Fallback Flows** 🟡 MEDIUM PRIORITY
**Current State:**
- Basic try/catch in API calls
- Order submission error shows toast but no retry option

**Missing:**
- "Retry" button when order submission fails
- Fallback to polling if WebSocket order status unavailable
- Clear error messages (distinguish between network error, validation error, server error)
- Automatic retry with exponential backoff for network timeouts
- "Contact staff" button if order creation fails after 3 retries

**Example Error Handling:**
```typescript
const submitOrder = async () => {
  try {
    isSubmitting.value = true
    const response = await api.post('/devices/create-order', orderPayload)
    // Success
  } catch (error) {
    if (error.response?.status === 422) {
      // Validation error — show which field is invalid
      showValidationError(error.response.data.errors)
    } else if (!navigator.onLine) {
      // Offline — queue for later
      queueOrder(orderPayload)
      showOfflineMessage()
    } else {
      // Network/server error — offer retry
      showRetryableError(error)
    }
  }
}
```

---

### 8. **Admin Override & Staff Reset Mechanism** 🟡 MEDIUM PRIORITY
**Current State:**
- PIN-protected settings page
- Limited to device registration/token refresh

**Missing:**
- Staff-only "Reset Kiosk" button (clears cart, resets to landing)
- Emergency lock screen (disable further ordering)
- Remote device control via broadcast events (e.g., "Lock all kiosks at table 4")
- Test print button (for printer connectivity)
- Staff notification override (e.g., "All staff, immediate attention at table 4")

**Suggested Backend Endpoints:**
```
POST /api/v1/devices/{id}/reset — Reset device state server-side
POST /api/v1/devices/{id}/lock — Lock device (prevent ordering)
POST /api/v1/devices/{id}/unlock — Unlock device
```

**Component to Create:**
- `components/common/AdminOverridePanel.vue` — Accessible only with PIN + admin flag

---

### 9. **Quantity Limits & Order Warnings** 🟡 MEDIUM PRIORITY
**Current State:**
- Max 99 items per add-on (see `CartSidebar.vue`)
- Guest count capped at 20 (see `Order.ts`)
- No warnings for unusual orders

**Missing:**
- Warning dialog if order total exceeds 5,000 PHP (or configurable threshold)
- Confirmation if ordering 10+ of same item ("Are you sure you want 15 Samgyupsal?")
- Alert if guest count doesn't match order size (e.g., 20 guests but only 2 meats)
- Max order size limit enforced by kitchen (e.g., "Max 50 items per order")
- Visual feedback (progress bar) as order approaches size limit

**Example:**
```typescript
const warningThresholds = {
  itemQuantity: 10,
  orderTotal: 5000,
  totalItems: 50
}

const checkOrderWarnings = () => {
  if (grandTotal.value > warningThresholds.orderTotal) {
    showWarning(`Large order (₱${grandTotal.value}). Confirm to proceed.`)
  }
}
```

---

### 10. **Analytics & Session Telemetry** 🟡 MEDIUM PRIORITY
**Current State:**
- Basic logging via `logger.ts`
- No structured event tracking

**Missing:**
- Page visit tracking (when tablet navigates between pages)
- Item browse time (how long user looks at menu before adding to cart)
- Cart abandonment tracking (user adds item but then removes it)
- Order submission success/failure rates
- Session duration and idle time
- Device uptime / restart frequency
- Network connectivity events (disconnect/reconnect)
- Menu search/filter usage

**Suggested Service:**
```typescript
// services/analyticsService.ts
export class AnalyticsService {
  trackPageView(page: string) { /* send to backend */ }
  trackItemBrowse(itemId: number, duration: number) { }
  trackAddToCart(itemId: number, quantity: number) { }
  trackOrderSubmit(orderId: string, totalAmount: number, itemCount: number) { }
  trackError(errorCode: string, message: string) { }
}
```

**Backend Endpoint:**
```
POST /api/v1/analytics/events — Batch submit events
```

---

## UI/UX Improvement Recommendations

### 1. **Enhanced Visual Feedback**
- Add loading skeletons while menu loads
- Animate cart item additions (toast with item image)
- Smooth page transitions between order steps
- Highlight guest count in header (make it prominent)
- Status badge colors: pending (yellow), confirmed (blue), ready (green), cancelled (red)

### 2. **Better Mobile Landscape Support**
- Current UI is responsive but could optimize for landscape tablets
- Wider cart sidebar (currently right-aligned but may feel cramped)
- Consider split-screen layout: menu on left (60%), cart on right (40%)
- Font sizes optimized for distance reading (tablets in restaurants)

### 3. **Improved Modifier Presentation**
- Current: Stacked radio buttons / checkboxes
- Suggested: Pill buttons for better mobile UX (easier to tap)
  ```vue
  <div class="flex gap-2 flex-wrap">
    <button 
      v-for="option in modifier.options"
      :class="{ 'bg-orange-600': selected.includes(option.id) }"
      @click="toggleOption(option.id)"
    >
      {{ option.name }}
    </button>
  </div>
  ```

### 4. **Cart Preview in Header**
- Add cart icon with item count badge to `MenuHeader.vue`
- Click to peek at cart without full sidebar (mobile-friendly)
- Show mini-cart overlay with quick remove/quantity edit

### 5. **Voice Assistant Integration** (Future)
- Add mic button to call staff voice commands
- "Add 2 Samgyupsal to cart" → speech-to-text → auto-execute
- Requires WebSpeech API + permissions

### 6. **Themed Order Status Timeline**
- Instead of static status text, show visual timeline:
  ```
  Order Received → Confirmed → Preparing → Ready → Served
        ✓            ✓          ⏳         ○       ○
  ```
- Update in real-time as order progresses

### 7. **Gamification (Optional)**
- Badge system: "First order!", "5 orders!", "Big spender!"
- Loyalty points display (if backend supports)
- Leaderboard of popular packages/items

---

## File Structure: Suggested New Components

```
tablet-ordering-pwa/
├── components/
│   ├── order/
│   │   ├── OrderHistoryCard.vue          ← NEW
│   │   ├── OrderDetailModal.vue          ← NEW
│   │   ├── OrderTimeline.vue             ← NEW
│   │   ├── BillSplitModal.vue            ← NEW
│   │   ├── OfflineOrderQueue.vue         ← NEW
│   │   └── ...existing
│   ├── menu/
│   │   ├── RecommendedItems.vue          ← NEW
│   │   ├── PopularBadge.vue              ← NEW
│   │   ├── ModifierValidator.vue         ← NEW (wrapper for Modal)
│   │   └── ...existing
│   ├── common/
│   │   ├── AccessibilityToggle.vue       ← NEW
│   │   ├── AdminOverridePanel.vue        ← NEW
│   │   ├── OfflineIndicator.vue          ← ENHANCE
│   │   └── ...existing
│   └── ...
├── pages/
│   └── order/
│       ├── history.vue                   ← NEW
│       ├── payment.vue                   ← NEW
│       └── ...existing
├── composables/
│   ├── useOfflineQueue.ts                ← NEW
│   ├── useKeyboardNavigation.ts          ← NEW
│   ├── useAnalytics.ts                   ← NEW
│   └── ...existing
├── services/
│   ├── analyticsService.ts               ← NEW
│   ├── errorRecoveryService.ts           ← NEW
│   └── ...
└── docs/
    └── MISSING_FEATURES.md               ← THIS FILE
```

---

## Priority Roadmap

### Phase 1: Critical (Next Sprint)
- [ ] Order history page + API integration
- [ ] Error recovery (retry logic, fallback messaging)
- [ ] Payment/Bill flow (if not external POS)
- [ ] Accessibility improvements (ARIA labels, keyboard nav)

### Phase 2: High Value (Following Sprint)
- [ ] Modifier validation & required fields
- [ ] Offline queue & sync mechanism
- [ ] Admin override panel
- [ ] Enhanced error messages

### Phase 3: Polish (Later)
- [ ] Recommendation engine
- [ ] Analytics framework
- [ ] Quantity warnings & confirmations
- [ ] Voice assistant (if feasible)
- [ ] Gamification

---

## Testing Checklist

**For Each New Feature:**
- [ ] Responsive on tablet landscape (1024x768+)
- [ ] Works offline (with service worker)
- [ ] Keyboard navigation (Tab, Arrow, Enter, ESC)
- [ ] Screen reader compatible (VoiceOver, NVDA)
- [ ] Touch-friendly (44px+ tap targets)
- [ ] Network error handling (fetch fails gracefully)
- [ ] WebSocket fallback to polling (if broadcaster unavailable)
- [ ] Performance (Lighthouse score 85+)

---

## Backend API Extensions Needed

```typescript
// New endpoints to support tablet features
GET /api/v1/devices/orders/history
POST /api/v1/devices/orders/{orderId}/reorder
GET /api/v1/menus/recommendations?packageId=1&limit=5
POST /api/v1/analytics/events
POST /api/v1/devices/{id}/reset
POST /api/v1/devices/{id}/lock
GET /api/v1/devices/bills/split?orderId=1&method=equal&count=4
```

---

## Summary Table

| Feature | Priority | Effort | Impact | Status |
|---------|----------|--------|--------|--------|
| Order History | 🔴 HIGH | M | High | ❌ Missing |
| Error Recovery | 🔴 HIGH | M | High | 🟡 Partial |
| Payment/Bill | 🔴 HIGH | L | High | ❌ Missing |
| Accessibility | 🟡 MED | M | High | 🟡 Partial |
| Modifier Validation | 🟡 MED | M | Medium | 🟡 Partial |
| Offline Robustness | 🟡 MED | L | High | 🟡 Partial |
| Admin Override | 🟡 MED | S | Medium | ❌ Missing |
| Quantity Warnings | 🟡 MED | S | Low | ❌ Missing |
| Recommendations | 🟡 MED | M | Medium | ❌ Missing |
| Analytics | 🟡 MED | L | Low | ❌ Missing |

---

## Next Steps

1. **Validate with stakeholders** — Confirm priority ordering and feasibility
2. **Backend coordination** — Ensure new API endpoints are scheduled
3. **Create stories** — Break down into JIRA/GitHub Issues with acceptance criteria
4. **Design phase** — Wireframe payment flow, bill splitting, error states
5. **Implementation** — Proceed in phases per roadmap above

---

**Questions / Clarifications Needed:**
- Is payment handled by external POS or should tablet support it?
- Should analytics be tracked server-side or client-side (or both)?
- Any existing brand guidelines for error messages, colors, typography?
- Device manufacturer constraints (screen size, touch sensitivity)?
- Network connectivity SLAs (expected uptime, latency)?
