<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { ArrowLeft, Inbox } from "lucide-vue-next"
import type { Package } from "../../types"
import { useMenuStore } from "../../stores/Menu"
import { useOrderStore } from "../../stores/Order"
import { useSessionStore } from "../../stores/Session"
import { useDeviceStore } from "../../stores/Device"
import { logger } from "../../utils/logger"
import { recoverActiveOrderState, shouldAttemptActiveOrderRecovery } from "../../composables/useActiveOrderRecovery"
import PackageCard from "../../components/PackageCard.vue"

definePageMeta({
    layout: "kiosk"
})

const nuxtApp = useNuxtApp()
const router = useRouter()
const menuStore = useMenuStore()
const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const deviceStore = useDeviceStore()

// Load packages on mount
onMounted(async () => {
    const timestamp = new Date().toISOString()
    console.log(`[📦 Package Selection] Page loaded at ${timestamp}`)

    if (shouldAttemptActiveOrderRecovery()) {
        try {
            const recovery = await recoverActiveOrderState("package-selection")
            if (recovery.hasActiveOrder) {
                console.log(`[↩️ Active Order Recovered] order_id=${recovery.orderId} status=${recovery.status || "active"} at ${timestamp}`)
                await nuxtApp.$router.replace({
                    path: "/menu",
                    query: recovery.packageId ? { packageId: String(recovery.packageId), resumeMenu: "1" } : { resumeMenu: "1" }
                })
                return
            }
        } catch (recoveryError: unknown) {
            logger.error("[PackageSelection] Active order recovery failed — continuing with normal mount", recoveryError)
        }
    }

    logger.info("[PackageSelection] Loading packages from API...")
    try {
    // Respect cache — only fetch if stale or empty (welcome screen already preloads).
    // Pass forceRefresh=false so a warm cache from index.vue is used immediately.
        await menuStore.loadAllMenus(false)
        console.log(`[✅ Packages Loaded] ${menuStore.packages.length} packages available at ${timestamp}`)
        logger.info("[PackageSelection] Packages loaded:", menuStore.packages.length)
    } catch (error: any) {
        console.error(`[❌ Package Load Failed] ${error?.message} at ${timestamp}`)
        logger.error("[PackageSelection] Failed to load packages:", error)
    }
})

// Carousel state retained intentionally so existing script behavior is preserved.
const currentIndex = ref(0)
const packages = computed(() => menuStore.packages)
const guestCount = computed(() => Number(orderStore.guestCount))
const phpCurrencyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
})

const formatCurrency = (value: number | string) => {
    const amount = Number(value)
    return phpCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

const handlePackageSelection = async (packageData: Package) => {
    // Persist selected package to order store for downstream flows
    const timestamp = new Date().toISOString()
    console.log(`[📦 Package Selected] package_id=${packageData.id} package_name='${packageData.name}' at ${timestamp}`)
    logger.debug("Selected package:", packageData)

    try {
        orderStore.setPackage(packageData)
    } catch (err) {
        logger.warn("Failed to persist package to order store", err)
    }

    // Start session if not already active and ensure token/menu ready
    try {
        console.log(`[🔄 Session Start Attempt] Starting session before navigating to menu at ${timestamp}`)
        const started = await sessionStore.start({ preserveSelection: true })
        if (!started) {
            console.log(`[⚠️ Session Start Failed] But proceeding with device credentials check at ${timestamp}`)
            logger.warn("Session start failed — device may require registration")

            // Only show registration if device truly lacks credentials
            const needsRegistration = !deviceStore.token || !(deviceStore.table && (deviceStore.table as any).id)

            if (needsRegistration) {
                console.log(`[🔐 Device Registration Required] Redirecting to Settings at ${timestamp}`)
                // Redirect staff to Settings (PIN-protected) to register device there
                try {
                    await router.push("/settings")
                } catch (e) {
                    logger.error("Failed to navigate to Settings for registration", e)
                }
                // Stop further navigation to menu
                return
            }

            // If device appears registered (token/table present), log and continue gracefully
            console.log(`[✅ Device Has Credentials] Continuing to menu at ${timestamp}`)
            logger.warn("Session start failed but device appears registered; proceeding.")
        } else {
            console.log(`[✅ Session Started] Ready for menu at ${timestamp}`)
        }
    } catch (err: any) {
        console.error(`[❌ Session Start Error] ${err?.message} at ${timestamp}`)
        logger.warn("Session store start failed or unavailable", err)
    }

    // Navigate to the menu page with package ID in query for downstream flows
    try {
    // Ensure menus are loaded (session.start already attempts this, but double-check)
        try { await menuStore.loadAllMenus() } catch (e) { /* non-fatal */ }

        console.log(`[📍 Navigation] Going to menu with package_id=${packageData.id} at ${timestamp}`)
        await router.push({
            path: "/menu",
            query: { packageId: packageData.id }
        })
    } catch (navErr: any) {
    // Prevent uncaught promise rejections from bubbling to the global handler
        console.error(`[❌ Navigation Failed] ${navErr?.message} at ${timestamp}`)
        logger.error("Navigation to /menu failed:", navErr)

        // If the navigation failed due to asset/chunk fetch, show a helpful registration UI
        // or remain on the package selection page so the user can retry.
        // If device looks unregistered, surface the registration modal.
        const needsRegistration = !deviceStore.token || !(deviceStore.table && (deviceStore.table as any).id)
        if (needsRegistration) {
            try { await router.push("/settings") } catch (e) { logger.error(e) }
        }
    }
}

// Cards handle inline preview directly

const goBack = () => {
    console.log(`[↩️ Package Selection Cancelled] User returned to guest counter at ${new Date().toISOString()}`)
    router.push("/order/start")
}

function nextPackage () {
    if (!packages.value || packages.value.length === 0) { return }
    currentIndex.value = (currentIndex.value + 1) % packages.value.length
}

function prevPackage () {
    if (!packages.value || packages.value.length === 0) { return }
    currentIndex.value = (currentIndex.value - 1 + packages.value.length) % packages.value.length
}

// Swipe support for carousel - retained intentionally so existing script behavior is preserved.
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
const touchDeltaX = ref(0)
const touchDeltaY = ref(0)
const swipeThreshold = 50
const verticalSwipeThreshold = 30

function handleTouchStart (e: TouchEvent) {
    // Don't interfere with button clicks or scrollable areas
    const target = e.target as HTMLElement
    if (
        target.closest("button") ||
    target.closest(".meat-list-horizontal") ||
    target.closest("[role=\"button\"]")
    ) {
        touchStartX.value = null
        touchStartY.value = null
        return
    }

    touchStartX.value = e.touches?.[0]?.clientX ?? null
    touchStartY.value = e.touches?.[0]?.clientY ?? null
    touchDeltaX.value = 0
    touchDeltaY.value = 0
}

function handleTouchMove (e: TouchEvent) {
    if (touchStartX.value === null || touchStartY.value === null) { return }
    const x = e.touches?.[0]?.clientX ?? 0
    const y = e.touches?.[0]?.clientY ?? 0
    touchDeltaX.value = x - touchStartX.value
    touchDeltaY.value = y - touchStartY.value
}

function handleTouchEnd () {
    if (!touchStartX.value || !touchStartY.value) { return }
    const deltaX = touchDeltaX.value
    const deltaY = touchDeltaY.value

    touchStartX.value = null
    touchStartY.value = null
    touchDeltaX.value = 0
    touchDeltaY.value = 0

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaY) > verticalSwipeThreshold) { return } // vertical scroll/swipe detected
    if (Math.abs(deltaX) < swipeThreshold) { return }

    if (deltaX > 0) {
    // swipe right -> previous
        prevPackage()
    } else {
    // swipe left -> next
        nextPackage()
    }
}
</script>

<template>
    <div class="min-h-dvh w-full bg-[#0a0a0a] overflow-hidden">
        <div class="relative z-10 h-dvh p-3 sm:p-4 md:p-5 pkg-safe-shell">
            <div class="w-full max-w-7xl mx-auto h-full flex flex-col gap-4">
                <!-- Header row -->
                <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <!-- Back button -->
                    <button
                        aria-label="Go back to guest counter"
                        class="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-[background-color,border-color,color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        @click="goBack"
                    >
                        <ArrowLeft :size="22" class="text-white" aria-hidden="true" />
                    </button>

                    <!-- Title block -->
                    <div class="text-center px-2 min-w-0">
                        <p class="text-xs tracking-[0.3em] uppercase text-white/45 font-semibold mb-1">
                            Package Selection
                        </p>
                        <h1 class="text-2xl md:text-3xl xl:text-4xl font-bold text-white font-raleway leading-tight text-balance">
                            Choose Your <span class="text-[#f6b56d]">Package</span>
                        </h1>
                        <p class="text-xs tracking-widest uppercase text-white/55 mt-2 text-pretty">
                            {{ guestCount }} {{ guestCount === 1 ? 'Guest' : 'Guests' }} &middot; Select Dining Package
                        </p>
                    </div>

                    <!-- Package count -->
                    <div class="hidden sm:flex items-center justify-center px-4 h-12 bg-white/10 rounded-xl border border-white/10">
                        <span class="text-white/70 font-bold text-sm whitespace-nowrap">
                            {{ packages.length }} Packages
                        </span>
                    </div>
                </div>

                <!-- Loading State -->
                <div v-if="menuStore.isLoadingPackages" aria-live="polite" role="status" class="flex-1 min-h-0 flex items-center justify-center">
                    <div class="text-center space-y-4">
                        <div class="w-16 h-16 border-4 border-[#f6b56d]/20 border-t-[#f6b56d] rounded-full animate-spin mx-auto" />
                        <p class="text-white/80 font-kanit">
                            Loading packages…
                        </p>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else-if="packages.length === 0" class="flex-1 min-h-0 flex items-center justify-center">
                    <div class="text-center space-y-4">
                        <Inbox :size="48" stroke-width="1.5" class="text-white/40 mx-auto" />
                        <div>
                            <h3 class="text-xl font-bold text-white mb-2">
                                No Packages Available
                            </h3>
                            <p class="text-white/60 text-sm">
                                Contact staff to check package availability.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Package Row Display (single horizontal row, scrolls horizontally if narrow) -->
                <div
                    v-else
                    class="flex-1 min-h-0 overflow-x-auto overflow-y-visible pt-3 pkg-row-scroll"
                >
                    <div class="flex h-full min-w-min snap-x snap-mandatory items-stretch gap-5 xl:gap-6 pb-2">
                        <div
                            v-for="pkg in packages"
                            :key="pkg.id"
                            class="flex h-full min-w-[340px] max-w-[460px] flex-1 snap-start"
                        >
                            <PackageCard
                                :pkg="pkg"
                                :guest-count="guestCount"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @select="handlePackageSelection"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pkg-safe-shell {
    padding-top: max(0.75rem, env(safe-area-inset-top));
    padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}

.pkg-touch-region {
    touch-action: manipulation;
    overscroll-behavior: contain;
}

.pkg-row-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(246, 181, 109, 0.45) rgba(255, 255, 255, 0.06);
    padding-bottom: 0.25rem;
}

.pkg-row-scroll::-webkit-scrollbar {
    height: 6px;
}

.pkg-row-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
}

.pkg-row-scroll::-webkit-scrollbar-thumb {
    background: rgba(246, 181, 109, 0.45);
    border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
    .animate-spin {
        animation: none;
    }
}
</style>
