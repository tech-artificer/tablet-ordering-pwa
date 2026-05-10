# Tablet Ordering PWA API and Event Contract Review

## Scope

This document records the API and realtime contracts the Tablet Ordering PWA expects from WooSoo-Nexus.

## API Base

The API base URL is configured by `NUXT_PUBLIC_API_BASE_URL`, with `/api` as the default. Because this value is public runtime config, it is safe only as routing configuration, not as a secret.

## Confirmed API Dependencies

| Area | Method | Endpoint | Expected Auth | Purpose |
|---|---:|---|---|---|
| Runtime config | GET | `/api/config` or `/config` with API base | Public | Load client-safe broadcast config |
| Device login | GET | `/api/devices/login` | Guest/public device bootstrap | Authenticate by registered device/IP |
| Device registration | POST | `/api/devices/register` | API middleware / registration guard | Register/provision tablet device |
| Device refresh | POST | `/api/devices/refresh` | Device token | Refresh token/table/broadcast data |
| Token verify | GET | `/api/token/verify` | Device token | Confirm token validity |
| Current session | GET | `/api/sessions/current` | Device token | Get current active session |
| Latest session alias | GET | `/api/session/latest` | Device token | PWA-compatible latest session alias |
| Packages | GET | `/api/v2/tablet/packages` | Device token | Fetch package cards/options |
| Package detail | GET | `/api/v2/tablet/packages/{id}` | Device token | Fetch package details/modifiers |
| Meat categories | GET | `/api/v2/tablet/meat-categories` | Device token | Fetch meat category groupings |
| Categories | GET | `/api/v2/tablet/categories` | Device token | Fetch tablet categories |
| Category menus | GET | `/api/v2/tablet/categories/{slug}/menus` | Device token | Fetch menus under category |
| Create order | POST | `/api/devices/create-order` | Device token | Submit initial order |
| Order by external id | GET | `/api/device-order/by-order-id/{orderId}` | Device token | Poll or verify canonical order status |
| Refill order | POST | `/api/order/{orderId}/refill` | Device token | Submit refill batch |
| Print refill alias | POST | `/api/order/{orderId}/print-refill` | Device token | Alias for refill/print flow |
| Session reset | POST | `/api/sessions/{id}/reset` | Admin Sanctum | Reset a session/tablet flow |
| Broadcast auth | POST | `/broadcasting/auth` | Bearer token | Authorize private/presence channels |

## Order Create Request Contract

The initial order mutation must send an `X-Idempotency-Key` header.

```http
POST /api/devices/create-order
Authorization: Bearer <device-token>
X-Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "table_id": 1,
  "guest_count": 4,
  "subtotal": 1996,
  "tax": 0,
  "discount": 0,
  "total_amount": 1996,
  "items": [
    {
      "menu_id": 10,
      "name": "Premium Package",
      "quantity": 4,
      "price": 499,
      "subtotal": 1996,
      "tax": 0,
      "discount": 0,
      "note": null,
      "is_package": true,
      "modifiers": [
        { "menu_id": 101, "quantity": 1 },
        { "menu_id": 102, "quantity": 1 }
      ]
    }
  ]
}
```

## Order Create Response Contract

The PWA expects a response body with `success: true` and an `order` object containing either `order.order_id`, `order.id`, or `order.order_number`.

```json
{
  "success": true,
  "message": "Order created",
  "order": {
    "id": 123,
    "order_id": 19583,
    "order_number": "ORD-19583",
    "status": "pending"
  }
}
```

## Conflict Resume Contract

The PWA treats HTTP `409` as a recoverable active-order conflict when the response contains an `order` object.

```json
{
  "success": false,
  "message": "Active order already exists",
  "order": {
    "id": 123,
    "order_id": 19583,
    "status": "pending"
  }
}
```

### Requirement

A `409` response must only be used for a safe resume conflict. Other conflicts must use a different code/message shape so the PWA does not resume incorrectly.

## Error Contract

| Status | PWA Behavior | Required Backend Meaning |
|---:|---|---|
| 401 | Ask for device re-registration | Token invalid/expired/revoked |
| 409 | Resume existing active order if `order` is present | Idempotent or active-order conflict |
| 422 | Display validation errors | Payload contract violation |
| 429 | Retry later / SW requeue | Rate limited |
| 500 | Backend diagnostics required | Unexpected server failure |
| 503 + `SESSION_NOT_FOUND` | Ask staff to open POS terminal session | POS terminal session unavailable |

## Refill Request Contract

```http
POST /api/order/{orderId}/refill
Authorization: Bearer <device-token>
X-Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "items": [
    {
      "menu_id": 101,
      "name": "Beef refill",
      "quantity": 1,
      "note": "Refill"
    }
  ]
}
```

## Realtime Contract Requirements

The exact event/channel names must be validated against backend code. The PWA architecture requires all terminal or state-changing events to include enough identifiers to reject stale events.

### Required Event Envelope

```json
{
  "event": "order.status.updated",
  "order_id": 19583,
  "session_id": 55,
  "device_id": 7,
  "table_id": 3,
  "status": "completed",
  "occurred_at": "2026-05-05T12:00:00+08:00",
  "version": 1
}
```

### Event Validation Rules

1. Ignore event if `device_id` does not match current device.
2. Ignore event if `table_id` does not match current table.
3. Ignore event if `session_id` does not match current session.
4. Ignore event if `order_id` does not match current order.
5. Apply terminal events idempotently.
6. Stop polling after terminal state is applied.

## Required Event Types

| Event | Purpose | Required Fields |
|---|---|---|
| `order.created` | Confirm order creation/recovery | order_id, session_id, device_id, table_id, status |
| `order.status.updated` | Update in-session order status | order_id, session_id, status |
| `order.completed` | End session / reset tablet | order_id, session_id, device_id, table_id |
| `session.reset` | Staff/admin reset | session_id, device_id, table_id, reason |
| `device.table.assigned` | Table assignment changed | device_id, table_id |
| `printer.status.updated` | Optional printer state | device_id/table_id/status |

## Contract Risks

| Severity | Risk | Consequence | Control |
|---|---|---|---|
| P1 | Ambiguous order id fields | Polling/refill against wrong id | Use canonical `order_id` consistently |
| P1 | 409 reused for non-resumable conflict | Wrong session resumed | Separate error code or explicit conflict type |
| P1 | Event missing session id | Stale reset can wipe new session | Require session id on all terminal events |
| P1 | Backend idempotency not persisted | Duplicate orders under retry/offline replay | Store idempotency key per device/session/table |
| P2 | Response shapes not schema-tested | Frontend runtime failures | Add contract tests or OpenAPI schema |

## Required Contract Tests

- Create-order success response matches PWA parser.
- Create-order 409 response resumes existing active order safely.
- Create-order retry with same idempotency key returns same order.
- Create-order retry with same key but different payload is rejected.
- Refill order with duplicate idempotency key is safe.
- Completion event with stale session id is ignored.
- Polling terminal status and Reverb terminal event together only reset once.
