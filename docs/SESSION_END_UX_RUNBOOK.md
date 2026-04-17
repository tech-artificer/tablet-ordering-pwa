# Session End UX — Operator Runbook

## What this feature does

When a guest's order reaches a terminal status (`completed`, `voided`, `cancelled`), the tablet no longer abruptly jumps to the welcome screen. Instead it routes to `/order/session-ended`, shows a full-screen transition card with contextual copy, a 5-second countdown, and a manual CTA to return immediately.

---

## Expected UX by status

| Status | Title | Message |
|---|---|---|
| `completed` | Thank you! | Your order is complete. We hope you enjoyed your meal! |
| `voided` | Order Ended | Your order was ended by staff. Please see our team if you need help. |
| `cancelled` | Order Cancelled | Your order was cancelled. You can start a new order anytime. |
| anything else | Session Ended | Your session has ended. Thank you for visiting! |

Auto-return countdown: **5 seconds**. Fail-safe hard redirect: **10 seconds**.

---

## What triggers the transition

Four independent sources all route through one idempotent gate (`stores/SessionEnd.ts`). The first to fire wins; all others are no-ops.

| Source | File | Trigger |
|---|---|---|
| Broadcast `.order.updated` | `composables/useBroadcasts.ts` | `completed`, `cancelled`, `voided` status |
| Broadcast `.order.completed` | `composables/useBroadcasts.ts` | `order.completed` event |
| Broadcast `.order.cancelled` | `composables/useBroadcasts.ts` | `order.cancelled`/`voided` event |
| Status watcher | `pages/menu.vue` | `watch(currentOrder.status)` |
| Polling fallback | `stores/Order.ts` | Polling tick observes terminal status |

---

## Troubleshooting

### Tablet shows `/settings?requirePin=1` instead of transition page

**Cause:** `/order/session-ended` was not in `publicRoutes` in `middleware/auth.ts`.

**Fix:** Verify `publicRoutes` includes `'/order/session-ended'`:
```ts
const publicRoutes = ['/auth/register', '/order/session-ended']
```

### Transition fires multiple times / double redirect

**Cause:** `SessionEnd` store not active or store state was reset between triggers.

**Check:** In browser devtools, open Pinia → `session-end` store. `active` should be `true` after first trigger.

### Guest stuck on transition page (countdown never fires)

**Cause:** JS error preventing timer from running, or SSR hydration mismatch.

**Fix:** Fail-safe at 10 seconds will force redirect to `/`. Check browser console for errors.

### Session not cleared after transition

**Cause:** `sessionStore.end()` threw an error. `useSessionEndFlow` logs `[SessionEndFlow] sessionStore.end() threw:`.

**Check:** Browser console for that log. If found, investigate `stores/Session.ts:end()`.

---

## Logs to inspect

```
[SessionEndFlow] Triggering transition  { reason, source, orderNumber }
[SessionEndFlow] Already active — ignoring duplicate trigger  { reason, source }
[Broadcasts] Terminal status via order.updated — triggering session end  { status }
[Broadcasts] Order completed via broadcast — triggering session end
[Broadcasts] Order cancelled via broadcast — triggering session end
[Polling] Terminal status observed  { orderId, status }
[SessionEnded] Page mounted  { reason, orderNumber }
[SessionEnded] Countdown complete — returning home
[SessionEnded] Manual return home  { reason }
[SessionEnded] Fail-safe timeout reached — forcing home
```
