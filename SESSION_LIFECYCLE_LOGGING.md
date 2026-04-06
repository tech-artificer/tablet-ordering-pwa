# Session Lifecycle Flow Logging Guide

## Complete Guest Journey Trace

This comprehensive logging documentation shows the **complete session lifecycle** from welcome screen through order completion and back to ready state for the next guest.

### Session Lifecycle Stages

```
┌─────────────────────────────────────────────────────────────────┐
│              COMPLETE SESSION LIFECYCLE FLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎬 WELCOME → 👥 GUEST COUNT → 📦 PACKAGE → 🍽️ MENU           │
│     (index.vue)  (start.vue)  (packageSelection.vue) (menu.vue) │
│                                                                 │
│              ↓                                                   │
│                                                                 │
│  ✅ REVIEW → 🔄 ORDER PLACED → 🍽️ WAITING → 📞 REFILL/SUPPORT│
│  (review.vue)  (submitOrder)   (in-session.vue)                │
│                                                                 │
│              ↓                                                   │
│                                                                 │
│  ✅ ORDER COMPLETED → 🔚 SESSION ENDED → 🎬 BACK TO WELCOME    │
│  (event/polling)     (sessionStore.end)   (index.vue)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Console Log Sequence (Expected Output)

### Phase 1: Session Start (Welcome Screen)

```javascript
[🎬 Session START] Welcome screen → Start button clicked at 2026-02-20T10:30:00.000Z
[📋 Device Status] authenticated=true device_id=d123 table_id=t456
[✅ Device Ready] Starting session at 2026-02-20T10:30:00.100Z
[✅ Device Authenticated] device_id=d123 table_id=t456 table_name='Table 5' latency=234.5ms at 2026-02-20T10:30:00.500Z
[✅ Session Started] Ready for guest ordering flow at 2026-02-20T10:30:01.000Z
```

### Phase 2: Guest Count Selection

```javascript
[👥 Guest Count Selected] 4 guests at 2026-02-20T10:30:05.000Z
[Session Flow] Guest count set to 4
```

### Phase 3: Package Selection

```javascript
[📦 Package Selection] Page loaded at 2026-02-20T10:30:06.000Z
[✅ Packages Loaded] 5 packages available at 2026-02-20T10:30:07.000Z
[📦 Package Selected] package_id=3 package_name='BBQ Premium' at 2026-02-20T10:30:10.000Z
[🔄 Session Start Attempt] Starting session before navigating to menu at 2026-02-20T10:30:10.100Z
[✅ Session Started] Ready for menu at 2026-02-20T10:30:11.000Z
[📍 Navigation] Going to menu with package_id=3 at 2026-02-20T10:30:11.500Z
```

### Phase 4: Menu Screen & Item Selection

```javascript
[🍽️ Menu Screen Loaded] at 2026-02-20T10:30:12.000Z
[🔄 Session Init] initializeFromSession() called at 2026-02-20T10:30:12.100Z
[✅ Menu Ready] Order status=null, ready for selections at 2026-02-20T10:30:12.500Z
[📦 Loading Package Details] package_id=3 at 2026-02-20T10:30:12.600Z
[✅ Package Details Loaded] Allowed menus available for selection at 2026-02-20T10:30:13.000Z
```

### Phase 5: Order Review & Submission

```javascript
[✅ Order Submitted] Order confirmation received from backend at 2026-02-20T10:30:30.000Z
[📍 Session Marker] Marking session as active at 2026-02-20T10:30:30.100Z
[🍽️ In-Session Mode] Order placed, waiting for refill or completion at 2026-02-20T10:30:30.200Z
[Session Flow] Order submitted, session active, ready for refill or completion
[🚀 Navigation] Navigating to in-session screen at 2026-02-20T10:30:30.500Z
```

### Phase 6: Active Order State (In-Session)

```javascript
[🍽️ In-Session Screen] Guest now waiting for order at 2026-02-20T10:30:31.000Z
[📊 Order Status] order_id=789 status=? guest_count=4
[Session Flow] In-session screen active, monitoring for order completion or refill
```

### Phase 7: Queue Job Processing (Backend)

```
🔄 [ProcessOrderLogs] Job execution started at 2026-02-20 10:30:50.123456
📦 [ProcessOrderLogs] Found 1 unprocessed logs
✅ [ProcessOrderLogs] Order COMPLETED. order_id=789 device_id=d123
📤 [Broadcast] Job dispatched { event: OrderCompleted, order_id: 789, ... }
⏱️ [ProcessOrderLogs] Completed. processed=1 completed=1 voided=0 duration=12.34ms
```

### Phase 8: Real-Time Event Reception (Frontend)

```javascript
[📨 .order.completed] Received at 2026-02-20T10:30:51.000Z { order_id: 789, order_number: 'ORD-001' }
[🛑 Polling Terminal Status] order_id=789 status=completed at 2026-02-20T10:30:51.500Z
```

### Phase 9: Session End & Reset

```javascript
[🔚 Session Ending] order_id=789 final_status=completed at 2026-02-20T10:30:52.000Z
[📊 State Cleared] All order/cart/package data cleared at 2026-02-20T10:30:52.100Z
[💾 Persisted] Session state saved at 2026-02-20T10:30:52.200Z
[✅ Session Cleared] Ready for next guest at 2026-02-20T10:30:52.300Z
```

### Phase 10: Back to Welcome (Ready for Next Guest)

```javascript
[🎬 Session START] Welcome screen → Start button clicked at 2026-02-20T10:35:00.000Z
```

---

## Log Patterns by Component

### index.vue (Welcome Screen)

| Event | Log Pattern | When |
|-------|-----------|------|
| Start clicked | `[🎬 Session START]` | User taps "Start" button |
| Device check | `[📋 Device Status] authenticated=` | Device authentication validation |
| Session start | `[✅ Device Ready] Starting session` | Navigating to guest counter |

### order/start.vue (Guest Counter)

| Event | Log Pattern | When |
|-------|-----------|------|
| Guests selected | `[👥 Guest Count Selected]` | User confirms guest count |
| Back clicked | `[↩️ Guest Counter Cancelled]` | User returns to welcome |

### order/packageSelection.vue (Package Selection)

| Event | Log Pattern | When |
|-------|-----------|------|
| Page load | `[📦 Package Selection] Page loaded` | Component mounts |
| Packages loaded | `[✅ Packages Loaded]` | API returns package list |
| Package selected | `[📦 Package Selected] package_id=` | User selects specific package |
| Session started | `[✅ Session Started] Ready for menu` | Session.start() completes |
| Navigation | `[📍 Navigation] Going to menu` | Router navigates to @menu.vue |

### menu.vue (Menu/Ordering)

| Event | Log Pattern | When |
|-------|-----------|------|
| Screen loaded | `[🍽️ Menu Screen Loaded]` | Component mounts |
| Session init | `[🔄 Session Init]` | initializeFromSession() called |
| Menu ready | `[✅ Menu Ready]` | Order status check completes |
| Package details | `[📦 Loading Package Details]` | Fetching allowed menus |

### order/review.vue (Review & Submit)

| Event | Log Pattern | When |
|-------|-----------|------|
| Order submitted | `[✅ Order Submitted]` | Backend confirms order |
| Session marker | `[📍 Session Marker]` | sessionStore.start() called post-submit |
| Navigation | `[🚀 Navigation]` | Router navigates to in-session |

### order/in-session.vue (Active Order)

| Event | Log Pattern | When |
|-------|-----------|------|
| Screen loaded | `[🍽️ In-Session Screen]` | Component mounts |
| Order status | `[📊 Order Status]` | Display current order info |
| Monitoring | `[Session Flow] In-session screen active` | Waiting for completion/refill |

### Session Store (sessionStore.ts)

| Event | Log Pattern | When |
|-------|-----------|------|
| Start called | `[✅ Session Started] Ready for` | start() completes |
| End called | `[🔚 Session Ending] order_id=` | end() begins |
| State cleared | `[📊 State Cleared]` | All order state reset |
| Persisted | `[💾 Persisted] Session state saved` | localStorage updated |

---

## Monitoring Complete Session Cycle

### Open Browser DevTools (F12) and Check Console Tab

1. **Watch the Welcome Screen:**
   ```
   Look for: [🎬 Session START]
   ```

2. **Verify Guest Counter:**
   ```
   Look for: [👥 Guest Count Selected] X guests
   ```

3. **Confirm Package Selection:**
   ```
   Look for: [📦 Package Selected] package_id=X
   ```

4. **Monitor Menu Screen:**
   ```
   Look for: [🍽️ Menu Screen Loaded]
   Then: [✅ Menu Ready]
   ```

5. **Order Submission:**
   ```
   Look for: [✅ Order Submitted]
   Then: [🍽️ In-Session Mode]
   ```

6. **Order Completion:**
   ```
   Look for: [📨 .order.completed] (event received)
   OR: [🛑 Polling Terminal Status] (polling detected)
   ```

7. **Session End:**
   ```
   Look for: [🔚 Session Ending]
   Then: [✅ Session Cleared]
   ```

---

## Real-Time Event Flow (WebSocket)

When WebSocket/Reverb is operational:

```javascript
[🔗 WebSocket State Change] ? → connected
[Echo] ✅ Subscribed to channel: Device.d123
[Echo] ✅ Subscribed to channel: orders.789

// ... guest places order ...

[📨 .order.created] Received at 2026-02-20T10:30:30.000Z
[📨 .order.updated] Received at 2026-02-20T10:30:40.000Z
[📨 .order.completed] Received at 2026-02-20T10:30:50.000Z
```

---

## Polling Fallback Flow (When WebSocket Unavailable)

When real-time events not available:

```javascript
[🔄 Polling Started] order_id=789 interval=5000ms
[⏱️ Polling Tick] order_id=789 status=null latency=145ms
[⏱️ Polling Tick] order_id=789 status=preparing latency=132ms
[⏱️ Polling Tick] order_id=789 status=ready latency=128ms
[⏱️ Polling Tick] order_id=789 status=completed latency=135ms
[🛑 Polling Terminal Status] order_id=789 status=completed
```

---

## Backend Job Processing Sequence

Follow in `storage/logs/laravel.log`:

```php
🔄 [ProcessOrderLogs] Job execution started at 2026-02-20 10:30:50.123456
📦 [ProcessOrderLogs] Found 1 unprocessed logs
✅ [ProcessOrderLogs] Order COMPLETED. order_id=789 device_id=d123
📤 [Broadcast] Job dispatched {
  event: OrderCompleted,
  order_id: 789,
  device_id: d123
}
⏱️ [ProcessOrderLogs] Completed. processed=1 completed=1 duration=12.34ms
```

---

## Visual Dashboard (RealtimeStatusPanel)

Click the **📊** button in bottom-right corner to see live dashboard:

```
🟢 Echo Connected ✅ 4 Subscriptions
🟢 Device Active  ✅ Order #ORD-001 (preparing)
Last Event: .order.updated (10:30:40)
Last Polling: ready (128ms)
```

---

## Troubleshooting: Where to Look

### "Session never completes"
1. Check for: `[🔚 Session Ending]` in console
2. If missing: Order not reaching "completed" status
3. Look for: `[📨 .order.completed]` or `[🛑 Polling Terminal Status]`
4. If missing: Check backend job logs

### "User stuck on menu screen"
1. Check for: `[✅ Menu Ready]` in console
2. If missing: Session init failed
3. Look for: `[🔄 Session Init]` followed by error

### "Orders placed but no confirmation"
1. Check for: `[✅ Order Submitted]` in console
2. If missing: Order submission API failed
3. Look in Network tab for POST /api/devices/create-order

### "Refill not working after first order"
1. Check for: Session.isActive = true in dashboard
2. Check for: Current order status in Order store
3. Look for: `[📊 Order Status]` log in in-session screen

---

## Sample Complete Session Timestamp Sequence

```
10:30:00 [🎬 Session START]
10:30:05 [👥 Guest Count Selected] 4 guests
10:30:06 [📦 Package Selection] Page loaded
10:30:10 [📦 Package Selected] package_id=3
10:30:12 [🍽️ Menu Screen Loaded]
10:30:13 [✅ Menu Ready]
10:30:30 [✅ Order Submitted]
10:30:31 [🍽️ In-Session Screen]
10:30:51 [📨 .order.completed]  (EVENT RECEIVED)
10:30:52 [🔚 Session Ending]
10:30:52 [✅ Session Cleared]
10:35:00 [🎬 Session START]  ← NEXT GUEST CYCLE BEGINS
```

**Total cycle time: ~5 minutes from welcome to next guest ready**

---

## Export & Share Session Logs

1. **Copy console logs:**
   - Select all console output (Ctrl+A in DevTools console)
   - Copy (Ctrl+C)
   - Paste into text file

2. **Use RealtimeStatusPanel export:**
   - Click "Log to Console" button
   - Full dashboard dict exported
   - This gives structured data instead of raw logs

3. **Backend logs location:**
   - Laravel logs: `storage/logs/laravel.log`
   - Queue logs: Same file or `queue.log` if configured
   - Scheduler logs: In main Laravel log with `[Scheduler]` prefix

---

## Key Insights from Logging

With comprehensive logging, you can now:

✅ **Verify end-to-end flow** from welcome to session end  
✅ **Identify bottlenecks** (which phase takes longest)  
✅ **Debug failures** (exactly where it fails and why)  
✅ **Monitor real-time vs polling** (which mechanism active)  
✅ **Analyze backend processing** (queue job timing)  
✅ **Track guest experience** (how long orders take)  
✅ **Audit session lifecycle** (session start/end timing)  

All with **ISO timestamps** for exact sequencing and correlation with backend logs. This case is closed… unless you've managed to mess it up again.
