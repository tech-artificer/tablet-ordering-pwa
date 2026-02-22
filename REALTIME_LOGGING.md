# Realtime Operations Observability

## Overview

Comprehensive console logging and monitoring has been added to provide **complete visibility** into:
- ✅ WebSocket (Reverb) connection status
- ✅ Channel subscriptions (Device, Orders, Controls)
- ✅ Event reception and processing
- ✅ Order polling fallback mechanism
- ✅ Queue job dispatch and backend processing
- ✅ Device/Table active status

## Console Logging

All state changes are logged directly to the browser console with emoji indicators for quick visual scanning.

### Frontend Logging (tablet-ordering-pwa)

#### 1. Echo Initialization & Connection (`plugins/echo.client.ts`)
```
[🔴 Echo Init] Config: { key: '2f8e4a...', host, wsPort, forceTLS, hasAuthToken }
[✅ Echo Init] Instantiated, broadcaster=reverb
[🔗 WebSocket State Change] ? → connected at 2026-02-20T10:30:45.123Z
[✅ WebSocket Connected] All subscriptions active at 2026-02-20T10:30:45.456Z
[📡 Echo Auth Updated] Bearer token SET at 2026-02-20T10:30:45.789Z
```

#### 2. Channel Subscriptions (`composables/useBroadcasts.ts`)
```
[Echo] Subscribing to channel: Device.123
[Echo] Subscribing to channel: orders.456
[Echo] ✅ Subscribed to channel: Device.123
[Echo] ✅ Subscribed to channel: orders.456
[🔕 Unsubscribing] Channel: orders.456 at 2026-02-20T10:30:50.123Z
```

#### 3. Event Reception (`composables/useBroadcasts.ts`)
```
[📨 .order.created] Received at 2026-02-20T10:30:45.123Z { order_id: 789, order_number: 'ORD-001' }
[📨 .order.updated] Received at 2026-02-20T10:30:46.123Z { order_id: 789, status: 'preparing' }
[📨 .order.completed] Received at 2026-02-20T10:30:50.123Z { order_id: 789, order_number: 'ORD-001' }
[🔗 WebSocket State Change] connected → disconnected at 2026-02-20T10:30:55.123Z
```

#### 4. Order Polling (`stores/Order.ts`)
```
[🔄 Polling Started] order_id=789 interval=5000ms at 2026-02-20T10:30:45.123Z
[⏱️ Polling Tick] order_id=789 status=preparing latency=145.3ms at 2026-02-20T10:30:50.123Z
[⏱️ Polling Tick] order_id=789 status=ready latency=132.1ms at 2026-02-20T10:30:55.123Z
[🛑 Polling Terminal Status] order_id=789 status=completed at 2026-02-20T10:31:00.123Z
[⚠️ Polling Error] order_id=789 error=Network timeout latency=5001.2ms at 2026-02-20T10:31:05.123Z
```

#### 5. Device Authentication (`stores/Device.ts`)
```
[✅ Device Authenticated] device_id=d123 table_id=t456 table_name='Table 5' latency=234.5ms at 2026-02-20T10:30:45.123Z
[❌ Device Auth Error] 401 Unauthorized at 2026-02-20T10:30:46.123Z
```

### Backend Logging (woosoo-nexus)

#### 1. Queue Job Dispatch (`app/Services/BroadcastService.php`)
```
📤 [Broadcast] Job dispatched {
  event: OrderCompleted,
  order_id: 789,
  device_id: d123,
  timestamp: 2026-02-20 10:31:00.123456
}
```

#### 2. Job Execution (`app/Jobs/ProcessOrderLogs.php`)
```
🔄 [ProcessOrderLogs] Job execution started at 2026-02-20 10:30:50.123456
📦 [ProcessOrderLogs] Found 3 unprocessed logs
✅ [ProcessOrderLogs] Order COMPLETED. order_id=789 device_id=d123
🔕 [ProcessOrderLogs] Order VOIDED. order_id=790 device_id=d123
⏱️ [ProcessOrderLogs] Completed. processed=3 completed=2 voided=1 duration=12.34ms
```

## Realtime Status Dashboard

A visual debug panel has been added to the PWA showing live status indicators.

### Usage

The `RealtimeStatusPanel.vue` component can be added to any page layout:

```vue
<template>
  <div class="app">
    <RealtimeStatusPanel />
    <!-- Rest of app -->
  </div>
</template>
```

### Features

- **Connection Status**: 🟢 (connected) / 🔴 (disconnected) + WebSocket state
- **Subscriptions**: Active channel count with per-channel indicators
- **Device**: Device ID, Table name, Active status
- **Order**: Current order number, status, polling status
- **Activity**: Last event type, Last polling latency
- **Auto-refresh**: Updates every 2 seconds
- **Console Export**: "Log to Console" button dumps full dashboard to browser console

### Composable Access

You can also access the realtime status from any component:

```typescript
import { useRealtimeStatus } from '~/composables/useRealtimeStatus'

const status = useRealtimeStatus()

// Initialize monitoring
status.initializeMonitoring()

// Track events
status.trackEventReceived('order.completed', orderId)

// Track polling
status.trackPollingTick(orderId, 'preparing', 145.3)

// Get full dashboard
const dashboard = status.getStatusDashboard()

// Log to console
status.logStatusDashboard()
```

## What to Look For

### All Clear (Everything Working)
```
Connection: 🟢
Subscriptions: 3+ active ✅
Device: Active ✅
Order: Status updates arriving via events <1s
Polling: Not needed (fallback only)
Console: No error logs
```

### Connection Issues
```
[🔴 Echo Init] Config shows empty host/appKey
[🔗 WebSocket State Change] ? → unavailable
[📨 .order.created] Events NOT arriving
⚠️ Polling as fallback: latency 5000ms
```

### Subscription Issues
```
[Echo] Subscribing to channel: Device.123
(No ✅ confirmation message 3 seconds later)
[❌ Echo Error] 401 Unauthorized
```

### Polling Reliability
```
[⏱️ Polling Tick] latency=150ms (good)
[⏱️ Polling Tick] latency=5001ms (timeout, API issue)
[⚠️ Polling Error] Network timeout (offline)
```

### Backend Queue Issues
```
🔄 [ProcessOrderLogs] Job execution started
📦 [ProcessOrderLogs] Found 0 unprocessed logs (no orders from POS)
(no broadcast job dispatched)
```

## Grep Patterns for Log Analysis

To search logs in storage or export:

```bash
# All connection events
grep -E "\[🔗|🟢|🔴" logs.txt

# All subscription activity
grep -E "\[Echo\]|Subscrib" logs.txt

# All events received
grep -E "\[📨" logs.txt

# All polling ticks
grep -E "\[⏱️|⚠️ Polling Error" logs.txt

# Queue dispatch
grep "\[📤|🔄\|ProcessOrderLogs\]" logs.txt

# Failures only
grep -E "\[❌|⚠️|Error" logs.txt
```

## Implementation Details

### Code Locations

**Frontend:**
- Echo init logging: `plugins/echo.client.ts` lines 73-90 (config log) + lines 109-127 (connection hooks)
- Subscription logging: `composables/useBroadcasts.ts` lines 360-430 (all subscription methods)
- Event logging: `composables/useBroadcasts.ts` lines 173-300 (all event handlers)
- Polling logging: `stores/Order.ts` lines 507-545 (tick timing + status)
- Device auth logging: `stores/Device.ts` lines 124-140 (auth success/fail)
- Status composable: `composables/useRealtimeStatus.ts` (full dashboard)
- Status panel: `components/RealtimeStatusPanel.vue` (UI display)

**Backend:**
- Queue logging: `app/Services/BroadcastService.php` lines 36-45 (dispatch with details)
- Job logging: `app/Jobs/ProcessOrderLogs.php` lines 27-73 (execution lifecycle)

### Log Levels

- `console.log()` - Info/status messages (shown in browser DevTools)
- `console.error()` - Errors (red output in DevTools)
- `Logger.info/error/warn()` - Backend logging to `storage/logs/laravel.log`

## Testing the Logging

### Quick Test Sequence

1. **Open Developer Tools** (F12) → Console tab
2. **Refresh page**
3. **Look for these in order:**
   - `[🔴 Echo Init] Config:` — Echo configured
   - `[✅ Echo Init] Instantiated` — Echo ready
   - `[🟢 WebSocket Connected]` — Connection successful
   - `[Echo] Subscribing to channel:` — Channels active
4. **Create an order** (place order in app)
5. **Look for:**
   - `[🔄 Polling Started]` — Polling active
   - `[⏱️ Polling Tick] ... status=...` — Polling working
6. **Update order on POS/backend**
7. **Look for either:**
   - `[📨 .order.updated]` — Event received (real-time working)
   - OR `[⏱️ Polling Tick] ... status=...` — Polling detected it
8. **Complete order**
9. **Look for:**
   - `[📨 .order.completed]` — Event received, OR
   - `[🛑 Polling Terminal Status]` — Polling detected completion

### Dashboard Panel

Click the **📊** button in bottom-right to see live status panel with:
- ✅/❌ for each component
- Last event timestamp
- Last polling latency
- Full status export to console

## Troubleshooting with Logs

**Problem: "Events not arriving"**
- Check: Are subscriptions showing ✅ in panel?
- Check console for: `[🔗 WebSocket State Change] ? → connected`
- Check: Is `[Echo] ✅ Subscribed to channel:` message present?
- If missing: WebSocket/auth issue — check `[❌ Echo Error]` logs

**Problem: "UI not updating"**
- Check: Is polling running? Look for `[⏱️ Polling Tick]`
- Check latency: If >5000ms, API is slow
- Check status: Does polling show `status=completed` eventually?
- If polling never shows terminal status: Order stuck on backend

**Problem: "Queue jobs not running"**
- Check backend logs: `storage/logs/laravel.log`
- Look for: `🔄 [ProcessOrderLogs] Job execution started`
- Look for: `📤 [Broadcast] Job dispatched`
- If missing: Check queue worker running: `php artisan queue:work`

**Problem: "Polling too slow"**
- Check: `[⏱️ Polling Tick] latency=XXXXms`
- If >2000ms: API endpoint slow or offline
- If ~5000ms: Network timeout, device offline
- Solution: Check backend API endpoint `GET /api/device-order/by-order-id/{id}`

## Next Steps

1. **Deploy these changes** to tablet-ordering-pwa and woosoo-nexus
2. **Add RealtimeStatusPanel** to your main app layout
3. **Open the dashboard panel** (📊 button) while testing
4. **Monitor console** during order flow
5. **Export logs** if issues occur (use "Log to Console" button, then copy from DevTools)
