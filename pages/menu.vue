<script setup lang="ts">
import { computed, onMounted, ref, toRef, unref, watch, type Component } from "vue"
import { Beef, UtensilsCrossed, CakeSlice, Wine, ShoppingCart } from "lucide-vue-next"
import { formatCurrency } from "../utils/formats"
import { useApi } from "../composables/useApi"
import { useGuestReset } from "../composables/useGuestReset"
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
    return Boolean(unref(sessionStore.orderId) || orderStore.serverOrderId)
}

const hasConfirmedInitialOrder = computed(() =>
    orderStore.hasPlacedOrder && unref(orderStore.serverOrderId) !== null
)

onMounted(() => {
    // Menus and packages are already preloaded at welcome screen via AppBootstrap.preloadForOrdering()
    // No need to call loadAllMenus() here - data is already in Pinia state

    // Refill-only guard: once the initial order is placed, the menu is reachable
    // only via the in-session "Order Refills" CTA which pre-toggles refill mode.
    // If a refresh or deep link lands here post-order without refill mode, force it on.
    if (hasConfirmedInitialOrder.value && !orderStore.isRefillMode) {
        logger.info("[Menu] post-order entry without refill mode — forcing refill mode")
        orderStore.toggleRefillMode(true)
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
    () => unref(orderStore.serverStatus),
    (newStatus) => {
        if (newStatus === "completed" || newStatus === "cancelled" || newStatus === "voided") {
            logger.info("📢 Order status changed to:", newStatus, "- ending session")
            triggerSessionEnd(newStatus as "completed" | "cancelled" | "voided", {
                source: "watcher",
            })
        }
    }
)

// Menu categories — meats is always first; others from admin tablet categories API
const REFILL_CATEGORY_SLUGS = ["meats", "sides"] as const
const CUSTOMER_EMPTY_MESSAGE = "Nothing available in this section right now."

const activeCategory = ref<string>("meats")

const categoryIconBySlug: Record<string, Component> = {
    meats: Beef,
    sides: UtensilsCrossed,
    desserts: CakeSlice,
    dessert: CakeSlice,
    drinks: Wine,
    beverage: Wine,
}

const defaultCategoryIcon = UtensilsCrossed

const categories = computed(() => {
    const meatTab = { id: "meats", label: "Meats", icon: Beef }
    const dynamicTabs = menuStore.categories
        .filter(cat => cat.slug !== "meats" && (typeof cat.menu_count !== "number" || cat.menu_count > 0))
        .map(cat => ({
            id: cat.slug,
            label: cat.name,
            icon: categoryIconBySlug[cat.slug] ?? defaultCategoryIcon,
        }))
    return [meatTab, ...dynamicTabs]
})

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

// Get all available meats independent of package selection
const meats = computed(() => menuStore.meats)

// Compute which meats are allowed based on selected package
const allowedMeatIds = computed(() => {
    const pkg = menuStore.packages.find(p => p.id === Number(selectedPackageId.value))
    return new Set(((pkg as any)?.allowed_menus ?? []).filter((m: any) => m.menu_type === "meat" && m.is_active).map((m: any) => m.krypton_menu_id))
})

// Decorate meats with disabled state
const decorateMeats = computed(() =>
    meats.value.map(item => ({ ...item, disabled: !allowedMeatIds.value.has(item.id) }))
)

// Get items based on active category for MenuItemGrid
const displayItems = computed(() => {
    const baseItems = (() => {
        if (activeCategory.value === "meats") {
            return decorateMeats.value
        }
        return menuStore.categoryMenus[activeCategory.value] ?? []
    })()

    if (orderStore.isRefillMode) {
        return baseItems.filter((item: any) => {
            return REFILL_CATEGORY_SLUGS.includes(activeCategory.value as typeof REFILL_CATEGORY_SLUGS[number]) &&
                (item?.group || item?.category || item?.name || item?.img_url)
        })
    }

    return baseItems.filter((item: any) => item?.group || item?.category || item?.name || item?.img_url)
})

const isUnlimitedCategory = computed(() => REFILL_CATEGORY_SLUGS.includes(activeCategory.value as typeof REFILL_CATEGORY_SLUGS[number]))

// Totals are derived from the order store
const packageTotal = computed(() => orderStore.packageTotal)
const addOnsTotal = computed(() => orderStore.addOnsTotal)
const taxAmount = computed(() => orderStore.taxAmount)
const grandTotal = computed(() => orderStore.grandTotal)

const setCategory = (category: string) => {
    activeCategory.value = category
}

const reloadCategory = async () => {
    const category = activeCategory.value
    try {
        if (category === "meats") {
            meatError.value = null
            await menuStore.fetchMeats()
        } else {
            await menuStore.fetchCategoryMenus(category)
        }
    } catch {
        if (category === "meats") {
            meatError.value = CUSTOMER_EMPTY_MESSAGE
        }
        logger.warn("[Menu] reloadCategory failed for", category)
    }
}

// Add item to order
const addToOrder = (item: any) => {
    const isUnlimited = REFILL_CATEGORY_SLUGS.includes(activeCategory.value as typeof REFILL_CATEGORY_SLUGS[number])
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
// Resolver fired by el-drawer's @closed event so callers can await full close
// animation before navigating. Without this, Element Plus's teleported overlay
// (.el-overlay) is orphaned in <body> when the owning page unmounts mid-animation,
// producing a black mask on the destination route until a hard refresh.
let drawerClosedResolver: (() => void) | null = null
const waitForDrawerClosed = (): Promise<void> => {
    if (!cartDrawerOpen.value) { return Promise.resolve() }
    return new Promise<void>((resolve) => {
        drawerClosedResolver = resolve
    })
}
const handleDrawerClosed = () => {
    drawerClosedResolver?.()
    drawerClosedResolver = null
}
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
    if (!selectedPackageId.value) {
        notifyWarning("Package selection was lost. Please select a package again.")
        cartDrawerOpen.value = false
        return
    }

    // Close drawer and WAIT for the close animation to finish before navigating.
    // Otherwise el-drawer's teleported .el-overlay is orphaned in <body> when the
    // page unmounts mid-animation, leaving a black mask over the next route.
    if (cartDrawerOpen.value) {
        const closed = waitForDrawerClosed()
        cartDrawerOpen.value = false
        await closed
    }

    try {
        await router.push("/order/review")
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

    const newMode = !(orderStore.isRefillMode)
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
    if (activeCategory.value === "meats") {
        return Boolean(menuStore.isLoadingMeats)
    }
    return Boolean(menuStore.categoryLoading[activeCategory.value])
})

const meatError = ref<string | null>(null)

const categoryError = computed(() => {
    if (activeCategory.value === "meats") {
        return meatError.value ?? menuStore.errors.meats
    }
    return menuStore.categoryErrors[activeCategory.value] ?? null
})

const showEmptyCategory = computed(() => {
    return !isLoading.value &&
        !categoryError.value &&
        activeCategory.value !== "meats" &&
        displayItems.value.length === 0
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
                    @back="handleBackButtonClick"
                    @toggle-refill-mode="toggleRefillMode"
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
                            :refill-allowed-categories="REFILL_CATEGORY_SLUGS"
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
                        <div v-else-if="categoryError" class="flex justify-center">
                            <div class="max-w-md rounded-2xl bg-red-500/15 border border-red-500/30 p-6 text-center">
                                <p class="font-semibold text-red-300 mb-2">
                                    Unable to load this section
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

                        <!-- Empty State -->
                        <div v-else-if="showEmptyCategory" class="flex justify-center">
                            <div class="max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
                                <p class="text-white/80">
                                    {{ CUSTOMER_EMPTY_MESSAGE }}
                                </p>
                            </div>
                        </div>

                        <!-- Meats View (Grouped by Category) -->
                        <div v-else-if="activeCategory === 'meats'">
                            <grouped-meats-list
                                :meats="decorateMeats"
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
            @closed="handleDrawerClosed"
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

        <!-- Cart pill — shows running total, anchored bottom-right out of thumb zone.
             unref() on grandTotal/refillTotal is required: vue-tsc does not infer
             template-level unwrap when a ComputedRef is passed into a function call
             inside an interpolation, so without unref() typecheck rejects the call. -->
        <button
            class="cart-pill fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 pl-3 pr-5 py-3 rounded-full bg-gradient-to-br from-primary to-primary-dark text-secondary shadow-2xl shadow-primary/40 hover:shadow-primary/55 active:scale-[0.97] transition-[transform,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :aria-label="`Open order summary, total ${formatCurrency(orderStore.isRefillMode ? unref(orderStore.refillTotal) : unref(grandTotal))}`"
            @click="cartDrawerOpen = true"
        >
            <span class="relative flex items-center justify-center w-9 h-9 rounded-full bg-secondary/15">
                <ShoppingCart class="w-5 h-5" stroke-width="2.25" />
                <span
                    v-if="unref(orderStore.activeCart).length > 0"
                    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-primary text-[10px] font-black flex items-center justify-center tabular-nums leading-none border-2 border-primary"
                >{{ unref(orderStore.activeCart).length }}</span>
            </span>
            <span class="flex flex-col items-start leading-none gap-0.5">
                <span class="text-[10px] font-bold tracking-[0.18em] uppercase opacity-80">
                    {{ unref(orderStore.activeCart).length > 0 ? 'View Cart' : 'Empty Cart' }}
                </span>
                <span class="text-base font-black tabular-nums">
                    {{ formatCurrency(orderStore.isRefillMode ? unref(orderStore.refillTotal) : unref(grandTotal)) }}
                </span>
            </span>
        </button>

        <!-- Support FAB -->
        <support-fab @request-support="handleSupportRequest" />

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
