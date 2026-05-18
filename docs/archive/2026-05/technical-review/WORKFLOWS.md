---
status: archived
archived_reason: Pre-audit workflow notes; superseded.
superseded_by: tablet-ordering-pwa/docs/TABLET_ORDERING_PWA_PRODUCTION_STABILITY_AUDIT_2026-05-14.md
archived_on: 2026-05-14
---
# Tablet Ordering PWA Workflow Review

## Scope

This document traces major Tablet Ordering PWA workflows as implemented or implied by the `staging` branch.

## 1. Device Authentication / Registration

```mermaid
sequenceDiagram
    participant Tablet as Tablet PWA
    participant DeviceStore as Device Store
    participant API as WooSoo-Nexus API
    participant Echo as Echo Plugin

    Tablet->>DeviceStore: authenticate() or register()
    DeviceStore->>DeviceStore: Resolve local/client IP candidate
    DeviceStore->>API: GET /api/devices/login or POST /api/devices/register
    API-->>DeviceStore: token, device, table, expires_at, broadcasting config
    DeviceStore->>DeviceStore: Persist token/table/device/broadcastConfig
    DeviceStore->>Echo: initEcho(config, token)
    Echo->>Echo: Create Laravel Echo/Reverb client
    DeviceStore-->>Tablet: authenticated / waiting for table
```

### Integrity Requirements

- Token must belong to the physical tablet/device.
- Device must be assigned to exactly one active table context.
- Broadcast config returned by the backend should be the preferred source of truth.
- Registration passcodes/security codes must not be treated as client-side secrets.

## 2. Table Assignment Polling

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> WaitingForTable: Auth succeeds without table
    WaitingForTable --> Polling: startTablePolling()
    Polling --> Assigned: refresh/auth returns table
    Polling --> TimedOut: max attempts/runtime exceeded
    Assigned --> [*]
    TimedOut --> WaitingForTable: manual retry
```

### Integrity Requirements

- Polling must stop on table assignment.
- Polling must stop on timeout.
- Existing stale table state must be cleared on logout/reset.

## 3. Package Selection and Cart Build

```mermaid
flowchart TD
    Start[Open package selection] --> LoadPackages[Fetch /api/v2/tablet/packages]
    LoadPackages --> SelectPackage[Select package]
    SelectPackage --> SetGuestCount[Set guest count]
    SetGuestCount --> SelectMeats[Select meat modifiers]
    SelectMeats --> AddOns[Optional add-ons]
    AddOns --> Cart[Cart review]
    Cart --> Submit[Submit order]
```

### Payload Contract

The order payload is constructed with one top-level package item and meat items as nested modifiers. Add-ons are sent as separate top-level items.

```mermaid
classDiagram
    class OrderPayload {
      table_id
      guest_count
      subtotal
      tax
      discount
      total_amount
      items[]
    }

    class PackageItem {
      menu_id
      name
      quantity
      price
      subtotal
      is_package=true
      modifiers[]
    }

    class Modifier {
      menu_id
      quantity
    }

    class AddOnItem {
      menu_id
      name
      quantity
      price
      subtotal
      is_package=false
      modifiers=[]
    }

    OrderPayload --> PackageItem
    PackageItem --> Modifier
    OrderPayload --> AddOnItem
```

## 4. Initial Order Submission

```mermaid
sequenceDiagram
    participant Guest
    participant UI as Cart / Order UI
    participant OrderStore as Order Store
    participant DeviceStore as Device Store
    participant API as WooSoo-Nexus API
    participant SessionStore as Session Store
    participant Poller as Status Poller

    Guest->>UI: Tap submit order
    UI->>OrderStore: submitOrder()
    OrderStore->>OrderStore: Guard hasPlacedOrder/isSubmitting
    OrderStore->>DeviceStore: Ensure token/table
    DeviceStore-->>OrderStore: token + table_id
    OrderStore->>OrderStore: buildPayload()
    OrderStore->>OrderStore: Generate/reuse sessionStorage idempotency key
    OrderStore->>API: POST /api/devices/create-order + X-Idempotency-Key
    API-->>OrderStore: success + order payload
    OrderStore->>SessionStore: setOrderId(order_id)
    OrderStore->>OrderStore: setOrderCreated()
    OrderStore->>OrderStore: Clear cart and idempotency key
    OrderStore->>Poller: startPolling(order_id)
    OrderStore-->>UI: show in-session state
```

### Error Branches

```mermaid
flowchart TD
    Submit[submitOrder] --> Validate[Validate token/table/package/items]
    Validate -->|missing token| AuthRetry[authenticate retry]
    Validate -->|missing table| TableRetry[checkTableAssignment]
    Validate -->|offline| OfflineQueue[Queue order with idempotency key]
    Validate -->|valid online| PostOrder[POST create-order]
    PostOrder -->|201/success| Created[setOrderCreated]
    PostOrder -->|409 existing order| Resume[setOrderCreated from conflict order]
    PostOrder -->|401| Expired[Require device re-registration]
    PostOrder -->|422| ValidationError[Show validation errors]
    PostOrder -->|503 SESSION_NOT_FOUND| PosSessionMissing[Ask staff to open POS session]
    PostOrder -->|500| ServerError[Backend diagnostics required]
```

## 5. Offline Order Queue and Replay

```mermaid
sequenceDiagram
    participant PWA
    participant OrderStore
    participant SW as Service Worker
    participant Queue as Workbox Queue
    participant API as WooSoo-Nexus API
    participant Client as Window Client

    PWA->>OrderStore: submitOrder while offline
    OrderStore->>OrderStore: Generate/reuse idempotency key
    OrderStore->>Queue: queueOrder(payload, idempotencyKey)
    PWA-->>PWA: Notify queued
    SW->>Queue: Background sync event
    SW->>Client: orders-sync-start
    SW->>API: Replay POST /api/devices/create-order
    API-->>SW: 201 or 409
    SW->>Client: orders-sync-success or orders-sync-409
```

### Offline Replay Requirements

- Replay must carry original idempotency key.
- Replay must not create an order for a stale session/table.
- `409` must mean safe resume, not unknown conflict.
- UI must reconcile queued success with current session state.

## 6. Realtime and Polling Status Updates

```mermaid
flowchart LR
    API[WooSoo-Nexus] -->|Broadcast event| Reverb[Laravel Reverb]
    Reverb --> Echo[Echo Client]
    Echo --> Stores[Pinia Stores]
    API -->|Fallback GET by order_id| Poller[5s Poller]
    Poller --> Stores
    Stores --> UI[In-session UI]
```

### Integrity Requirements

- Reverb and poller handlers must be idempotent.
- Events must include order/session/table identifiers.
- Stale completion events must be ignored if the tablet has already joined a new session.
- Polling must stop after terminal state or session reset.

## 7. Refill Submission

```mermaid
sequenceDiagram
    participant Guest
    participant OrderStore
    participant API
    participant SessionStore

    Guest->>OrderStore: Enter refill mode
    OrderStore->>OrderStore: Guard hasPlacedOrder
    Guest->>OrderStore: Add refill items
    OrderStore->>OrderStore: Validate meats/sides only
    OrderStore->>API: GET /api/device-order/by-order-id/{orderId}
    API-->>OrderStore: live order status
    OrderStore->>OrderStore: Block if terminal
    OrderStore->>API: POST /api/order/{orderId}/refill + X-Idempotency-Key
    API-->>OrderStore: refill response
    OrderStore->>OrderStore: Clear refill cart and exit refill mode
```

## 8. Session End / Reset

```mermaid
stateDiagram-v2
    [*] --> ActiveBrowsing
    ActiveBrowsing --> OrderPlaced: create-order success
    OrderPlaced --> InSession: setOrderCreated
    InSession --> RefillMode: guest requests refill
    RefillMode --> InSession: refill success/cancel
    InSession --> Ending: completion/reset event or terminal polling result
    Ending --> ClearingLocalState: session end flow
    ClearingLocalState --> WelcomeOrPackage: reset complete
```

### Reset Requirements

- Clear cart and refill cart.
- Clear submitted items.
- Clear current order and session order id.
- Clear idempotency key.
- Stop polling.
- Preserve only safe kiosk/device configuration.

## Workflow Gaps to Validate Against Backend

1. Backend idempotency storage and conflict semantics.
2. Exact broadcast event names, channel names, and payloads.
3. Whether queued orders are bound to the same POS terminal session.
4. Whether v2 menu APIs are intentionally online-only.
5. Whether completion/reset event includes session id and order id.
6. Whether refill endpoint enforces same constraints as frontend.
