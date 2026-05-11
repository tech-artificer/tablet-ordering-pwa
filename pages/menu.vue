<script setup lang="ts">
import { computed, onMounted, ref, toRef, unref, watch } from "vue"
import { Beef, UtensilsCrossed, CakeSlice, Wine } from "lucide-vue-next"
import { useApi } from "../composables/useApi"
import { useGuestReset } from "../composables/useGuestReset"
import { recoverActiveOrderState, shouldAttemptActiveOrderRecovery } from "../composables/useActiveOrderRecovery"
import { useSessionStore } from "../stores/Session"
import { useSessionEndFlow } from "../composables/useSessionEndFlow"
import { logger } from "../utils/logger"
import { notifyWarning, notifyInfo } from "../composables/useNotifier"
import { useDeviceStore } from "../stores/Device"
import { useMenuStore } from "../stores/Menu"
import { useOrderStore } from "../stores/Order"

definePageMeta({
    layout: "kiosk"
})

const menuStore = useMenuStore()
const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const route = useRoute()
const router = useRouter()

const hasLiveOrderReference = (): boolean => {
    const currentOrder = (unref(orderStore.currentOrder) as any)?.order ?? unref(orderStore.currentOrder)
    return Boolean(unref(sessionStore.orderId) || currentOrder?.order_id || currentOrder?.id)
}

const hasConfirmedInitialOrder = computed(() => {
    if (typeof orderStore.hasConfirmedInitialOrder === "function") {
        return orderStore.hasConfirmedInitialOrder()
    }
    return Boolean(unref(orderStore.hasPlacedOrder) && hasLiveOrderReference())
})

onMounted(async () => {
    if (menuStore.packages.length === 0 || menuStore.isCacheStale) {
        try {
            await menuStore.loadAllMenus()
        } catch (error) {
            logger.warn("[Menu] Initial loadAllMenus failed:", error)
        }
    }

    const recovery = shouldAttemptActiveOrderRecovery()
        ? await recoverActiveOrderState("menu")
        : {
            hasActiveOrder: false,
            isTerminal: false,
            orderId: null,
            packageId: null,
            status: "",
        }

    if (recovery.packageId && !route.query.packageId) {
        selectedPackageId.value = String(recovery.packageId)
    }

    const hasPackageSelection = !!selectedPackageId.value
    const explicitMenuResume = route.query.resumeMenu === "1"
    const allowMenuAccess = hasPackageSelection || orderStore.isRefillMode || explicitMenuResume

    // If an active order is recovered and not already in refill mode, enable refill mode.
    // This must happen regardless of whether a package is known — the order is already
    // placed, so the user should be building a refill, not a new initial order.
    // Guard with !orderStore.isRefillMode to avoid clearing in-progress refill items.
    if (recovery.hasActiveOrder && hasConfirmedInitialOrder.value && !orderStore.isRefillMode) {
        orderStore.toggleRefillMode(true)
        if (!allowMenuAccess) {
            notifyInfo("Active order recovered. Refill mode enabled.")
        }
    }

    // Log package details if an existing order is detected by middleware
    if (recovery.hasActiveOrder && selectedPackageId.value) {
    // package details pre-loaded for recovered order
    }

    // If we recovered an active order but no packageId in route, attempt to infer package from the recovered order
    if (recovery.hasActiveOrder && !selectedPackageId.value) {
        try {
            const currentOrder = orderStore.getCurrentOrder()
            const orderObj = ((currentOrder?.order || currentOrder) as any) || null
            let inferredPackageId = null

            // Check common fields first
            if (orderObj?.package_id) { inferredPackageId = Number(orderObj.package_id) }
            if (!inferredPackageId && orderObj?.menu_id) { inferredPackageId = Number(orderObj.menu_id) }

            // Fallback: inspect order items for an item marked as package/is_package
            if (!inferredPackageId && Array.isArray(orderObj?.items)) {
                const pkgItem = orderObj.items.find((it: any) => it.is_package || it.isPackage || it.is_package === true)
                if (pkgItem) { inferredPackageId = Number(pkgItem.menu_id || pkgItem.menuId || pkgItem.id) }
            }

            // If we found a package id, set it and fetch package details
            if (inferredPackageId) {
                selectedPackageId.value = String(inferredPackageId)
                try {
                    await menuStore.fetchPackageDetails(inferredPackageId as number)
                } catch (err) {
                    logger.warn("[Menu] fetchPackageDetails failed for inferred package:", inferredPackageId, err)
                }
            } else {
                logger.warn("[Menu] Could not infer packageId from recovered order")
            }
        } catch (err) {
            logger.warn("[Menu] Error while inferring package from recovered order:", err)
        }
    }

    // Cart recovery notification: if session is active with a placed order but cart is empty
    // AND nothing has been submitted yet — the in-progress cart was likely lost.
    // Do NOT fire if:
    //   a) we just recovered an active order from the server (submittedItems will naturally
    //      be empty because the server response does not carry display-friendly items), OR
    //   b) the user navigated back after a successful submission (submittedItems non-empty).
    if (
        !recovery.hasActiveOrder &&
        sessionStore.isActive &&
        hasConfirmedInitialOrder.value &&
        !orderStore.isRefillMode &&
        orderStore.getCartItems().length === 0 &&
        orderStore.getSubmittedItems().length === 0
    ) {
        notifyWarning("Your cart was cleared. Please re-add your items.")
        logger.warn("[Menu] Cart items missing for active session — notified user of cart loss")
    }

    // Load package details with allowed menus
    if (selectedPackageId.value) {
        meatError.value = null
        try {
            logger.info("[Menu] Loading package details for package:", selectedPackageId.value)
            await menuStore.fetchPackageDetails(Number(selectedPackageId.value))
            logger.info("[Menu] Package details loaded")
        } catch (error) {
            meatError.value = (error as Error).message || "Failed to load meats — tap to retry"
            logger.error("[Menu] Failed to load package details:", error)
        }
    }
})

const resolveStoredPackageId = (): string | number | null => {
    const orderStoreWithPackage = orderStore as unknown as { getPackage?: unknown; package?: unknown }
    const packageFromGetter = orderStoreWithPackage.getPackage
    let normalizedPackage: unknown = null

    if (typeof packageFromGetter === "function") {
        normalizedPackage = packageFromGetter()
    } else if (packageFromGetter && typeof packageFromGetter === "object" && "value" in packageFromGetter) {
        normalizedPackage = (packageFromGetter as { value?: unknown }).value
    } else if (packageFromGetter !== undefined) {
        normalizedPackage = packageFromGetter
    } else {
        normalizedPackage = orderStoreWithPackage.package
    }

    const packageIdRaw = normalizedPackage && typeof normalizedPackage === "object" && "id" in normalizedPackage
        ? (normalizedPackage as { id?: unknown }).id
        : null
    const packageId = Number(packageIdRaw ?? 0)
    return Number.isFinite(packageId) && packageId > 0 ? packageId : null
}

// Get selected package from route or store
const selectedPackageId = ref(route.query.packageId || resolveStoredPackageId())
const selectedPackage = computed(() => {
    if (!selectedPackageId.value) { return null }
    return menuStore.packages.find(pkg => pkg.id === Number(selectedPackageId.value))
})

// Number of guests (persisted in order store)
const guestCount = toRef(orderStore, "guestCount")

// Sync selected package to order store
watch(selectedPackage, (newPackage) => {
    if (newPackage) {
        orderStore.setPackage(newPackage)
    }
}, { immediate: true })

// Restore package if the order store is cleared unexpectedly (e.g. by a session resync
// or a spurious sessionStore.end() call) while the user is still on the menu screen.
// The existing watch above only fires when selectedPackage changes — it won't fire if
// selectedPackage stays the same but orderStore.package is cleared to null underneath.
// Guard: only restore when the session is still active. clearInternal() sets isActive=false
// BEFORE calling clearPackage(), so this check reliably prevents the watcher from undoing
// a legitimate session-end cleanup and overwriting the explicit null in localStorage.
watch(() => orderStore.package, (storePackage) => {
    if (!storePackage && selectedPackage.value && sessionStore.isActive) {
        logger.warn("[Menu] orderStore.package was cleared while on menu — restoring from selectedPackage")
        orderStore.setPackage(selectedPackage.value)
    }
})

// Watch for order completion status changes and redirect when completed
const { triggerSessionEnd } = useSessionEndFlow()
watch(
    () => orderStore.getCurrentOrderStatus(),
    (newStatus) => {
        if (newStatus === "completed" || newStatus === "cancelled" || newStatus === "voided") {
            logger.info("📢 Order status changed to:", newStatus, "- ending session")
            triggerSessionEnd(newStatus as "completed" | "cancelled" | "voided", {
                source: "watcher",
            })
        }
    }
)

// Menu categories
type MenuCategory = "meats" | "sides" | "desserts" | "beverages";

const activeCategory = ref<MenuCategory>("meats")

const categories = [
    { id: "meats", label: "Meats", icon: Beef },
    { id: "sides", label: "Sides", icon: UtensilsCrossed },
    { id: "desserts", label: "Desserts", icon: CakeSlice },
    { id: "beverages", label: "Beverages", icon: Wine }
] as const

// Check if refills are available (order placed AND we have a valid order ID)
const canRequestRefill = computed(() => {
    return hasConfirmedInitialOrder.value
})

const isBackButtonDisabled = (): boolean => {
    // Back is blocked only when an active order exists (placed/recovered/live ref)
    return Boolean(
        hasConfirmedInitialOrder.value ||
        hasLiveOrderReference()
    )
}

const handleBackButtonClick = () => {
    if (isBackButtonDisabled()) { return }
    router.back()
}

// Order summary now uses the order store
const UNLIMITED_ITEM_CAP = 5

const getItemQuantity = (itemId: number) => {
    return orderStore.getCartItemQuantity(Number(itemId))
}

// Get meats from selected package allowed menus (from API)
const meats = computed(() => {
    if (!selectedPackageId.value) { return [] }
    const packageId = Number(selectedPackageId.value)
    const packageDetails = menuStore.packageDetails[packageId]
    // Primary: API-driven meats for this package
    if (packageDetails && Array.isArray(packageDetails.allowed_menus?.meat) && packageDetails.allowed_menus.meat.length > 0) {
        return packageDetails.allowed_menus.meat
    }
    // Fallback: legacy modifiers for this package
    const pkg = menuStore.packages.find(pkg => pkg.id === packageId)
    if (pkg?.modifiers && pkg.modifiers.length > 0) {
        return pkg.modifiers.flat()
    }
    // If both missing, return empty array (UI will show 'No meats available')
    return []
})

// Get items based on active category for MenuItemGrid
const displayItems = computed(() => {
    const baseItems = (() => {
        switch (activeCategory.value) {
        case "meats":
            return meats.value
        case "sides":
            return menuStore.sides
        case "desserts":
            return menuStore.desserts
        case "beverages":
            return menuStore.beverages
        default:
            return []
        }
    })()

    // In refill mode, only show unlimited items (meats and sides)
    if (orderStore.isRefillMode) {
    // Filter out AllowedMenu types, only allow MenuItem or Modifier
        return baseItems.filter((item: any) => {
            return (activeCategory.value === "meats" || activeCategory.value === "sides") && (item?.group || item?.category || item?.name || item?.img_url)
        })
    }

    // Filter out AllowedMenu types for menu-item-grid
    return baseItems.filter((item: any) => item?.group || item?.category || item?.name || item?.img_url)
})

const isUnlimitedCategory = computed(() => activeCategory.value === "meats" || activeCategory.value === "sides")

// Totals are derived from the order store
const packageTotal = computed(() => orderStore.packageTotal)
const addOnsTotal = computed(() => orderStore.addOnsTotal)
const taxAmount = computed(() => orderStore.taxAmount)
const grandTotal = computed(() => orderStore.grandTotal)

const setCategory = (category: MenuCategory) => {
    activeCategory.value = category;
    // If user navigates to a category and data is empty, attempt to fetch it on-demand
    (async () => {
        try {
            switch (category) {
            case "desserts":
                if ((!menuStore.desserts || menuStore.desserts.length === 0) && !menuStore.loading.desserts) { await menuStore.fetchDesserts() }
                break
            case "sides":
                if ((!menuStore.sides || menuStore.sides.length === 0) && !menuStore.loading.sides) { await menuStore.fetchSides() }
                break
            case "beverages":
                if ((!menuStore.beverages || menuStore.beverages.length === 0) && !menuStore.loading.beverages) { await menuStore.fetchBeverages() }
                break
            }
        } catch (e) {
            logger.warn("[Menu] on-demand fetch failed for category", category, e)
        }
    })()
}

// Retry loading the current category (used by the error state UI)
const reloadCategory = async () => {
    const category = activeCategory.value
    try {
        switch (category) {
        case "meats":
            if (selectedPackageId.value) {
                meatError.value = null
                await menuStore.fetchPackageDetails(Number(selectedPackageId.value))
            }
            break
        case "desserts":
            await menuStore.fetchDesserts()
            break
        case "sides":
            await menuStore.fetchSides()
            break
        case "beverages":
            await menuStore.fetchBeverages()
            break
        }
    } catch (e) {
        if (category === "meats") { meatError.value = (e as Error).message || "Failed to load meats" }
        logger.warn("[Menu] reloadCategory failed for", category, e)
    }
}

// Add item to order
const addToOrder = (item: any) => {
    const isUnlimited = activeCategory.value === "meats" || activeCategory.value === "sides"
    const category = activeCategory.value
    orderStore.addToCart(item, { isUnlimited, category })
}

// Remove item from order
const removeFromOrder = (itemId: number) => {
    orderStore.remove(Number(itemId))
}

// Update item quantity
const updateQuantity = (itemId: number, quantity: number) => {
    orderStore.updateQuantity(Number(itemId), Number(quantity))
}

const cartDrawerOpen = ref(false)
const isSendingSupport = ref(false)
const api = useApi()
const deviceStore = useDeviceStore()

// Activate guest-count reset watcher (composable)
useGuestReset()

// Support request handler
const handleSupportRequest = async (type: string) => {
    if (isSendingSupport.value) { return }

    // Service requests require an active order — backend validates order_id exists.
    // Guard early to avoid a guaranteed 422 before any order is placed.
    if (!sessionStore.orderId) {
        logger.warn("[Support] Service request skipped: no active order yet")
        notifyWarning("Please place your order first before calling for assistance.")
        return
    }

    isSendingSupport.value = true

    const payload = {
        type,
        table_service_id: getServiceTypeId(type),
        order_id: sessionStore.orderId,
        session_id: sessionStore.sessionId ?? null,
        table_id: deviceStore.getTableId() ?? null
    }

    try {
        await api.post("/api/service/request", payload)
    // ElMessage.success('Staff will assist you shortly')
    } catch (err) {
        logger.warn("Support request failed:", err)
    // ElMessage.warning('Request queued — staff will be notified')
    } finally {
        isSendingSupport.value = false
    }
}

// Map support types to service IDs (adjust based on your backend)
const getServiceTypeId = (type: string): number => {
    const serviceMap: Record<string, number> = {
        clean: 1,
        water: 2,
        billing: 3,
        support: 4
    }
    return serviceMap[type] || 4
}

// Navigate to order review page with package context
const handleProceedToReview = async () => {
    cartDrawerOpen.value = false

    if (!selectedPackageId.value) {
        notifyWarning("Package selection was lost. Please select a package again.")
        return
    }

    try {
        await router.push({
            path: "/order/review",
            query: { packageId: String(selectedPackageId.value) }
        })
    } catch (err) {
        logger.error("[Menu] Failed to navigate to review:", err)
        notifyWarning("Unable to proceed to order review. Please try again.")
    }
}

// Refill mode toggle
const toggleRefillMode = () => {
    // Check if order has been placed AND confirmed by server
    if (!hasConfirmedInitialOrder.value) {
        notifyWarning("Please place and confirm your order first before requesting refills")
        return
    }

    // Verify we have an order ID from the server
    if (!sessionStore.orderId) {
        notifyWarning("Waiting for order confirmation from server...")
        return
    }

    const newMode = !orderStore.isRefillMode
    orderStore.toggleRefillMode(newMode)

    if (newMode) {
        activeCategory.value = "meats"
        notifyInfo("Refill mode: Only unlimited items available")
    } else {
        notifyInfo("Back to regular menu")
    }
}

// Check if category is loading
const isLoading = computed((): boolean => {
    switch (activeCategory.value) {
    case "sides":
        return Boolean(menuStore.isLoadingSides)
    case "desserts":
        return Boolean(menuStore.isLoadingDesserts)
    case "beverages":
        return Boolean(menuStore.isLoadingBeverages)
    default:
        return Boolean(menuStore.isLoadingPackageDetails)
    }
})

// Per-category error tracking — meats uses local ref, others use store
const meatError = ref<string | null>(null)

// Check for errors
const categoryError = computed(() => {
    switch (activeCategory.value) {
    case "sides":
        return menuStore.errors.sides
    case "desserts":
        return menuStore.errors.desserts
    case "beverages":
        return menuStore.errors.beverages
    default:
        return meatError.value
    }
})

</script>

<template>
    <NuxtErrorBoundary @error="(e: Error) => { logger.error('[Menu] Uncaught page error:', e) }">
        <div class="flex h-screen bg-app-grid text-white">
            <!-- Main Content Area -->
            <div class="flex flex-col overflow-hidden w-full">
                <!-- ─── Header Bar ──────────────────────────────────────────── -->
                <menu-header
                    :selected-package="selectedPackage"
                    :table-name="(deviceStore.table as any)?.name || (deviceStore.table as any)?.table_number || 'The Grill'"
                    :has-placed-order="hasConfirmedInitialOrder"
                    :is-back-disabled="isBackButtonDisabled()"
                    :cart-count="unref(orderStore.activeCart).length"
                    @back="handleBackButtonClick"
                    @open-cart="cartDrawerOpen = true"
                />

                <!-- Category Filter Tabs -->
                <div class="sticky top-0 z-10">
                    <div>
                        <!-- Refill Mode Indicator -->
                        <refill-mode-banner
                            v-if="orderStore.isRefillMode"
                            :has-placed-order="hasConfirmedInitialOrder"
                            :is-refill-mode="orderStore.isRefillMode"
                            @toggle-refill-mode="toggleRefillMode"
                            @back-to-session="router.push('/order/in-session')"
                        />

                        <menu-category-tabs
                            :categories="categories"
                            :active-category="activeCategory"
                            :sticky="true"
                            :is-refill-mode="orderStore.isRefillMode"
                            @select="setCategory"
                        />
                    </div>
                </div>

                <!-- Content Area -->
                <div class="flex-1 overflow-y-auto p-6">
                    <div>
                        <!-- Loading State -->
                        <div v-if="isLoading" class="space-y-6">
                            <SkeletonCard v-for="i in 3" :key="`skeleton-${i}`" />
                        </div>

                        <!-- Error State -->
                        <div v-if="categoryError" class="flex justify-center">
                            <div class="max-w-md rounded-2xl bg-red-500/15 border border-red-500/30 p-6">
                                <p class="font-semibold text-red-300 mb-2">
                                    Error Loading {{ activeCategory }}
                                </p>
                                <p class="text-sm text-red-200/80 mb-4">
                                    {{ categoryError }}
                                </p>
                                <el-button
                                    type="danger"
                                    @click="reloadCategory()"
                                >
                                    Try Again
                                </el-button>
                            </div>
                        </div>

                        <!-- Meats View (Grouped by Category) -->
                        <div v-else-if="activeCategory === 'meats'">
                            <grouped-meats-list
                                :meats="meats"
                                :get-item-quantity="getItemQuantity"
                                :max-quantity="UNLIMITED_ITEM_CAP"
                                @add-item="addToOrder"
                            />
                        </div>

                        <!-- Other Categories View -->
                        <div v-else>
                            <menu-item-grid
                                :items="displayItems"
                                :category-type="activeCategory"
                                :is-unlimited-category="isUnlimitedCategory"
                                :get-item-quantity="getItemQuantity"
                                :max-quantity="UNLIMITED_ITEM_CAP"
                                :loading="isLoading"
                                @add-item="addToOrder"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ─── Order Summary Drawer (slides in from right) ─── -->
        <el-drawer
            v-model="cartDrawerOpen"
            direction="rtl"
            :with-header="false"
            :size="'min(460px, 33.333vw)'"
            :modal="true"
            :lock-scroll="false"
            class="cart-drawer"
        >
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
                :has-placed-order="hasConfirmedInitialOrder"
                @update-quantity="updateQuantity"
                @remove-item="removeFromOrder"
                @set-guest-count="(count) => orderStore.setGuestCount(count)"
                @submit-order="handleProceedToReview"
                @toggle-refill-mode="toggleRefillMode"
            />
        </el-drawer>

        <!-- Floating cart FAB — stays visible while scrolling -->
        <button
            class="fixed bottom-36 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-secondary shadow-glow hover:opacity-90 active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Open order summary"
            @click="cartDrawerOpen = true"
        >
            <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
            >
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span
                v-if="unref(orderStore.activeCart).length > 0"
                class="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-secondary text-primary text-[10px] font-black flex items-center justify-center tabular-nums leading-none border-2 border-primary"
            >{{ unref(orderStore.activeCart).length }}</span>
        </button>

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

        <template #error="{ error, clearError }">
            <div class="flex h-screen items-center justify-center bg-gray-900 text-white flex-col gap-6 p-8">
                <p class="text-xl font-bold text-red-400">
                    Something went wrong
                </p>
                <p class="text-sm text-gray-400 text-center max-w-sm">
                    {{ error?.message || 'An unexpected error occurred.' }}
                </p>
                <button
                    class="px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:opacity-90 transition"
                    @click="clearError()"
                >
                    Try Again
                </button>
            </div>
        </template>
    </NuxtErrorBoundary>
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

/* ─── Package context bar ───────────────────────────── */
.context-bar {
  background: linear-gradient(to right, rgba(26,26,26,0.95) 0%, rgba(17,17,17,0.98) 100%);
  backdrop-filter: blur(12px);
}

/* ─── Cart drawer ─────────────────────────────────── */
:deep(.cart-drawer .el-drawer) {
  --el-drawer-bg-color: #111111;
  min-width: 360px;
  max-width: 460px;
}

:deep(.cart-drawer .el-drawer__body) {
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>
