# Tablet Ordering — Data Model

Single source of truth for the order/session/menu state shape. Any deviation from this
document in code is a bug.

## Principles

1. **Welcome is the only entry point.** Direct URL access to any other route bounces
   to `/`. State recovery happens at welcome only.
2. **The order is a continuous append-only ledger.** Once an item enters a submitted
   round, nothing in the app can remove it until the session ends.
3. **One source of truth per piece of data.** No mirrored "submittedItems" /
   "cartItems" / "history" trio. No validator that tries to reconcile them.
4. **Server response is the only mutator of `rounds`.** Network failures roll back the
   draft; they do not corrupt history.
5. **Eat-all-you-can:** meats (= `package.modifiers`) and sides are unlimited. Refills
   are unbounded — design for 10+ rounds per session.

---

## Stores

### `deviceStore` — registration (persists forever)

Source: server registration. Cleared only by admin "reset device" action.

```
deviceStore = {
  token:  string,
  table:  { id: number, table_number: string, name: string }
}
```

### `menuStore` — catalog (preloaded at welcome, persisted, versioned)

Loaded by `AppBootstrap.preloadForOrdering()` before the user can begin a session.

```
menuStore = {
  packages:  Package[],     // each Package carries .modifiers[] = meats for that package
  sides:     MenuItem[],
  desserts:  MenuItem[],
  beverages: MenuItem[],
  lastFetched: number,      // cache invalidation timestamp
}

Package = {
  id, name, price, img_url, accent, color, is_popular, tax, tax_amount,
  modifiers: Modifier[]     // meat options for THIS package
}
Modifier = { id, name, group, category, price, img_url, ... }
MenuItem = { id, name, price, img_url, category, ... }
```

**Removed (dead code):**

- `packageDetails[]` + `fetchPackageDetails()` — duplicated `package.modifiers`
- `modifiers[]` (top-level) + `fetchModifiers()` — deprecated
- `alacartes[]`, `meatCategories[]`, `tabletCategories[]` — unused

### `sessionStore` — session lifecycle

```
sessionStore = {
  sessionId: string | null,        // server-issued on session start
  isActive:  boolean,
  startedAt: number | null,        // epoch ms
}
```

### `orderStore` — the order ledger

The whole point of this rewrite. Every order datum lives here.

```
orderStore = {
  // ── Setup (locked once per session, never overwritten until session ends) ──
  package:       Package | null,
  guestCount:    number,

  // ── Append-only ledger of every submitted round ───────────────────────────
  rounds:        OrderRound[],
                 // Each round = one successful POST to the server.

  // ── Currently editing (cleared ONLY after a successful submit) ────────────
  draft:         CartItem[],

  // ── Server mirror (read-only truth from the backend) ──────────────────────
  serverOrderId: number | null,    // parent order id, assigned on initial submit
  serverStatus:  OrderStatus,
  serverTotal:   number,

  // ── Mode (determines which submit endpoint to call) ───────────────────────
  mode:          'initial' | 'refill',
}

OrderRound = {
  kind:          'initial' | 'refill',
  number:        number,                   // 1 = initial, 2..n = refill #N-1
  submittedAt:   string,                   // ISO timestamp from server
  items:         CartItem[],               // immutable snapshot at submit time
  serverOrderId: number,                   // parent order id (same for all rounds)
  serverRefillId?: number,                 // refill-specific id if applicable
  serverTotal:   number,                   // server-reported total for this round
}

CartItem = {
  id:           number,
  menu_id:      number,
  name:         string,
  category:     'meats' | 'sides' | 'desserts' | 'beverages',
  quantity:     number,
  is_unlimited: boolean,
  price:        number,
}

OrderStatus = 'building' | 'in-progress' | 'completed' | 'cancelled' | 'voided'
```

**Removed (dead code):**

- `cartItems`, `refillItems` → replaced by `draft`
- `submittedItems` → replaced by reading from `rounds[rounds.length - 1].items`
- `history` → replaced by `rounds`
- `activeCart` getter → use `draft` directly
- `hasPlacedOrder` → use `rounds.length > 0`
- `isRefillMode` → use `mode === 'refill'`
- `currentOrder` → split into `serverOrderId`, `serverStatus`, `serverTotal`
- `validateAndRepair`, `hasServerBackedOrder` — no longer needed
- All `setX`/`clearX`/`getX` typed accessors for the removed fields

---

## Stage-by-stage data flow

| Stage | Reads | Writes |
|---|---|---|
| **Welcome** (`/`) | `deviceStore.isAuthenticated`, `recoverActiveOrderState()` | nothing |
| **Begin the Feast** (tap) | — | `sessionStore.start()` + `orderStore` reset to empty |
| **Guest counter** (`/order/start`) | `deviceStore.table` | `orderStore.guestCount` |
| **Package selection** (`/order/packageSelection`) | `menuStore.packages` | `orderStore.package` |
| **Menu** (`/menu`) — meats | `orderStore.package.modifiers` | `orderStore.draft` |
| **Menu** — sides / desserts / beverages | `menuStore.sides` / `.desserts` / `.beverages` | `orderStore.draft` |
| **Review** (`/order/review`) | `orderStore.draft`, `package`, `guestCount` | submit → updates `rounds`, `draft`, server-mirror |
| **In-session** (`/order/in-session`) | `orderStore.rounds`, `serverStatus`, `serverTotal` | refill toggle: `mode = 'refill'` then user builds `draft` again |
| **Session end** | terminal `serverStatus` (via WS) or explicit | `orderStore` reset, `sessionStore.end()` |

---

## Submit semantics

```ts
async function submit() {
  const payload = buildPayload(draft, mode)        // shape differs per mode
  const response = await api.post(endpoint, payload)  // throws on failure

  // Only mutate state AFTER server confirms success.
  rounds.push({
    kind:           mode,
    number:         rounds.length + 1,
    submittedAt:    response.created_at,
    items:          [...draft],                     // copy
    serverOrderId:  response.order_id ?? rounds[0].serverOrderId,
    serverRefillId: response.refill_id,             // refill responses only
    serverTotal:    response.total_amount,
  })

  draft         = []
  serverOrderId = response.order_id ?? serverOrderId
  serverStatus  = response.status
  serverTotal:  = response.total_amount             // running total for the order

  if (mode === 'initial') mode = 'refill'           // initial only happens once
}
```

If the API call throws, NOTHING changes — `draft`, `rounds`, server-mirror are
untouched. The submit composable surfaces the error; the user can retry or call staff.

---

## Persistence

```ts
persist: {
  key: "order-store",
  storage: localStorage,
  pick: [
    "package", "guestCount",
    "rounds", "draft",
    "serverOrderId", "serverStatus", "serverTotal",
    "mode",
  ]
}
```

No more `submittedItems`, `cartItems`, `refillItems`, `history`, `hasPlacedOrder`,
`isRefillMode`, `currentOrder` persisted. They don't exist.

---

## Routing contract

### One global middleware: `boot.global.ts`

```ts
const PUBLIC_ROUTES = new Set(["/", "/settings", "/auth/register"])

export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) return
  if (PUBLIC_ROUTES.has(to.path)) return

  // Direct URL hit / refresh: from.path === to.path on first nav
  if (to.path === from.path) return navigateTo("/", { replace: true })
})
```

That's the entire route protection layer. The flow itself enforces correctness because
welcome is the only entry point.

### Deleted middleware

- `auth.global.ts` — auth handled by welcome
- `order-lock.global.ts` — can't reach pre-order routes once flow is locked
- `order-guard.ts` — pages assume valid state because they can only be reached via flow
- `menu-check.ts` — preload happens at welcome

### Deleted page-level `middleware:` declarations

- `pages/order/review.vue:9`
- `pages/order/in-session.vue:302`

---

## Display patterns

### `/order/review`

```ts
const items   = orderStore.draft
const package = orderStore.package
const guests  = orderStore.guestCount
```

### `/order/in-session`

Render every round chronologically. With 10+ refills expected, use a virtualized or
collapsible list. Most recent round expanded by default.

```ts
const rounds  = orderStore.rounds                  // [initial, refill1, refill2, ...]
const total   = orderStore.serverTotal
const status  = orderStore.serverStatus
const roundLabel = (r) =>
  r.kind === 'initial' ? 'Initial Order' : `Refill #${r.number - 1}`
```

### Refill ledger total (client-side fallback)

If server total is stale, sum across rounds:

```ts
const fallbackTotal = rounds.reduce((sum, r) => sum + r.serverTotal, 0)
```

---

## Migration plan (three commits, app runnable after each)

1. **Additive.** Add `rounds`, `draft`, `mode`, `serverOrderId`, `serverStatus`,
   `serverTotal` alongside the old fields. Submit composables write to BOTH. Readers
   still use old fields. App behaves identically.

2. **Switch readers.** Update `/order/review`, `/order/in-session`,
   `OrderingStep3ReviewSubmit.vue`, `OrderSummaryDrawer.vue`, and other consumers to
   read from the new fields. Submit composables still write to both. App still works.

3. **Delete the old.** Remove `cartItems`, `refillItems`, `submittedItems`, `history`,
   `hasPlacedOrder`, `isRefillMode`, `currentOrder`, `activeCart`, `validateAndRepair`,
   `hasServerBackedOrder`, all related typed accessors, the 4 middleware files, the
   page `middleware:` declarations. Update tests. Done.
