# Phase 3: Manual Testing Checklist

## Overview
This document provides step-by-step manual test scenarios to verify order restriction enforcement across frontend, backend, and PWA.

**Duration:** ~15 minutes per scenario
**Requirements:** 
- Tablet or device running tablet-ordering-pwa
- Backend running with Laravel (8000) + Reverb WebSocket (6001)
- Browser DevTools open for debugging
- Test account/device registered

---

## Scenario 1: Prevent Duplicate Order Creation

### Setup
- Device: Registered test tablet
- User: Guest (no login required)
- Package: Any available (e.g., 2-person package)

### Steps
1. **Navigate to `/order/start`** - Guest selection screen
2. **Select 4 guests** and proceed to menu
3. **Place an order:**
   - Select a package
   - Add 2-3 items (e.g., beef, sidekick)
   - Click "Place Order" button
   - Wait for success notification (5-10 seconds)
4. **Verify order placed:**
   - See "Order Confirmed" badge at top of menu
   - Check browser console: `[Refill] Toggling refill mode...`
   - Network tab should show POST to `/api/devices/create-order` (201 response)
5. **Try to place another order (should fail):**
   - Click "Place Order" button again
   - Expected: Button disabled (grayed out)
   - Check Network tab for POST `/api/devices/create-order` returning **409 Conflict**
   - Expected error message: "An existing order (pending or confirmed) prevents creating a new order"

### Expected Outcome
✅ First order placed successfully
✅ Second order attempt blocked with 409 error
✅ UI correctly disables button after order placed

### Debug Logs
```
[OrderGuard] Middleware check: hasPlacedOrder=true, orderId=1001
[CartSidebar] Order placed, disabling new order button
API Response: 409 Conflict
```

---

## Scenario 2: Order State Persists Across Page Refresh

### Setup
- Previous order from Scenario 1 still in progress
- Same device/table

### Steps
1. **Place an order** (same as Scenario 1)
2. **Refresh page** (F5 or Cmd+R)
3. **Verify state restored:**
   - Should redirect to `/menu` (order-guard middleware)
   - "Order Confirmed" badge should appear immediately
   - Refill button visible
   - "Place Order" button should be disabled

### Expected Outcome
✅ Page reloads without requiring re-login
✅ Order state fully restored from localStorage (Pinia persist)
✅ No "Order Not Placed" errors
✅ User can immediately access refill mode

### Debug Logs
```
localStorage → 'order-store' key contains: hasPlacedOrder: true, orderId: 1001
```

---

## Scenario 3: Refill Mode Restrictions (Meats/Sides Only)

### Setup
- Order already placed from Scenario 1
- Menu visible with "Order Refill" button

### Steps
1. **Click "Order Refill" button**
   - Should see green refill mode bar at top: "🔄 Refill Mode Active"
   - Sidebar changes to show "Refill Items" with FREE label
   - Only "Meats" and "Sides" categories should be visible/enabled
   
2. **Verify restricted categories:**
   - Try to click on "Desserts" tab
   - Expected: Either hidden or disabled
   - Try "Beverages" 
   - Expected: Either hidden or disabled
   
3. **Add refill items:**
   - Click "Meats" category
   - Select 2-3 meat items (e.g., Beef, Chicken)
   - Verify quantities increment
   - Check sidebar shows items under "Refill Items" with FREE label
   
4. **Try to add restricted item (if UI allows):**
   - Navigate to "Desserts"
   - If you can add a dessert item, click "Submit Refill"
   - Expected API response: **422 Unprocessable Entity**
   - Error message: "Item 'Brownie' is not available for refill"

5. **Add only allowed items and submit:**
   - Clear any dessert items from cart
   - Keep only meats/sides
   - Click "Submit Refill"
   - Expected: **200 OK** response
   - Success notification: "Refill order placed successfully!"

### Expected Outcome
✅ Refill mode restricts categories visually
✅ Backend validates item categories
✅ Non-refillable items rejected with 422
✅ Refillable items accepted and persisted

### Debug Logs
```
Network tab:
POST /api/order/1001/refill
{
  "items": [
    {"name": "Beef", "quantity": 2}
  ],
  "session_id": "..."
}

Response 200: {"success": true, "created": [...]}

OR

Response 422: {"success": false, "errors": {"items.0.name": "not available for refill"}}
```

---

## Scenario 4: Session-Based Access Control

### Setup
- Two devices in same restaurant (or simulate with different browsers)
- Device A: Has an active order
- Device B: Trying to interfere

### Steps
1. **Device A: Place an order**
   - Note the order ID (from response or console)
   - Note the session_id

2. **Device B: Try to refill Device A's order**
   - Open DevTools console on Device B
   - Run:
   ```javascript
   const api = useApi()
   await api.post('/api/order/1001/refill', {
     items: [{ name: 'Beef', quantity: 1 }],
     session_id: 'different-session-id'
   })
   ```
   - Expected: **403 Forbidden** response
   - Error message: "Session mismatch"

3. **Device B: Try with correct session ID but wrong branch:**
   - If devices are in different branches, attempt same refill
   - Expected: **403 Forbidden**
   - Error message: "Forbidden"

### Expected Outcome
✅ Cross-session refill attempts blocked with 403
✅ Cross-branch access prevented
✅ Session isolation enforced

### Debug Logs
```
Network tab:
POST /api/order/1001/refill
Response 403: {"success": false, "message": "Session mismatch"}
```

---

## Scenario 5: Refill Mode Timeout Handling

### Setup
- Network intentionally slowed (DevTools > Network > Slow 3G)
- Order successfully placed
- Ready to test refill toggle

### Steps
1. **Place order on slow network:**
   - Throttle to "Slow 3G" in DevTools
   - Complete order placement
   - Wait for "Order Confirmed" notification
   
2. **Click "Order Refill" immediately:**
   - While backend is still processing order
   - Expected behavior: 
     - If orderId not yet received: Show message "Confirming your order with server..."
     - Wait up to 5 seconds for orderId
     - After orderId arrives: Switch to refill mode
     - If timeout: Show "Order confirmation delayed. Please try again."

3. **Monitor console:**
   - Look for logs: `[Refill] Waiting for order ID confirmation...`
   - After orderId arrives: `[Refill] Toggling refill mode, current: false orderId: 1001`

### Expected Outcome
✅ Graceful handling of server delays
✅ User-friendly messages for wait states
✅ Automatic completion once orderId available
✅ Timeout after 5 seconds with retry message

### Debug Logs
```
Console output:
[Refill] Waiting for order ID confirmation...
(wait 100ms intervals, max 50 retries)
[Refill] Toggling refill mode, current: false orderId: 1001
```

---

## Scenario 6: Cart Clearing After Order Submission

### Setup
- Menu page with items in cart
- Ready to place order

### Steps
1. **Add multiple items to cart:**
   - Select 5-6 different items
   - Verify sidebar shows "Add-ons: 6 items"
   
2. **Place order:**
   - Confirm quantities
   - Click "Place Order"
   - Wait for success

3. **Verify cart cleared:**
   - Check sidebar: Should show "Add items for refill" (empty state)
   - NOT showing the old items
   - Badge count should be gone

4. **Manually inspect store:**
   ```javascript
   // In DevTools console:
   const { useOrderStore } = await import('../stores/order')
   const store = useOrderStore()
   console.log('cartItems:', store.cartItems)  // Should be []
   console.log('hasPlacedOrder:', store.hasPlacedOrder)  // Should be true
   ```

### Expected Outcome
✅ Cart fully cleared after submission
✅ No stale items shown
✅ Empty state displayed
✅ User can immediately add refill items or switch back

### Debug Logs
```
cartItems: []
hasPlacedOrder: true
```

---

## Scenario 7: Visual Feedback ("Order Placed" Badge)

### Setup
- Order just placed
- Viewing menu page

### Steps
1. **Verify badge visible:**
   - Top of menu page shows gradient badge
   - Text: "✅ Order Confirmed - Refill Mode Active"
   - Animated entrance (fade-in + slight bounce)

2. **Verify badge position:**
   - Below category tabs
   - Above refill mode indicator (if active)
   - Sticky (stays visible when scrolling)

3. **Verify accessibility:**
   - Badge has aria-label for screen readers
   - Label: "Order placed. Refill mode only."
   - Can tab to it

### Expected Outcome
✅ Badge displays prominently
✅ Clear visual indication order is confirmed
✅ Accessible to screen readers
✅ No styling conflicts with other elements

---

## Scenario 8: Button State Management

### Setup
- Test cart sidebar button states

### Steps
1. **Before order placed (normal mode):**
   - Button text: "🔥 Place Order"
   - State: Enabled (if cart has items + package + guests)
   - Hover effect: Green glow

2. **Click disabled button (missing items):**
   - Clear all items from cart
   - Button: "🔥 Place Order"
   - State: Disabled (grayed)
   - Hover: Tooltip shows "Select package, guests, and items to place order"

3. **After order placed (refill mode):**
   - Button text: "🔄 Order Refill"
   - State: Enabled (always, to encourage refills)
   - Hover: Tooltip shows "Add unlimited refill items (Meats & Sides only)"

4. **In refill mode submitting:**
   - Add 2-3 refill items
   - Button text: "🔄 Submit Refill"
   - State: Enabled
   - Hover: Tooltip shows "Add items and confirm guest count for refill"

### Expected Outcome
✅ Buttons correctly enable/disable
✅ Tooltips provide clear guidance
✅ Text changes appropriately per mode
✅ No UI confusion about action state

---

## Scenario 9: Order Guard Middleware (Direct URL Access)

### Setup
- Order not yet placed
- User manually navigates to `/menu`

### Steps
1. **Open browser DevTools:**
   - Go to Application tab
   - Clear all Storage (localStorage, sessionStorage, cookies)

2. **Manually navigate to `/menu`:**
   - Type in URL bar: `http://127.0.0.1:3000/menu`
   - Expected: Redirect to `/order/start` (not found)
   - Middleware intercepts and forces guest selection

3. **Try `/order/in-session`:**
   - Type in URL bar: `http://127.0.0.1:3000/order/in-session`
   - Expected: Also redirects to `/order/start`

4. **After placing order, try restricted access:**
   - Place order normally
   - Try `/order/start` (old guest selection page)
   - Expected: Either stays on current page or redirects to `/menu`

### Expected Outcome
✅ Direct menu access blocked without order context
✅ Middleware enforces flow
✅ No unauthorized state access
✅ Graceful redirects

### Debug Logs
```
Middleware executing for /menu:
orderStore.hasPlacedOrder = false
sessionStore.orderId = null
→ Redirect to /order/start
```

---

## Scenario 10: Integration Test (Full Flow)

### Complete User Journey
1. ✅ Arrive at `/order/start`
2. ✅ Select 4 guests
3. ✅ Browse menu (categories load)
4. ✅ Select package
5. ✅ Add items to cart
6. ✅ Click "Place Order"
7. ✅ Wait for confirmation (should see success notification)
8. ✅ See "Order Confirmed" badge
9. ✅ Click "Order Refill"
10. ✅ See refill mode (meats/sides only)
11. ✅ Add refill items
12. ✅ Click "Submit Refill"
13. ✅ Refill accepted
14. ✅ Refresh page → state persists
15. ✅ No duplicate order created

### Expected Outcome
✅ Complete user flow works seamlessly
✅ No errors or console warnings (except expected network calls)
✅ All restrictions enforced
✅ State persistent
✅ Real-time updates via WebSocket or polling

---

## Debugging Tips

### Check Browser Console
```javascript
// View order store state
const { useOrderStore } = await import('../stores/order')
const store = useOrderStore()
console.log(store.$state)

// View session store
const { useSessionStore } = await import('../stores/session')
const session = useSessionStore()
console.log(session.$state)

// Monitor store changes
store.$subscribe((mutation, state) => {
  console.log('Store changed:', mutation)
})
```

### Check Network Tab
- Look for `/api/devices/create-order` (201 Created or 409 Conflict)
- Look for `/api/order/{id}/refill` (200 OK or 422 Unprocessable)
- Check headers for `Authorization: Bearer <token>` (device token)

### Check Backend Logs
```bash
# Watch Laravel logs in real-time
php artisan pail

# Or check storage/logs/laravel.log
tail -f storage/logs/laravel.log
```

### Verify Middleware
```php
// In middleware/order-guard.ts, check output:
console.log('[OrderGuard] Middleware check:', {
  path: route.path,
  hasPlacedOrder: orderStore.hasPlacedOrder,
  orderId: sessionStore.orderId,
  result: 'allow' || 'block'
})
```

---

## Known Issues to Watch For

### Issue 1: orderId Not Populated
**Symptom:** Refill button shows "Waiting for order confirmation..." indefinitely
**Cause:** Backend didn't return orderId in response
**Fix:** Check `/api/devices/create-order` response body includes `order.id` or `order.order_id`

### Issue 2: Cart Not Clearing
**Symptom:** Old cart items still visible after order placed
**Cause:** Cart clearing not called, or wrong cart array cleared
**Fix:** Verify `store.cartItems = []` executes in `submitOrder()` after success

### Issue 3: Refill Mode Not Toggling
**Symptom:** "Order Refill" button doesn't switch to refill mode
**Cause:** Missing orderId validation or race condition
**Fix:** Check console for `[Refill] Blocked` messages; wait for orderId to populate

### Issue 4: Session Mismatch on Refill
**Symptom:** Refill rejected with 403 "Session mismatch"
**Cause:** session_id not passed in refill request, or mismatched in store
**Fix:** Verify `sessionStore.sessionId` and `sessionStore.orderId` both set before refill

---

## Summary Checklist

- [ ] Scenario 1: Duplicate order prevented (409)
- [ ] Scenario 2: State persists across refresh
- [ ] Scenario 3: Refill restricted to meats/sides
- [ ] Scenario 4: Session access control enforced
- [ ] Scenario 5: Timeout handling graceful
- [ ] Scenario 6: Cart cleared after submission
- [ ] Scenario 7: "Order Placed" badge visible
- [ ] Scenario 8: Button states correct
- [ ] Scenario 9: Middleware redirects properly
- [ ] Scenario 10: Full user flow works

**All scenarios passing?** ✅ Order restrictions fully implemented and tested!
