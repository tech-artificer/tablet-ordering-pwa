# Backend API Requirements for Support & Refill Features

**Date:** November 30, 2025  
**Project:** Tablet Ordering PWA (Kiosk Application)  
**Purpose:** Document required backend API routes for support requests and order refills

---

## Overview

The kiosk application provides two key customer service features:
1. **Support Requests** - Allow customers to request assistance from staff (e.g., cleaning table, water refill, billing help)
2. **Order Refills** - Enable customers to add more items to their existing order (for unlimited packages)

Both features require backend API endpoints to process requests, track status, and enable real-time notifications to staff via WebSocket broadcasts.

---

## 1. Support Request API

### 1.1 Create Service Request

**Purpose:** Submit a customer support request from the kiosk device.

**Endpoint:**
```
POST /api/service/request
```

**Authentication:**
- Requires: Device token (Sanctum `auth:device` guard)
- Headers: `Authorization: Bearer {device_token}`

**Request Payload:**
```typescript
{
  type: string,                    // Request type identifier
  table_service_id: number,        // Service type ID from lookup table
  order_id: number | null,         // Current order ID (if exists)
  session_id: number | null,       // Current session ID
  table_id: number                 // Device's assigned table ID
}
```

**Example Request:**
```json
{
  "type": "clean",
  "table_service_id": 1,
  "order_id": 42,
  "session_id": 158,
  "table_id": 21
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 789,
    "order_id": 42,
    "table_id": 21,
    "device_id": 15,
    "type": "clean",
    "message": null,
    "status": "pending",
    "created_at": "2025-11-30T10:30:45.000000Z",
    "updated_at": "2025-11-30T10:30:45.000000Z",
    "acknowledged_at": null,
    "completed_at": null
  },
  "message": "Service request created successfully"
}
```

**Response (Error - 422 Unprocessable Entity):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "table_id": ["The table id field is required."]
  }
}
```

### 1.2 Service Request Types

**Supported Types (Frontend Mapping):**

| Frontend Type | Service ID | Label            | Icon | Description                    |
|---------------|-----------|------------------|------|--------------------------------|
| `clean`       | 1         | Clean Table      | 🧹   | Request table cleaning         |
| `water`       | 2         | Refill Water     | 💧   | Request water refill           |
| `billing`     | 3         | Call for Bill    | 💳   | Request payment assistance     |
| `support`     | 4         | General Support  | 🙋   | General assistance needed      |
| `refill`      | 5         | Order Refill     | 🔄   | Informational (handled separately) |

**Backend Requirement:**
- Maintain `table_services` lookup table with these service types
- Support dynamic addition of new service types via admin panel

### 1.3 Real-Time Broadcast

**Event:** `service-request.notification`

**Channel:** `service-requests.{order_id}`

**Payload Structure:**
```typescript
{
  eventId: number,
  service_request: {
    id: number,
    order_id: string,
    table_id: number,
    device_id: number,
    type: string,
    message?: string,
    status: 'pending' | 'acknowledged' | 'completed',
    created_at: string,
    updated_at: string
  }
}
```

**Example Broadcast:**
```json
{
  "eventId": 10234,
  "service_request": {
    "id": 789,
    "order_id": "ORD-2025-11-30-042",
    "table_id": 21,
    "device_id": 15,
    "type": "clean",
    "message": null,
    "status": "acknowledged",
    "created_at": "2025-11-30T10:30:45Z",
    "updated_at": "2025-11-30T10:32:10Z"
  }
}
```

**Trigger Events:**
- When service request is created (`status: pending`)
- When staff acknowledges request (`status: acknowledged`)
- When request is completed (`status: completed`)

---

## 2. Order Refill API

### 2.1 Create Refill Order

**Purpose:** Submit additional items for an existing order (for unlimited packages).

**Endpoint:**
```
POST /api/devices/create-refill
```

**Authentication:**
- Requires: Device token (Sanctum `auth:device` guard)
- Headers: `Authorization: Bearer {device_token}`

**Request Payload:**
```typescript
{
  order_id: number,                // Original order ID
  items: Array<{
    menu_id: number,               // Menu item ID
    name: string,                  // Item name
    quantity: number,              // Quantity ordered
    price: number,                 // Item price (may be 0 for unlimited)
    note?: string,                 // Optional note (e.g., "Refill order")
    subtotal: number,              // price * quantity
    is_refill: boolean             // Flag to identify refill items
  }>,
  total_amount: number             // Total refill amount
}
```

**Example Request:**
```json
{
  "order_id": 42,
  "items": [
    {
      "menu_id": 101,
      "name": "Premium Beef Brisket",
      "quantity": 2,
      "price": 0,
      "note": "Refill order",
      "subtotal": 0,
      "is_refill": true
    },
    {
      "menu_id": 205,
      "name": "Kimchi",
      "quantity": 1,
      "price": 0,
      "note": "Refill order",
      "subtotal": 0,
      "is_refill": true
    }
  ],
  "total_amount": 0
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "data": {
    "refill_order": {
      "id": 156,
      "parent_order_id": 42,
      "order_number": "REF-2025-11-30-156",
      "device_id": 15,
      "session_id": 158,
      "table_id": 21,
      "status": "pending",
      "items": [
        {
          "id": 789,
          "refill_order_id": 156,
          "menu_id": 101,
          "name": "Premium Beef Brisket",
          "quantity": 2,
          "price": "0.00",
          "subtotal": "0.00",
          "is_refill": true
        },
        {
          "id": 790,
          "refill_order_id": 156,
          "menu_id": 205,
          "name": "Kimchi",
          "quantity": 1,
          "price": "0.00",
          "subtotal": "0.00",
          "is_refill": true
        }
      ],
      "total_amount": "0.00",
      "created_at": "2025-11-30T10:45:22.000000Z",
      "updated_at": "2025-11-30T10:45:22.000000Z"
    }
  },
  "message": "Refill order created successfully"
}
```

**Response (Error - 404 Not Found):**
```json
{
  "success": false,
  "message": "Original order not found",
  "errors": {
    "order_id": ["The specified order does not exist"]
  }
}
```

**Response (Error - 422 Validation):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "items": ["At least one item is required"],
    "items.0.menu_id": ["The menu_id field is required"]
  }
}
```

### 2.2 Refill Order Business Rules

**Backend Validation Requirements:**

1. **Package Type Check:**
   - Verify original order has an unlimited package
   - Reject refills for à la carte or limited packages
   - Return error: `"Refills are only available for unlimited packages"`

2. **Menu Item Eligibility:**
   - Only allow refills for unlimited items (meats, sides marked `is_refillable: true`)
   - Reject non-refillable items (desserts, beverages, etc.)
   - Return error: `"Item {name} is not eligible for refills"`

3. **Order Status Check:**
   - Original order must be in `preparing`, `ready`, or `served` status
   - Cannot refill `completed`, `cancelled`, or `voided` orders
   - Return error: `"Cannot refill order with status {status}"`

4. **Session Validation:**
   - Refill must belong to same device/session as original order
   - Prevent cross-table refills
   - Return error: `"Refill must be from the same device/session"`

5. **Refill Limits (Optional):**
   - Implement configurable max refills per item
   - Track `refills_used` count per menu item
   - Return error: `"Maximum refills reached for {item_name}"`

### 2.3 Real-Time Broadcast for Refills

**Event:** `order.created`

**Channel:** `orders.{order_id}`

**Payload Structure:**
```typescript
{
  eventId: number,
  event: 'created',
  order: {
    id: number,
    order_id: string,
    order_number: string,
    device_id: number,
    session_id: number,
    table_id: number,
    status: string,
    items: Array<OrderItem>,
    subtotal: string,
    tax: string,
    service_charge: string,
    total: string,
    guest_count: number,
    is_refill?: boolean,           // Flag for refill orders
    parent_order_id?: number,      // Original order ID
    created_at: string,
    updated_at: string
  }
}
```

**Example Broadcast:**
```json
{
  "eventId": 10235,
  "event": "created",
  "order": {
    "id": 156,
    "order_id": "REF-2025-11-30-156",
    "order_number": "REF-2025-11-30-156",
    "device_id": 15,
    "session_id": 158,
    "table_id": 21,
    "status": "pending",
    "items": [
      {
        "id": 789,
        "menu_id": 101,
        "name": "Premium Beef Brisket",
        "quantity": 2,
        "price": "0.00",
        "is_refill": true
      }
    ],
    "subtotal": "0.00",
    "tax": "0.00",
    "service_charge": "0.00",
    "total": "0.00",
    "guest_count": 2,
    "is_refill": true,
    "parent_order_id": 42,
    "created_at": "2025-11-30T10:45:22Z",
    "updated_at": "2025-11-30T10:45:22Z"
  }
}
```

---

## 3. Database Schema Requirements

### 3.1 Service Requests Table

**Table:** `service_requests`

```sql
CREATE TABLE service_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NULL,
  table_id BIGINT UNSIGNED NOT NULL,
  device_id BIGINT UNSIGNED NOT NULL,
  table_service_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NULL,
  status ENUM('pending', 'acknowledged', 'completed') DEFAULT 'pending',
  acknowledged_at TIMESTAMP NULL,
  acknowledged_by BIGINT UNSIGNED NULL, -- Staff user ID
  completed_at TIMESTAMP NULL,
  completed_by BIGINT UNSIGNED NULL,    -- Staff user ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_table_id (table_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

### 3.2 Table Services Lookup Table

**Table:** `table_services`

```sql
CREATE TABLE table_services (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(10) NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO table_services (id, name, type, icon, description, sort_order) VALUES
(1, 'Clean Table', 'clean', '🧹', 'Request table cleaning', 1),
(2, 'Refill Water', 'water', '💧', 'Request water refill', 2),
(3, 'Call for Bill', 'billing', '💳', 'Request payment assistance', 3),
(4, 'General Support', 'support', '🙋', 'General assistance needed', 4);
```

### 3.3 Refill Orders

**Option A: Separate Table (Recommended)**

```sql
CREATE TABLE refill_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_order_id BIGINT UNSIGNED NOT NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  device_id BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  table_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'preparing', 'ready', 'served', 'completed') DEFAULT 'pending',
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_parent_order (parent_order_id),
  INDEX idx_device_session (device_id, session_id),
  INDEX idx_status (status),
  
  FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
);

CREATE TABLE refill_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refill_order_id BIGINT UNSIGNED NOT NULL,
  menu_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INT UNSIGNED DEFAULT 1,
  price DECIMAL(10, 2) DEFAULT 0.00,
  subtotal DECIMAL(10, 2) DEFAULT 0.00,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_refill_order (refill_order_id),
  INDEX idx_menu_id (menu_id),
  
  FOREIGN KEY (refill_order_id) REFERENCES refill_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);
```

**Option B: Add to Existing Orders (Alternative)**

```sql
-- Add columns to existing orders table
ALTER TABLE orders
ADD COLUMN is_refill BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_order_id BIGINT UNSIGNED NULL,
ADD INDEX idx_is_refill (is_refill),
ADD INDEX idx_parent_order (parent_order_id);

-- Add columns to order_items table
ALTER TABLE order_items
ADD COLUMN is_refill BOOLEAN DEFAULT FALSE;
```

---

## 4. Frontend Implementation Details

### 4.1 Support Request Flow

**Location:** `pages/menu.vue`, `components/menu/SupportFab.vue`, `components/menu/AssistanceDrawer.vue`

**Current Implementation:**
```typescript
// Support request types
const supportRequests = [
  { id: 'clean', label: 'Clean Table', icon: '🧹', type: 'warning' },
  { id: 'water', label: 'Refill Water', icon: '💧', type: 'primary' },
  { id: 'billing', label: 'Call for Bill', icon: '💳', type: 'success' },
  { id: 'support', label: 'Need Assistance', icon: '🙋', type: 'info' },
  { id: 'refill', label: 'Order Refill', icon: '🔄', type: 'info' }
]

// Handler
const handleSupportRequest = async (type: string) => {
  const payload = {
    type: type,
    table_service_id: getServiceTypeId(type),
    order_id: sessionStore.orderId ?? null,
    session_id: sessionStore.sessionId ?? null,
    table_id: deviceStore.table.value?.id ?? null
  }

  await api.post('/api/service/request', payload)
}
```

### 4.2 Refill Order Flow

**Location:** `pages/menu.vue`, `stores/Order.ts`

**Current Implementation:**
```typescript
// Store method
async function submitRefill(payload?: any) {
  const refillPayload = {
    order_id: state.currentOrder?.order?.id || state.currentOrder?.id,
    items: state.refillItems.map((i: any) => ({
      menu_id: Number(i.id),
      name: i.name,
      quantity: Number(i.quantity),
      price: Number(i.price),
      note: 'Refill order',
      subtotal: Number(i.price) * Number(i.quantity),
      is_refill: true
    })),
    total_amount: refillTotal.value
  }

  const resp = await api.post('/devices/create-refill', payload ?? refillPayload)
  state.refillItems = []
  state.isRefillMode = false
  return resp.data
}
```

---

## 5. WebSocket Broadcasting Requirements

### 5.1 Channels

**For Service Requests:**
- `service-requests.{order_id}` - Per-order service request updates

**For Refill Orders:**
- `orders.{order_id}` - Standard order events (reuse existing)
- `Device.{device_id}` - Device-specific updates

### 5.2 Event Types

| Event Name | Channel | Trigger | Payload |
|-----------|---------|---------|---------|
| `service-request.notification` | `service-requests.{order_id}` | Service request created/updated | ServiceRequestEvent |
| `order.created` | `orders.{order_id}` | Refill order created | OrderCreatedEvent |
| `order.updated` | `Device.{device_id}` | Refill order status change | OrderUpdatedEvent |

### 5.3 Frontend Listeners

**Already implemented in:** `composables/useBroadcasts.ts`

```typescript
// Service request handler
const handleServiceRequest = (event: ServiceRequestEvent) => {
  const statusMessages: Record<string, string> = {
    pending: 'Request sent to staff',
    acknowledged: 'Staff has been notified and will assist you shortly',
    completed: 'Request completed!'
  }
  
  ElMessage({
    message: statusMessages[event.service_request.status],
    type: event.service_request.status === 'completed' ? 'success' : 'info',
    duration: 4000
  })
}

// Refill order handler (reuses order.created)
const handleOrderCreated = (event: OrderCreatedEvent) => {
  ElNotification({
    title: event.order.is_refill ? 'Refill Order Confirmed' : 'Order Confirmed',
    message: `Order ${event.order.order_number} has been placed successfully!`,
    type: 'success',
    duration: 5000
  })
}
```

---

## 6. Testing Requirements

### 6.1 Service Request Tests

**Test Cases:**
1. ✅ Create service request with valid payload
2. ✅ Reject request without table_id
3. ✅ Reject request with invalid table_service_id
4. ✅ Update service request status (pending → acknowledged → completed)
5. ✅ Broadcast service request events via WebSocket
6. ✅ Track acknowledged_by and completed_by staff IDs

### 6.2 Refill Order Tests

**Test Cases:**
1. ✅ Create refill order with valid items
2. ✅ Reject refill for non-unlimited package
3. ✅ Reject refill for non-refillable menu items
4. ✅ Reject refill for completed/cancelled orders
5. ✅ Reject refill from different device/session
6. ✅ Enforce max refills per item (if configured)
7. ✅ Broadcast refill order creation via WebSocket
8. ✅ Link refill order to parent order correctly

---

## 7. Additional Notes

### 7.1 Error Handling

**Backend should return consistent error format:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

### 7.2 Rate Limiting

**Recommendation:**
- Service requests: 10 requests per minute per device
- Refill orders: 5 requests per minute per device
- Prevents spam and abuse

### 7.3 Logging

**Requirements:**
- Log all service requests (for analytics and staff performance)
- Log refill orders separately for inventory tracking
- Track average response time for service requests

### 7.4 Admin Dashboard Integration

**Features Needed:**
1. Real-time service request notifications
2. One-click acknowledge/complete actions
3. Service request history per table/device
4. Refill order tracking and analytics
5. Popular service request types reporting

---

## 8. Summary Checklist

**Backend Tasks:**
- [ ] Create `service_requests` table with proper indexes
- [ ] Create `table_services` lookup table with seed data
- [ ] Create `refill_orders` and `refill_order_items` tables (or modify existing)
- [ ] Implement `POST /api/service/request` endpoint
- [ ] Implement `POST /api/devices/create-refill` endpoint
- [ ] Add business rule validation for refill orders
- [ ] Set up WebSocket broadcasting for service requests
- [ ] Set up WebSocket broadcasting for refill orders
- [ ] Implement rate limiting on both endpoints
- [ ] Add comprehensive error handling
- [ ] Create unit/integration tests
- [ ] Update API documentation

**Frontend Tasks (Already Complete):**
- [x] Support request UI components
- [x] Refill mode toggle in menu
- [x] WebSocket event listeners
- [x] Service request payload builder
- [x] Refill order payload builder
- [x] Real-time notifications

---

**End of Document**
