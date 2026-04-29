<script setup lang="ts">
import { computed, onMounted, ref, toRef, unref, watch } from "vue"
import { Beef, UtensilsCrossed, CakeSlice, Wine, Paintbrush, Droplets, CreditCard, RefreshCw, CircleCheck } from "lucide-vue-next"
import { useApi } from "../composables/useApi"
import { useGuestReset } from "../composables/useGuestReset"
import { recoverActiveOrderState } from "../composables/useActiveOrderRecovery"
import { useSessionStore } from "../stores/Session"
import { logger } from "../utils/logger"
import { notifyWarning, notifyInfo } from "../composables/useNotifier"
import { useDeviceStore } from "../stores/Device"
import { useMenuStore } from "../stores/Menu"
import { useOrderStore } from "../stores/Order"

const menuStore = useMenuStore()
const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const route = useRoute()
const router = useRouter()

onMounted(async () => {
    if (menuStore.packages.length === 0 || menuStore.isCacheStale) {
        try {
            await menuStore.loadAllMenus()
        } catch (error) {
            logger.warn("[Menu] Initial loadAllMenus failed:", error)
        }
    }

    const recovery = await recoverActiveOrderState("menu")
    if (recovery.packageId && !route.query.packageId) {
        selectedPackageId.value = String(recovery.packageId)
    }

    const hasPackageSelection = !!selectedPackageId.value
    const explicitMenuResume = route.query.resumeMenu === "1"
    const allowMenuAccess = hasPackageSelection || orderStore.isRefillMode || explicitMenuResume

    // If an active order is recovered and not allowed to access menu, stay on menu page and enable refill mode
    if (recovery.hasActiveOrder && !allowMenuAccess) {
        orderStore.toggleRefillMode(true)
        notifyInfo("Active order recovered. Refill mode enabled.")
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
    // AND nothing has been submitted yet — the in-progress cart was likely lost
    // (localStorage cleared / page reload mid-order). Do NOT fire if the user navigated
    // back after a successful submission (submittedItems would be non-empty in that case).
    if (
        sessionStore.isActive &&
    orderStore.hasPlacedOrder &&
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

// Get selected package from route or store
const selectedPackageId = ref(route.query.packageId || orderStore.getPackage?.value?.id || null)
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
watch(
    () => orderStore.getCurrentOrderStatus(),
    (newStatus) => {
        if (newStatus === "completed" || newStatus === "voided") {
            logger.info("📢 Order status changed to:", newStatus, "- ending session")
            setTimeout(() => {
                sessionStore.end()
                router.replace("/")
            }, 2000)
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

// Support request buttons
const supportRequests = [
    { id: "clean", label: "Clean Table", icon: Paintbrush, type: "warning" },
    { id: "water", label: "Water", icon: Droplets, type: "primary" },
    { id: "billing", label: "Request Bill", icon: CreditCard, type: "success" },
    { id: "refill", label: "Order Refill", icon: RefreshCw, type: "info" }
]

// Check if refills are available (order placed AND we have a valid order ID)
const canRequestRefill = computed(() => {
    const hasOrder = Boolean(unref(orderStore.hasPlacedOrder)) && !!unref(sessionStore.orderId)
    return hasOrder
})

const hasLiveOrderReference = (): boolean => {
    const currentOrder = (unref(orderStore.currentOrder) as any)?.order ?? unref(orderStore.currentOrder)
    return Boolean(unref(sessionStore.orderId) || currentOrder?.order_id || currentOrder?.id)
}

const isBackButtonDisabled = (): boolean => {
    return Boolean(
        unref(sessionStore.isActive) ||
        unref(orderStore.hasPlacedOrder) ||
        hasLiveOrderReference() ||
        unref(orderStore.isRefillMode)
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

logger.debug(selectedPackage)
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

// Assistance drawer state and sender
const assistanceDrawerVisible = ref(false)
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

// Refill mode toggle
const toggleRefillMode = () => {
    // Check if order has been placed AND confirmed by server
    if (!orderStore.hasPlacedOrder) {
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

// Order drawer state is now managed by the `OrderSummaryDrawer` component
const isOrderDrawerOpen = ref(false)
const openOrderDrawer = () => {
    logger.debug("openOrderDrawer called")
    if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
        notifyWarning("Order already placed — use Refill to add items")
        logger.warn("Order already placed; only refill allowed")
        return
    }
    // Safety guardrail: opening the drawer must never auto-submit.
    // Submission is allowed only via explicit user confirm action.
    cancelCountdown()
    placeOrderError.value = null
    isOrderDrawerOpen.value = true
}

// Cancel countdown whenever the confirmation drawer closes
watch(isOrderDrawerOpen, (open) => {
    if (!open) { cancelCountdown() }
})

// Page-managed submission UI state (countdown, submit, undo)
const isCountingDown = ref(false)
const countdown = ref(5)
const isSubmitting = ref(false)
const placeOrderError = ref<string | null>(null)
const orderSnapshot = ref<any | null>(null)
const showSuccessBanner = ref(false)
const undoTimerId = ref<number | null>(null)

function cancelCountdown () {
    isCountingDown.value = false
    countdown.value = 5
}

async function confirmOrder () {
    logger.debug("confirmOrder called")
    if (isSubmitting.value) { return }

    // Defensive: re-sync package to the order store right before submission.
    // Guards against the race where the store was cleared by a background resync
    // but selectedPackage (from menuStore.packages) is still valid.
    if (!orderStore.package && selectedPackage.value) {
        logger.warn("[Menu] confirmOrder: package missing from order store — restoring before submission")
        orderStore.setPackage(selectedPackage.value)
    }

    isSubmitting.value = true
    placeOrderError.value = null

    const currentCart = orderStore.isRefillMode ? orderStore.refillItems : orderStore.cartItems
    orderSnapshot.value = {
        cartItems: JSON.parse(JSON.stringify(currentCart)),
        guestCount: Number(orderStore.guestCount),
        isRefill: orderStore.isRefillMode
    }
    try { sessionStorage.setItem("orderSnapshot", JSON.stringify(orderSnapshot.value)) } catch (e) { }

    try {
        if (orderStore.isRefillMode) {
            // Submit refill order
            await orderStore.submitRefill()
            // ElMessage.success('Refill order placed successfully!')
        } else {
            // Submit regular order
            const payload = orderStore.buildPayload()
            logger.debug("Order Payload:", payload)
            await orderStore.submitOrder(payload)
            // ElMessage.success('Order placed successfully!')
        }

        isSubmitting.value = false
        isCountingDown.value = false
        isOrderDrawerOpen.value = false

        showSuccessBanner.value = true
        try { sessionStorage.setItem("orderSnapshot", JSON.stringify(orderSnapshot.value)) } catch (e) { }
        undoTimerId.value = window.setTimeout(() => {
            showSuccessBanner.value = false
            orderSnapshot.value = null
            try { sessionStorage.removeItem("orderSnapshot") } catch (e) { }
            undoTimerId.value = null
        }, 5000)
    } catch (err: any) {
        isSubmitting.value = false
        isCountingDown.value = false
        placeOrderError.value = err?.message || String(err)
    }
}
</script>

<template>
    <NuxtErrorBoundary @error="(e: Error) => { logger.error('[Menu] Uncaught page error:', e) }">
        <div class="flex h-screen bg-app-grid text-white">
            <!-- Main Content Area -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <!-- ─── Header Bar ──────────────────────────────────────────── -->
                <div
                    class="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/[0.07]"
                    style="background: rgba(15,15,15,0.95); backdrop-filter: blur(12px);"
                >
                    <!-- Left: Back + title -->
                    <div class="flex items-center gap-3 min-w-0">
                        <button
                            :disabled="isBackButtonDisabled()"
                            :aria-disabled="isBackButtonDisabled()"
                            class="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/40"
                            :class="isBackButtonDisabled()
                                ? 'text-white/25 cursor-not-allowed'
                                : 'text-white/70 hover:text-white hover:bg-white/15 active:scale-95'"
                            aria-label="Go back"
                            @click="handleBackButtonClick"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div class="min-w-0">
                            <p class="text-white font-bold text-base leading-tight truncate">
                                {{ (deviceStore.table as any)?.name || (deviceStore.table as any)?.table_number || 'The Grill' }}
                            </p>
                            <p class="text-white/35 text-[10px] uppercase tracking-[0.15em] font-semibold leading-tight">
                                {{ selectedPackage ? (selectedPackage as any).description || 'Korean BBQ Selection' : 'Korean BBQ' }}
                            </p>
                        </div>
                    </div>

                    <!-- Right: Package pill + status -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <!-- Table pill -->
                        <div class="hidden sm:flex items-center gap-1.5 bg-white/[0.05] rounded-full px-3 py-1 border border-white/[0.07]">
                            <svg
                                class="w-3 h-3 text-white/35"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                                aria-hidden="true"
                            ><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
                            <span class="text-white/55 text-[11px] font-medium">
                                {{ (deviceStore.table as any)?.name || (deviceStore.table as any)?.table_number || 'Table' }}
                            </span>
                        </div>

                        <!-- Package name pill -->
                        <div v-if="selectedPackage" class="flex flex-col items-end">
                            <span class="text-white/30 text-[9px] uppercase tracking-[0.18em] font-bold leading-none mb-0.5">Package</span>
                            <span class="text-primary font-bold text-sm leading-tight truncate max-w-[130px]">{{ selectedPackage.name }}</span>
                        </div>

                        <!-- Order placed pill -->
                        <div
                            v-if="orderStore.hasPlacedOrder"
                            class="flex items-center gap-1.5 bg-success/15 border border-success/25 rounded-full px-2.5 py-1"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
                            <span class="text-success text-[10px] font-bold uppercase tracking-wide">Live</span>
                        </div>
                    </div>
                </div>

                <!-- Category Filter Tabs -->
                <div class="sticky top-0 z-10">
                    <div class="max-w-7xl mx-auto">
                        <!-- Refill Mode Indicator -->
                        <div v-if="orderStore.isRefillMode" class="bg-success/20 border-b border-success/30 px-6 py-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <RefreshCw :size="24" :stroke-width="2" class="text-success" />
                                    <div>
                                        <p class="font-bold text-success">
                                            Refill Mode Active
                                        </p>
                                        <p class="text-sm text-success/80">
                                            Only unlimited items available (Meats &amp; Sides)
                                        </p>
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
                            :categories="categories"
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
                :is-counting-down="isCountingDown"
                :countdown="countdown"
                @update-quantity="updateQuantity"
                @remove-item="removeFromOrder"
                @set-guest-count="(count) => orderStore.setGuestCount(count)"
                @submit-order="openOrderDrawer"
                @cancel-countdown="cancelCountdown"
                @toggle-refill-mode="toggleRefillMode"
            />
        </div>

        <!-- Order Confirmation Drawer (component) -->
        <order-summary-drawer
            v-model="isOrderDrawerOpen"
            :selected-package="selectedPackage"
            :guest-count="guestCount"
            :cart-items="orderStore.activeCart"
            :package-total="orderStore.isRefillMode ? 0 : packageTotal"
            :add-ons-total="orderStore.isRefillMode ? orderStore.refillTotal : addOnsTotal"
            :tax-amount="orderStore.isRefillMode ? 0 : taxAmount"
            :grand-total="orderStore.isRefillMode ? orderStore.refillTotal : grandTotal"
            :place-order-error="placeOrderError"
            :is-submitting="orderStore.isSubmitting"
            :is-refill-mode="orderStore.isRefillMode"
            :is-counting-down="isCountingDown"
            :countdown="countdown"
            @confirm="confirmOrder"
            @cancel="() => { isOrderDrawerOpen = false; cancelCountdown() }"
            @retry="confirmOrder"
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
                    <CircleCheck :size="28" :stroke-width="2" />
                    <div>
                        <p class="font-bold text-lg">
                            {{ orderStore.isRefillMode ? 'Refill Order Placed!' : 'Order Placed Successfully!' }}
                        </p>
                        <p class="text-sm text-green-100">
                            Your order is being prepared
                        </p>
                    </div>
                </div>
            </div>
        </Transition>

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
