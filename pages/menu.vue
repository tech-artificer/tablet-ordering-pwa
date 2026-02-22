<script setup lang="ts">
import { ref, computed, toRef, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { formatCurrency } from '../utils/formats';
import { useApi } from '../composables/useApi';
import MenuHeader from '../components/menu/MenuHeader.vue';
import MenuCategoryTabs from '../components/menu/MenuCategoryTabs.vue';
import GroupedMeatsList from '../components/menu/GroupedMeatsList.vue';
import MenuItemGrid from '../components/menu/MenuItemGrid.vue';
import CartSidebar from '../components/order/CartSidebar.vue';
import AssistanceDrawer from '../components/menu/AssistanceDrawer.vue';
import OrderSummaryDrawer from '../components/order/OrderSummaryDrawer.vue';
import SupportFab from '../components/menu/SupportFab.vue';
import RefillButton from '../components/menu/RefillButton.vue';
import { useGuestReset } from '../composables/useGuestReset';
import { recoverActiveOrderState } from '../composables/useActiveOrderRecovery';
import { useSessionStore } from '../stores/Session';
import { logger } from '../utils/logger';
import { notifyWarning } from '../composables/useNotifier';
import { useDeviceStore } from '../stores/Device';
import { useMenuStore } from '../stores/Menu';
import { useOrderStore } from '../stores/Order';

const menuStore = useMenuStore();
const orderStore = useOrderStore();
const sessionStore = useSessionStore();
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  // Debug: Log initial state before initialization
  const timestamp = new Date().toISOString()
  console.log(`[🍽️ Menu Screen Loaded] at ${timestamp}`)
  console.log('[Menu] onMounted - Initial state:', {
    'sessionStore.orderId': sessionStore.orderId,
    'sessionStore.sessionId': sessionStore.sessionId,
    'sessionStore.isActive': sessionStore.isActive,
    'orderStore.hasPlacedOrder': orderStore.hasPlacedOrder,
    'orderStore.currentOrder': orderStore.currentOrder,
    'orderStore.isRefillMode': orderStore.isRefillMode
  })


  const recovery = await recoverActiveOrderState('menu')
  const hasPackageSelection = !!route.query.packageId
  const explicitMenuResume = route.query.resumeMenu === '1'
  const allowMenuAccess = hasPackageSelection || orderStore.isRefillMode || explicitMenuResume

  // If an active order is recovered and not allowed to access menu, stay on menu page and enable refill mode
  if (recovery.hasActiveOrder && !allowMenuAccess) {
    console.log(`[↩️ Menu: Active order ${recovery.orderId} recovered, staying on menu and enabling refill mode at ${timestamp}`)
    orderStore.toggleRefillMode(true)
    // Optionally, show a notification
    ElMessage.info('Active order recovered. Refill mode enabled.')
    // Do not redirect
    // return
  }

  // Log package details if an existing order is detected by middleware
  if (recovery.hasActiveOrder && selectedPackageId.value) {
    const packageId = Number(selectedPackageId.value);
    const packageDetails = menuStore.packageDetails[packageId];
    console.log('[Menu] API packageDetails.allowed_menus:', {
      meat: packageDetails?.allowed_menus?.meat,
      modifiers: packageDetails?.allowed_menus?.modifiers
    });
  }

  // If we recovered an active order but no packageId in route, attempt to infer package from the recovered order
  if (recovery.hasActiveOrder && !selectedPackageId.value) {
    try {
      const orderObj = orderStore.currentOrder?.order || orderStore.currentOrder;
      let inferredPackageId = null;

      // Check common fields first
      if (orderObj?.package_id) inferredPackageId = Number(orderObj.package_id);
      if (!inferredPackageId && orderObj?.menu_id) inferredPackageId = Number(orderObj.menu_id);

      // Fallback: inspect order items for an item marked as package/is_package
      if (!inferredPackageId && Array.isArray(orderObj?.items)) {
        const pkgItem = orderObj.items.find((it: any) => it.is_package || it.isPackage || it.is_package === true);
        if (pkgItem) inferredPackageId = Number(pkgItem.menu_id || pkgItem.menuId || pkgItem.id);
      }

      // If we found a package id, set it and fetch package details
      if (inferredPackageId) {
        console.log('[Menu] Inferred packageId from recovered order:', inferredPackageId);
        selectedPackageId.value = String(inferredPackageId);
        try {
          const pd = await menuStore.fetchPackageDetails(inferredPackageId as number);
          console.log('[Menu] fetchPackageDetails result:', pd);
        } catch (err) {
          console.warn('[Menu] fetchPackageDetails failed for inferred package:', inferredPackageId, err);
        }
      } else {
        console.warn('[Menu] Could not infer packageId from recovered order; no package details will be fetched');
      }
    } catch (err) {
      console.warn('[Menu] Error while inferring package from recovered order:', err);
    }
  }

  const orderStatus = orderStore.currentOrder?.order?.status || orderStore.currentOrder?.status
  console.log(`[✅ Menu Ready] Order status=${orderStatus || 'none'}, ready for selections at ${timestamp}`)

  // Load package details with allowed menus
  if (selectedPackageId.value) {
    try {
      console.log(`[📦 Loading Package Details] package_id=${selectedPackageId.value} at ${timestamp}`);
      logger.info('[Menu] Loading package details for package:', selectedPackageId.value);
      await menuStore.fetchPackageDetails(Number(selectedPackageId.value));
      console.log(`[✅ Package Details Loaded] Allowed menus available for selection at ${timestamp}`)
      logger.info('[Menu] Package details loaded');
    } catch (error) {
      console.error(`[❌ Package Load Failed] ${error?.message} at ${timestamp}`);
      logger.error('[Menu] Failed to load package details:', error);
    }
  }
})

// Get selected package from route or store
const selectedPackageId = ref(route.query.packageId || null);
const selectedPackage = computed(() => {
  if (!selectedPackageId.value) return null;
  return menuStore.packages.find(pkg => pkg.id === Number(selectedPackageId.value));
});

// Number of guests (persisted in order store)
const guestCount = toRef(orderStore, 'guestCount');

// Sync selected package to order store
watch(selectedPackage, (newPackage) => {
  if (newPackage) {
    orderStore.setPackage(newPackage);
  }
}, { immediate: true });

// Watch for order completion status changes and redirect when completed
watch(
  () => orderStore.currentOrder?.order?.status || orderStore.currentOrder?.status,
  (newStatus) => {
    if (newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'voided') {
      logger.info('📢 Order status changed to:', newStatus, '- ending session')
      setTimeout(() => {
        sessionStore.end()
        router.replace('/')
      }, 2000)
    }
  }
)

// Menu categories
type MenuCategory = 'meats' | 'sides' | 'desserts' | 'beverages';

const activeCategory = ref<MenuCategory>('meats');

const categories = [
  { id: 'meats', label: 'Meats', icon: '🥩' },
  { id: 'sides', label: 'Sides', icon: '🍚' },
  { id: 'desserts', label: 'Desserts', icon: '🍰' },
  { id: 'beverages', label: 'Beverages', icon: '🥤' }
] as const;

// Support request buttons
const supportRequests = [
  { id: 'clean', label: 'Clean Table', icon: '🧹', type: 'warning' },
  { id: 'water', label: 'Water', icon: '💧', type: 'primary' },
  { id: 'billing', label: 'Request Bill', icon: '💳', type: 'success' },
  { id: 'refill', label: 'Order Refill', icon: '🔄', type: 'info' }
];

// Check if refills are available (order placed AND we have a valid order ID)
const canRequestRefill = computed(() => {
  const hasOrder = orderStore.hasPlacedOrder && !!sessionStore.orderId
  console.log('[Refill] canRequestRefill check:', { hasPlacedOrder: orderStore.hasPlacedOrder, orderId: sessionStore.orderId, result: hasOrder })
  return hasOrder
})

// Order summary now uses the order store
const UNLIMITED_ITEM_CAP = 5;

const getItemQuantity = (itemId: number) => {
  return orderStore.getCartItemQuantity(Number(itemId))
};

// Get meats from selected package allowed menus (from API)
const meats = computed(() => {
  if (!selectedPackageId.value) return [];
  const packageId = Number(selectedPackageId.value);
  const packageDetails = menuStore.packageDetails[packageId];
  // Primary: API-driven meats for this package
  if (packageDetails && Array.isArray(packageDetails.allowed_menus?.meat) && packageDetails.allowed_menus.meat.length > 0) {
    return packageDetails.allowed_menus.meat;
  }
  // Fallback: legacy modifiers for this package
  const pkg = menuStore.packages.find(pkg => pkg.id === packageId);
  if (pkg?.modifiers && pkg.modifiers.length > 0) {
    return pkg.modifiers.flat();
  }
  // If both missing, return empty array (UI will show 'No meats available')
  return [];
});

// Get modifiers from selected package allowed menus (from API)
const modifiers = computed(() => {
  if (!selectedPackageId.value) return [];
  const packageId = Number(selectedPackageId.value);
  const packageDetails = menuStore.packageDetails[packageId];
  // Permanent: Only consume allowed_menus.modifiers from API contract
  return Array.isArray(packageDetails?.allowed_menus?.modifiers) ? packageDetails.allowed_menus.modifiers : [];
});

// Get items based on active category for MenuItemGrid
const displayItems = computed(() => {
  const baseItems = (() => {
    switch (activeCategory.value) {
      case 'meats':
        return meats.value;
      case 'sides':
        return menuStore.sides;
      case 'desserts':
        return menuStore.desserts;
      case 'beverages':
        return menuStore.beverages;
      default:
        return [];
    }
  })();

  // In refill mode, only show unlimited items (meats and sides)
  if (orderStore.isRefillMode) {
    // Filter out AllowedMenu types, only allow MenuItem or Modifier
    return baseItems.filter((item: any) => {
      return (activeCategory.value === 'meats' || activeCategory.value === 'sides') && (item?.group || item?.category || item?.name || item?.img_url);
    });
  }

  // Filter out AllowedMenu types for menu-item-grid
  return baseItems.filter((item: any) => item?.group || item?.category || item?.name || item?.img_url);
});

// Filter categories in refill mode
const availableCategories = computed(() => {
  if (orderStore.isRefillMode) {
    return categories.filter(cat => cat.id === 'meats' || cat.id === 'sides');
  }
  return categories;
});

const isUnlimitedCategory = computed(() => activeCategory.value === 'meats' || activeCategory.value === 'sides')

// Totals are derived from the order store
const packageTotal = computed(() => orderStore.packageTotal)
const addOnsTotal = computed(() => orderStore.addOnsTotal)
const taxAmount = computed(() => orderStore.taxAmount)
const grandTotal = computed(() => orderStore.grandTotal)


logger.debug(selectedPackage)
const setCategory = (category: MenuCategory) => {
  activeCategory.value = category;
  // If user navigates to a category and data is empty, attempt to fetch it on-demand
  (async () => {
    try {
      switch (category) {
        case 'desserts':
          if ((!menuStore.desserts || menuStore.desserts.length === 0) && !menuStore.loading.desserts) await menuStore.fetchDesserts();
          break;
        case 'sides':
          if ((!menuStore.sides || menuStore.sides.length === 0) && !menuStore.loading.sides) await menuStore.fetchSides();
          break;
        case 'beverages':
          if ((!menuStore.beverages || menuStore.beverages.length === 0) && !menuStore.loading.beverages) await menuStore.fetchBeverages();
          break;
      }
    } catch (e) {
      logger.warn('[Menu] on-demand fetch failed for category', category, e)
    }
  })()
};

// Add item to order
const addToOrder = (item: any) => {
  const isUnlimited = activeCategory.value === 'meats' || activeCategory.value === 'sides'
  const category = activeCategory.value
  orderStore.addToCart(item, { isUnlimited, category })
};

// Remove item from order
const removeFromOrder = (itemId: number) => {
  orderStore.remove(Number(itemId))
};

// Update item quantity
const updateQuantity = (itemId: number, quantity: number) => {
  orderStore.updateQuantity(Number(itemId), Number(quantity))
};

// Assistance drawer state and sender
const assistanceDrawerVisible = ref(false);
const isSendingSupport = ref(false);
const api = useApi();
const deviceStore = useDeviceStore();

// Activate guest-count reset watcher (composable)
useGuestReset()

// Support request handler
const handleSupportRequest = async (type: string) => {
  if (isSendingSupport.value) return
  isSendingSupport.value = true

  const payload = {
    type: type,
    table_service_id: getServiceTypeId(type),
    order_id: sessionStore.orderId ?? null,
    session_id: sessionStore.sessionId ?? null,
    table_id: deviceStore.table.value?.id ?? null
  }

  try {
    await api.post('/api/service/request', payload)
    // ElMessage.success('Staff will assist you shortly')
  } catch (err) {
    logger.warn('Support request failed:', err)
    // ElMessage.warning('Request queued — staff will be notified')
  } finally {
    isSendingSupport.value = false
  }
}

// Map support types to service IDs (adjust based on your backend)
const getServiceTypeId = (type: string): number => {
  const serviceMap: Record<string, number> = {
    'clean': 1,
    'water': 2,
    'billing': 3,
    'support': 4
  }
  return serviceMap[type] || 4
}

// Refill mode toggle
const toggleRefillMode = () => {
  // Check if order has been placed AND confirmed by server
  if (!orderStore.hasPlacedOrder) {
    console.log('[Refill] Blocked: hasPlacedOrder =', orderStore.hasPlacedOrder)
    ElMessage.warning('Please place and confirm your order first before requesting refills')
    return
  }
  
  // Verify we have an order ID from the server
  if (!sessionStore.orderId) {
    console.log('[Refill] Blocked: sessionStore.orderId =', sessionStore.orderId)
    ElMessage.warning('Waiting for order confirmation from server...')
    return
  }
  
  console.log('[Refill] Toggling refill mode, current:', orderStore.isRefillMode)
  const newMode = !orderStore.isRefillMode
  orderStore.toggleRefillMode(newMode)
  
  if (newMode) {
    // Switch to meats category when entering refill mode
    activeCategory.value = 'meats'
    ElMessage.info('Refill mode: Only unlimited items available')
  } else {
    ElMessage.info('Back to regular menu')
  }
}

// Check if category is loading
const isLoading = computed((): boolean => {
  switch (activeCategory.value) {
    case 'sides':
      return Boolean(menuStore.isLoadingSides);
    case 'desserts':
      return Boolean(menuStore.isLoadingDesserts);
    case 'beverages':
      return Boolean(menuStore.isLoadingBeverages);
    default:
      return false;
  }
});

// Check for errors
const categoryError = computed(() => {
  switch (activeCategory.value) {
    case 'sides':
      return menuStore.errors.sides;
    case 'desserts':
      return menuStore.errors.desserts;
    case 'beverages':
      return menuStore.errors.beverages;
    default:
      return null;
  }
});

// Order drawer state is now managed by the `OrderSummaryDrawer` component
const isOrderDrawerOpen = ref(false)
const openOrderDrawer = () => {
  logger.debug('openOrderDrawer called')
  // If an initial order has already been placed and we're not in refill mode,
  // prevent opening the order drawer for a new order.
  if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
    // Inform the user they can only request refills
    notifyWarning('Order already placed — use Refill to add items')
    logger.warn('Order already placed; only refill allowed')
    return
  }
  isOrderDrawerOpen.value = true
  // Start countdown automatically when drawer opens
  startCountdown()
}

// Page-managed submission UI state (countdown, submit, undo)
const isCountingDown = ref(false)
const countdown = ref(5)
const isSubmitting = ref(false)
const placeOrderError = ref<string | null>(null)
const orderSnapshot = ref<any | null>(null)
const showSuccessBanner = ref(false)
const countdownIntervalId = ref<number | null>(null)
const undoTimerId = ref<number | null>(null)

function startCountdown() {
  if (isSubmitting.value) return
  countdown.value = 5
  isCountingDown.value = true
  countdownIntervalId.value = window.setInterval(() => {
    countdown.value = countdown.value - 1
    if (countdown.value <= 0) {
      if (countdownIntervalId.value) { clearInterval(countdownIntervalId.value); countdownIntervalId.value = null }
      confirmOrder()
    }
  }, 1000)
}

function cancelCountdown() {
  if (countdownIntervalId.value) { clearInterval(countdownIntervalId.value); countdownIntervalId.value = null }
  isCountingDown.value = false
  countdown.value = 5
}

async function confirmOrder() {
  logger.debug('confirmOrder called')
  if (isSubmitting.value) return
  isSubmitting.value = true
  placeOrderError.value = null

  const currentCart = orderStore.isRefillMode ? orderStore.refillItems : orderStore.cartItems
  orderSnapshot.value = {
    cartItems: JSON.parse(JSON.stringify(currentCart)),
    guestCount: Number(orderStore.guestCount),
    isRefill: orderStore.isRefillMode
  }
  try { sessionStorage.setItem('orderSnapshot', JSON.stringify(orderSnapshot.value)) } catch (e) { }

  try {
    if (orderStore.isRefillMode) {
      // Submit refill order
      await orderStore.submitRefill()
      // ElMessage.success('Refill order placed successfully!')
    } else {
      // Submit regular order
      const payload = orderStore.buildPayload()
      logger.debug('Order Payload:', payload)
      await orderStore.submitOrder(payload)
      // ElMessage.success('Order placed successfully!')
    }
    
    isSubmitting.value = false
    isCountingDown.value = false
    isOrderDrawerOpen.value = false

    showSuccessBanner.value = true
    try { sessionStorage.setItem('orderSnapshot', JSON.stringify(orderSnapshot.value)) } catch (e) { }
    undoTimerId.value = window.setTimeout(() => {
      showSuccessBanner.value = false
      orderSnapshot.value = null
      try { sessionStorage.removeItem('orderSnapshot') } catch (e) { }
      undoTimerId.value = null
    }, 5000)
  } catch (err: any) {
    isSubmitting.value = false
    isCountingDown.value = false
    placeOrderError.value = err?.message || String(err)
    const errorMsg = orderStore.isRefillMode ? 'Failed to place refill order' : 'Failed to place order'
    // ElMessage.error(placeOrderError.value || errorMsg)
  }
}

function modifyDuringCountdown() {
  cancelCountdown()
  isOrderDrawerOpen.value = true
}
</script>

<template>
  <div class="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- Category Filter Tabs -->
      <div class="sticky top-0 z-10">
        <div class="max-w-7xl mx-auto">
          <!-- Refill Mode Indicator -->
          <div v-if="orderStore.isRefillMode" class="bg-green-500/20 border-b border-green-500/30 px-6 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🔄</span>
                <div>
                  <p class="font-bold text-green-400">Refill Mode Active</p>
                  <p class="text-sm text-green-300/80">Only unlimited items available (Meats & Sides)</p>
                </div>
              </div>
              <refill-button 
                :has-placed-order="orderStore.hasPlacedOrder"
                :is-refill-mode="orderStore.isRefillMode"
                @toggle-refill-mode="toggleRefillMode"
              />
            </div>
          </div>
          
          <menu-category-tabs 
            :categories="availableCategories" 
            :active-category="activeCategory" 
            :sticky="true"
            @select="setCategory" 
          />
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-7xl mx-auto">

          <!-- Loading State -->
          <div v-if="isLoading" class="space-y-6">
            <component 
              v-for="i in 3" 
              :key="`skeleton-${i}`" 
              :is="() => import('~/components/ui/SkeletonCard.vue')" 
            />
          </div>

          <!-- Error State -->
          <div v-else-if="categoryError" class="flex justify-center">
            <el-card class="max-w-md bg-red-500/20">
              <template #header>
                <span class="text-on font-semibold">Error Loading {{ activeCategory }}</span>
              </template>
              <p class="text-on mb-4">{{ categoryError }}</p>
              <el-button type="danger"
                @click="menuStore[`fetch${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}`]()">
                Try Again
              </el-button>
            </el-card>
          </div>

          <!-- Meats View (Grouped by Category) -->
          <div v-else-if="activeCategory === 'meats'">
            <grouped-meats-list :meats="meats" :get-item-quantity="getItemQuantity" :max-quantity="UNLIMITED_ITEM_CAP"
              @add-item="addToOrder" />
          </div>

          <!-- Other Categories View -->
          <div v-else>
            <menu-item-grid :items="displayItems" :category-type="activeCategory"
              :is-unlimited-category="isUnlimitedCategory" :get-item-quantity="getItemQuantity"
              :max-quantity="UNLIMITED_ITEM_CAP" :loading="isLoading" @add-item="addToOrder" />
          </div>

        </div>
      </div>

    </div>

    <!-- Order Summary Sidebar -->
    
    <cart-sidebar 
      :selected-package="selectedPackage" 
      :guest-count="guestCount" 
      :cart-items="orderStore.activeCart"
      :package-total="orderStore.isRefillMode ? 0 : packageTotal" 
      :add-ons-total="orderStore.isRefillMode ? orderStore.refillTotal : addOnsTotal" 
      :tax-amount="orderStore.isRefillMode ? 0 : taxAmount" 
      :grand-total="orderStore.isRefillMode ? orderStore.refillTotal : grandTotal"
      :unlimited-item-cap="UNLIMITED_ITEM_CAP" 
      :is-refill-mode="orderStore.isRefillMode"
      :has-placed-order="orderStore.hasPlacedOrder"
      @update-quantity="updateQuantity" 
      @remove-item="removeFromOrder"
      @set-guest-count="(count) => orderStore.setGuestCount(count)"
      @submit-order="openOrderDrawer"
      @toggle-refill-mode="toggleRefillMode"
    />

  </div>

  <!-- Order Confirmation Drawer (component) -->
  <order-summary-drawer 
    v-model="isOrderDrawerOpen" 
    :selectedPackage="selectedPackage" 
    :guestCount="guestCount"
    :cartItems="orderStore.activeCart" 
    :packageTotal="orderStore.isRefillMode ? 0 : packageTotal" 
    :addOnsTotal="orderStore.isRefillMode ? orderStore.refillTotal : addOnsTotal" 
    :taxAmount="orderStore.isRefillMode ? 0 : taxAmount"
    :grandTotal="orderStore.isRefillMode ? orderStore.refillTotal : grandTotal" 
    :isCountingDown="isCountingDown" 
    :countdown="countdown" 
    :placeOrderError="placeOrderError"
    :isSubmitting="orderStore.isSubmitting" 
    :is-refill-mode="orderStore.isRefillMode"
    @confirm="confirmOrder"
    @cancel="() => { if (isCountingDown) cancelCountdown(); else isOrderDrawerOpen = false }"
    @modify="modifyDuringCountdown" 
  />

  <!-- Support FAB -->
  <support-fab @request-support="handleSupportRequest" />
  
  <!-- Refill Toggle Button (floating, visible after order placed or recovered) -->
  <div v-if="canRequestRefill && !orderStore.isRefillMode" class="fixed bottom-24 left-24 z-40">
    <refill-button 
      :has-placed-order="canRequestRefill"
      :is-refill-mode="orderStore.isRefillMode"
      @toggle-refill-mode="toggleRefillMode"
    />
  </div>

  <!-- Assistance Drawer (legacy - can be removed if not needed) -->
  <assistance-drawer 
    v-model="assistanceDrawerVisible" 
    :support-requests="supportRequests"
    :is-sending="isSendingSupport" 
    @send-request="handleSupportRequest" 
  />

  <!-- Order Success Banner -->
  <Transition name="slide-down">
    <div 
      v-if="showSuccessBanner" 
      class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    >
      <div class="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-once pointer-events-auto">
        <span class="text-3xl">✅</span>
        <div>
          <p class="font-bold text-lg">{{ orderStore.isRefillMode ? 'Refill Order Placed!' : 'Order Placed Successfully!' }}</p>
          <p class="text-sm text-green-100">Your order is being prepared</p>
        </div>
      </div>
    </div>
  </Transition>

</template>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Line clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Element Plus custom styling */
:deep(.el-card) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
}

:deep(.el-divider) {
  background-color: rgba(255, 255, 255, 0.2);
}

:deep(.el-badge__content) {
  border: none;
}

/* Success banner transitions */
.slide-down-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-down-leave-active {
  transition: all 0.3s ease-in;
}
.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.slide-down-leave-to {
  transform: translateY(-50%);
  opacity: 0;
}

/* Bounce once animation */
@keyframes bounce-once {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-8px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-4px); }
}
.animate-bounce-once {
  animation: bounce-once 0.6s ease-out 0.2s;
}
</style>