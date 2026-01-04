# Implementation Guide: Priority Features with Code Examples

**For:** Development team ready to implement Phase 1 improvements

---

## Feature #1: Order History Page (3 days)

### 1.1 Backend API Enhancement

**Endpoint to add in Laravel `routes/api.php`:**

```php
Route::middleware('auth:device')->group(function () {
    // Get paginated order history for current device
    Route::get('/devices/orders/history', [DeviceOrderApiController::class, 'history'])
        ->name('device.orders.history');
    
    // Get detailed view of a specific order
    Route::get('/devices/orders/{orderId}/detail', [DeviceOrderApiController::class, 'detail'])
        ->name('device.orders.detail');
    
    // Quick reorder: clone previous order into new order
    Route::post('/devices/orders/{orderId}/reorder', [DeviceOrderApiController::class, 'reorder'])
        ->name('device.orders.reorder');
});
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 145,
        "order_id": "ORD-2025-001145",
        "order_number": "OG-145",
        "device_id": 5,
        "table_id": 4,
        "status": "completed",
        "created_at": "2025-01-02 18:30:00",
        "completed_at": "2025-01-02 18:45:00",
        "guest_count": 4,
        "subtotal": 3200,
        "tax": 384,
        "total": 3584,
        "items": [
          {
            "id": 501,
            "menu_id": 12,
            "name": "Premium Package - 4 Guests",
            "quantity": 1,
            "price": 3200,
            "subtotal": 3200
          }
        ]
      },
      {
        "id": 144,
        "order_id": "ORD-2025-001144",
        "status": "completed",
        "created_at": "2025-01-01 19:15:00",
        "guest_count": 2,
        "total": 1800,
        ...
      }
    ],
    "total_count": 12,
    "page": 1,
    "per_page": 10
  }
}
```

### 1.2 Frontend Store: Update `stores/Order.ts`

```typescript
// Add to state
state: {
  // ... existing
  orderHistory: [] as any[],
  orderHistoryLoading: false,
  orderHistoryError: null as string | null,
}

// Add getters
getters: {
  // ... existing
  isLoadingHistory: (state: any) => state.orderHistoryLoading,
  hasHistory: (state: any) => state.orderHistory.length > 0,
}

// Add actions
actions: {
  async fetchOrderHistory(this: any, { page = 1, limit = 10 } = {}) {
    this.orderHistoryLoading = true
    this.orderHistoryError = null
    const api = useApi()
    
    try {
      const response = await api.get('/devices/orders/history', {
        params: { page, limit }
      })
      this.orderHistory = response.data.data.orders
      logger.info(`Loaded ${this.orderHistory.length} orders`)
    } catch (error: any) {
      this.orderHistoryError = error.response?.data?.message || 'Failed to load order history'
      logger.error('Order history error:', error)
      throw error
    } finally {
      this.orderHistoryLoading = false
    }
  },

  async reorderPreviousOrder(this: any, orderId: number) {
    const api = useApi()
    try {
      const response = await api.post(`/devices/orders/${orderId}/reorder`)
      const clonedOrder = response.data.data
      
      // Populate cart with cloned order items
      this.package = clonedOrder.package
      this.guestCount = clonedOrder.guest_count
      this.cartItems = clonedOrder.items
      
      logger.info(`Reordered previous order #${orderId}`)
      return clonedOrder
    } catch (error: any) {
      logger.error('Reorder failed:', error)
      throw error
    }
  }
}
```

### 1.3 Component: `pages/order/history.vue`

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '~/stores/order'
import { ElMessage, ElMessageBox } from 'element-plus'
import OrderHistoryCard from '~/components/order/OrderHistoryCard.vue'

const router = useRouter()
const orderStore = useOrderStore()
const currentPage = ref(1)
const pageSize = ref(10)

const isLoading = computed(() => orderStore.orderHistoryLoading)
const history = computed(() => orderStore.orderHistory)
const hasHistory = computed(() => history.value.length > 0)

onMounted(async () => {
  try {
    await orderStore.fetchOrderHistory({ 
      page: currentPage.value, 
      limit: pageSize.value 
    })
  } catch (error) {
    ElMessage.error('Failed to load order history')
  }
})

const handleReorder = async (orderId: number, orderNumber: string) => {
  try {
    ElMessageBox.confirm(
      `Reorder ${orderNumber}? Items will be added to a new cart.`,
      'Confirm Reorder',
      { confirmButtonText: 'Reorder', cancelButtonText: 'Cancel' }
    ).then(async () => {
      await orderStore.reorderPreviousOrder(orderId)
      ElMessage.success('Items added to cart!')
      router.push('/menu')
    }).catch(() => {
      // User cancelled
    })
  } catch (error: any) {
    ElMessage.error(error.message || 'Reorder failed')
  }
}

const handleViewDetail = (orderId: number) => {
  router.push(`/order/history/${orderId}`)
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  try {
    await orderStore.fetchOrderHistory({ page, limit: pageSize.value })
  } catch (error) {
    ElMessage.error('Failed to load page')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between border-b border-gray-700 pb-4">
        <h1 class="text-4xl font-bold text-orange-400">📋 Order History</h1>
        <router-link 
          to="/order/in-session"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          ← Back
        </router-link>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!hasHistory" class="text-center py-12">
        <p class="text-gray-400 text-lg mb-4">No orders yet</p>
        <p class="text-gray-500">When you place an order, it will appear here.</p>
        <router-link 
          to="/order/start"
          class="mt-6 inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
        >
          Start New Order
        </router-link>
      </div>

      <!-- History List -->
      <div v-else class="space-y-4">
        <OrderHistoryCard 
          v-for="order in history"
          :key="order.id"
          :order="order"
          @reorder="handleReorder(order.id, order.order_number)"
          @view-detail="handleViewDetail(order.id)"
        />
      </div>

      <!-- Pagination -->
      <div v-if="hasHistory" class="mt-8 flex justify-center items-center gap-2">
        <button 
          :disabled="currentPage === 1"
          @click="handlePageChange(currentPage - 1)"
          class="px-4 py-2 bg-gray-700 disabled:opacity-50 rounded"
        >
          ← Previous
        </button>
        <span class="text-gray-400">Page {{ currentPage }}</span>
        <button 
          @click="handlePageChange(currentPage + 1)"
          class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>
```

### 1.4 Component: `components/order/OrderHistoryCard.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '~/utils/formats'
import type { DeviceOrder } from '~/types'

const props = defineProps<{
  order: any
}>()

const emit = defineEmits<{
  'reorder': []
  'view-detail': []
}>()

const statusColor = computed(() => {
  const status = props.order.status?.toLowerCase()
  const colors: Record<string, string> = {
    'completed': 'bg-green-600',
    'cancelled': 'bg-red-600',
    'voided': 'bg-gray-600',
    'pending': 'bg-yellow-600',
  }
  return colors[status] || 'bg-gray-600'
})

const formattedDate = computed(() => {
  return new Date(props.order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const durationMinutes = computed(() => {
  const created = new Date(props.order.created_at).getTime()
  const completed = new Date(props.order.completed_at).getTime()
  return Math.round((completed - created) / 60000)
})
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-orange-500 transition">
    <!-- Header Row -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-4">
        <div>
          <h3 class="text-xl font-bold text-white">{{ order.order_number }}</h3>
          <p class="text-sm text-gray-400">{{ formattedDate }}</p>
        </div>
      </div>
      
      <span :class="[statusColor, 'px-4 py-2 rounded-full text-white font-semibold text-sm']">
        {{ order.status | capitalize }}
      </span>
    </div>

    <!-- Details Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-300">
      <div>
        <p class="text-gray-500 text-xs mb-1">Guests</p>
        <p class="font-bold text-lg">{{ order.guest_count }}</p>
      </div>
      <div>
        <p class="text-gray-500 text-xs mb-1">Items</p>
        <p class="font-bold text-lg">{{ order.items?.length || 0 }}</p>
      </div>
      <div>
        <p class="text-gray-500 text-xs mb-1">Duration</p>
        <p class="font-bold text-lg">{{ durationMinutes }} min</p>
      </div>
      <div>
        <p class="text-gray-500 text-xs mb-1">Total</p>
        <p class="font-bold text-lg text-orange-400">₱{{ formatCurrency(order.total) }}</p>
      </div>
    </div>

    <!-- Items Preview -->
    <div v-if="order.items?.length" class="mb-4 text-sm text-gray-400">
      <p class="mb-2">Items ordered:</p>
      <div class="ml-4 space-y-1">
        <p v-for="item in order.items.slice(0, 3)" :key="item.id">
          • {{ item.name }} ×{{ item.quantity }}
        </p>
        <p v-if="order.items.length > 3" class="text-gray-500">
          +{{ order.items.length - 3 }} more
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2 pt-4 border-t border-gray-700">
      <button 
        @click="emit('view-detail')"
        class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition text-sm"
      >
        View Details
      </button>
      <button 
        @click="emit('reorder')"
        class="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition text-sm font-semibold"
      >
        🔄 Reorder
      </button>
    </div>
  </div>
</template>
```

### 1.5 Update `pages/order/in-session.vue`

```vue
<script setup lang="ts">
// ... existing imports

const goToOrderHistory = () => {
  router.push('/order/history')
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- ... existing header -->
    
    <header class="flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
      <div class="flex items-center">
        <WoosooLogo />
        <el-avatar :size="50" class="mr-3 bg-red-600">T4</el-avatar>
        <div>
          <h2 class="text-xl font-semibold">Happy Feasting, Table 4!</h2>
          <p class="text-sm text-gray-400">Premium Package (4 Guests)</p>
        </div>
      </div>
      
      <!-- CHANGE THIS LINE -->
      <button 
        @click="goToOrderHistory" 
        type="info" 
        class="hidden md:block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
      >
        View Past Orders
      </button>
    </header>

    <!-- ... rest existing -->
  </div>
</template>
```

---

## Feature #2: Error Recovery & Retry (2 days)

### 2.1 Create `services/errorRecoveryService.ts`

```typescript
import { logger } from '~/utils/logger'

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}

export class ErrorRecoveryService {
  private retryConfig: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Execute function with exponential backoff retry
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string = 'Operation'
  ): Promise<T> {
    let lastError: Error | null = null
    let delay = this.retryConfig.initialDelayMs

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        logger.debug(`${context} - Attempt ${attempt}/${this.retryConfig.maxRetries}`)
        const result = await fn()
        if (attempt > 1) {
          logger.info(`${context} succeeded on attempt ${attempt}`)
        }
        return result
      } catch (error: any) {
        lastError = error
        logger.warn(`${context} failed on attempt ${attempt}: ${error.message}`)

        if (attempt < this.retryConfig.maxRetries) {
          logger.debug(`${context} - Retrying in ${delay}ms`)
          await this.sleep(delay)
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          )
        }
      }
    }

    logger.error(`${context} failed after ${this.retryConfig.maxRetries} attempts`)
    throw lastError
  }

  /**
   * Check if error is retriable (network error, timeout, 5xx)
   */
  isRetriable(error: any): boolean {
    // Network error (no response)
    if (!error.response) {
      return true
    }

    // Server error (5xx)
    if (error.response.status >= 500) {
      return true
    }

    // Timeout
    if (error.code === 'ECONNABORTED') {
      return true
    }

    // 429 (rate limited)
    if (error.response.status === 429) {
      return true
    }

    return false
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: any): string {
    if (!error.response) {
      return 'Network error. Please check your connection and try again.'
    }

    const status = error.response.status
    const data = error.response.data

    if (status === 422) {
      // Validation error
      return data?.message || 'Please check your order and try again.'
    }

    if (status === 500) {
      return 'Server error. Please try again in a moment.'
    }

    if (status === 503) {
      return 'Service temporarily unavailable. Please try again later.'
    }

    if (status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }

    return data?.message || 'An error occurred. Please try again.'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const errorRecoveryService = new ErrorRecoveryService()
```

### 2.2 Update `stores/Order.ts` with retry logic

```typescript
// Add to state
state: {
  // ... existing
  submitError: null as string | null,
  submitErrorRetryable: false as boolean,
  submitRetryCount: 0 as number,
  maxSubmitRetries: 3 as number,
}

// Add actions
actions: {
  async submitOrderWithRetry(this: any) {
    const api = useApi()
    const deviceStore = useDeviceStore()
    
    if (!deviceStore.isAuthenticated) {
      this.submitError = 'Device not authenticated'
      return
    }

    this.isSubmitting = true
    this.submitError = null
    this.submitErrorRetryable = false

    try {
      const orderPayload = this.buildOrderPayload()
      
      // Execute with retry
      const response = await errorRecoveryService.executeWithRetry(
        () => api.post('/devices/create-order', orderPayload),
        'Order Submission'
      )

      this.currentOrder = response.data.data
      this.submittedItems = [...this.cartItems]
      this.hasPlacedOrder = true
      this.submitRetryCount = 0
      
      logger.info('Order submitted successfully')
      return response.data.data
    } catch (error: any) {
      this.submitError = errorRecoveryService.getErrorMessage(error)
      this.submitErrorRetryable = errorRecoveryService.isRetriable(error)
      this.submitRetryCount++
      
      logger.error('Order submission failed:', error)
      throw error
    } finally {
      this.isSubmitting = false
    }
  },

  clearSubmitError(this: any) {
    this.submitError = null
    this.submitErrorRetryable = false
  }
}
```

### 2.3 Update `pages/order/review.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '~/stores/order'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const orderStore = useOrderStore()

const canRetry = computed(() => 
  orderStore.submitError && orderStore.submitErrorRetryable
)

const handleOrderSubmitted = async () => {
  // Success flow
  try {
    const { useSessionStore } = await import('../../stores/session')
    const sessionStore = useSessionStore()
    await sessionStore.start()
  } catch (e) {
    logger.warn('sessionStore.start() failed', e)
  }

  router.replace('/order/in-session')
}

const handleRetrySubmit = async () => {
  try {
    await orderStore.submitOrderWithRetry()
    handleOrderSubmitted()
  } catch (error) {
    ElMessage.error('Order submission failed. Please contact staff.')
  }
}

const handleContactStaff = () => {
  ElMessageBox.confirm(
    'Would you like to call staff for assistance?',
    'Get Help',
    { confirmButtonText: 'Call Staff', cancelButtonText: 'Cancel' }
  ).then(() => {
    // Emit service request event
    ElMessage.success('Staff will be with you shortly.')
  }).catch(() => {})
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <h1 class="text-3xl font-bold mb-6 text-orange-400">3. Review and Confirm Order</h1>
    
    <!-- Error Banner -->
    <div v-if="orderStore.submitError" class="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
      <p class="font-bold text-red-400 mb-2">❌ Order Submission Failed</p>
      <p class="text-red-300 mb-4">{{ orderStore.submitError }}</p>
      
      <div class="flex gap-2">
        <button 
          v-if="canRetry"
          @click="handleRetrySubmit"
          :disabled="orderStore.isSubmitting"
          class="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded transition"
        >
          {{ orderStore.isSubmitting ? '🔄 Retrying...' : '🔄 Retry Submission' }}
        </button>
        
        <button 
          @click="handleContactStaff"
          class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
        >
          📞 Contact Staff
        </button>
        
        <button 
          @click="orderStore.clearSubmitError()"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Order Review Component -->
    <OrderingStep3ReviewSubmit 
      @orderSubmitted="handleOrderSubmitted"
      @submitError="(error) => {}"
    />
  </div>
</template>
```

---

## Feature #3: Quick Win - Add ARIA Labels (30 min)

### 3.1 Update `components/menu/MenuItemCard.vue`

```vue
<template>
  <div class="bg-gray-800 p-4 rounded-lg hover:border-orange-500 border border-gray-700 transition">
    <!-- ... existing content ... -->
    
    <button 
      @click="addItemToCart"
      :aria-label="`Add ${item.name} (₱${formatCurrency(item.price)}) to cart`"
      :title="`Add ${item.name} to cart. Price: ₱${formatCurrency(item.price)}`"
      class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded transition font-bold"
    >
      + Add
      <span class="sr-only">{{ item.name }}, ₱{{ item.price }}</span>
    </button>

    <!-- Image with alt text -->
    <img 
      v-if="item.image"
      :src="item.image" 
      :alt="`${item.name} - ${item.description || 'Menu item'}`"
      class="w-full h-32 object-cover rounded-md mb-2"
    />
  </div>
</template>
```

### 3.2 Update `components/order/CartSidebar.vue`

```vue
<template>
  <div 
    :role="region" 
    aria-live="polite" 
    aria-label="Order summary and cart"
    class="bg-gray-800 p-6 rounded-lg"
  >
    <h2 class="text-2xl font-bold text-white mb-4">
      🛒 Order Summary
      <span class="text-sm text-gray-400">({{ cartItems.length }} items)</span>
    </h2>

    <!-- Cart Items with accessible buttons -->
    <div class="space-y-2 mb-4">
      <div 
        v-for="item in cartItems" 
        :key="item.id"
        class="flex items-center justify-between bg-gray-700 p-3 rounded"
      >
        <div>
          <p class="font-semibold text-white">{{ item.name }}</p>
          <p class="text-sm text-gray-400">₱{{ formatCurrency(item.price) }} × {{ item.quantity }}</p>
        </div>

        <div class="flex gap-2">
          <button 
            @click="updateQuantity(item.id, item.quantity - 1)"
            :aria-label="`Decrease ${item.name} quantity`"
            class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded"
          >
            −
          </button>

          <span 
            :aria-label="`${item.name} quantity is ${item.quantity}`"
            class="px-3 py-1 text-white"
          >
            {{ item.quantity }}
          </span>

          <button 
            @click="updateQuantity(item.id, item.quantity + 1)"
            :aria-label="`Increase ${item.name} quantity`"
            class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded"
          >
            +
          </button>

          <button 
            @click="removeItem(item.id)"
            :aria-label="`Remove ${item.name} from cart`"
            class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Totals with aria labels -->
    <div 
      class="border-t border-gray-600 pt-4"
      aria-label="Order totals"
    >
      <div class="flex justify-between mb-2">
        <span>Subtotal:</span>
        <span :aria-label="`Subtotal: ₱${formatCurrency(subtotal)}`">
          ₱{{ formatCurrency(subtotal) }}
        </span>
      </div>
      <div class="flex justify-between mb-4">
        <span>Tax:</span>
        <span :aria-label="`Tax: ₱${formatCurrency(tax)}`">
          ₱{{ formatCurrency(tax) }}
        </span>
      </div>
      <div class="flex justify-between text-lg font-bold text-orange-400">
        <span>TOTAL:</span>
        <span :aria-label="`Total amount: ₱${formatCurrency(total)}`">
          ₱{{ formatCurrency(total) }}
        </span>
      </div>
    </div>

    <!-- Submit button -->
    <button 
      @click="submitOrder"
      :disabled="!canSubmit"
      :aria-label="`Submit order. Total: ₱${formatCurrency(total)}`"
      :aria-describedby="canSubmit ? '' : 'submit-disabled-reason'"
      class="w-full mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg font-bold transition"
    >
      Place Order
    </button>

    <p v-if="!canSubmit" id="submit-disabled-reason" class="text-xs text-red-400 mt-2">
      Please select a package, add items, and ensure table is assigned
    </p>
  </div>
</template>
```

---

## Testing Checklist for Phase 1

```typescript
// test/order-history.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import OrderHistory from '~/pages/order/history.vue'

describe('Order History Page', () => {
  let store: any

  beforeEach(() => {
    // Mock store
    store = {
      fetchOrderHistory: vi.fn(() => Promise.resolve()),
      orderHistory: [
        {
          id: 1,
          order_number: 'ORD-001',
          status: 'completed',
          total: 1500,
          guest_count: 2,
          items: [],
          created_at: new Date().toISOString()
        }
      ],
      orderHistoryLoading: false
    }
  })

  it('fetches order history on mount', async () => {
    const wrapper = mount(OrderHistory, {
      global: { mocks: { orderStore: store } }
    })
    expect(store.fetchOrderHistory).toHaveBeenCalled()
  })

  it('displays order history cards', async () => {
    const wrapper = mount(OrderHistory, {
      global: { mocks: { orderStore: store } }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.order-card').exists()).toBe(true)
  })

  it('shows empty state when no history', async () => {
    store.orderHistory = []
    const wrapper = mount(OrderHistory, {
      global: { mocks: { orderStore: store } }
    })
    expect(wrapper.text()).toContain('No orders yet')
  })

  it('handles reorder action', async () => {
    store.reorderPreviousOrder = vi.fn(() => Promise.resolve())
    const wrapper = mount(OrderHistory, {
      global: { mocks: { orderStore: store } }
    })
    await wrapper.vm.$nextTick()
    
    const reorderBtn = wrapper.find('[aria-label*="Reorder"]')
    await reorderBtn.trigger('click')
    
    expect(store.reorderPreviousOrder).toHaveBeenCalledWith(1)
  })
})
```

---

## Deployment Checklist

- [ ] Backend API endpoints created & tested
- [ ] Frontend store actions work with real API
- [ ] Components render without errors
- [ ] Error handling works (network failures, validation)
- [ ] ARIA labels added
- [ ] Keyboard navigation tested (Tab, Enter, ESC)
- [ ] Mobile responsive (landscape tablet)
- [ ] Performance acceptable (< 2s load time)
- [ ] Browser console clean (no errors)
- [ ] PWA service worker caches new pages
- [ ] Tested on actual device (iPad/Android tablet)

---

**End of Implementation Guide**
