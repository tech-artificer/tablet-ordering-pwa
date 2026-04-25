<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Inbox } from "lucide-vue-next"
import type { Package } from "../../types"
import { useMenuStore } from "../../stores/Menu"
import { useOrderStore } from "../../stores/Order"
import { useSessionStore } from "../../stores/Session"
import { useDeviceStore } from "../../stores/Device"
import { logger } from "../../utils/logger"
import { recoverActiveOrderState } from "../../composables/useActiveOrderRecovery"

const menuStore = useMenuStore()
const router = useRouter()
const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const deviceStore = useDeviceStore()

// Load packages on mount
onMounted(async () => {
    const timestamp = new Date().toISOString()
    console.log(`[📦 Package Selection] Page loaded at ${timestamp}`)

    const recovery = await recoverActiveOrderState("package-selection")
    if (recovery.hasActiveOrder) {
        console.log(`[↩️ Active Order Recovered] order_id=${recovery.orderId} status=${recovery.status || "active"} at ${timestamp}`)
        await router.replace({
            path: "/menu",
            query: recovery.packageId ? { packageId: String(recovery.packageId), resumeMenu: "1" } : { resumeMenu: "1" }
        })
        return
    }

    logger.info("[PackageSelection] Loading packages from API...")
    try {
    // Respect cache — only fetch if stale or empty (welcome screen already preloads).
    // Pass forceRefresh=false so a warm cache from index.vue is used immediately.
        await menuStore.loadAllMenus(false)
        console.log(`[✅ Packages Loaded] ${menuStore.packages.length} packages available at ${timestamp}`)
        logger.info("[PackageSelection] Packages loaded:", menuStore.packages.length)
    } catch (error) {
        console.error(`[❌ Package Load Failed] ${error?.message} at ${timestamp}`)
        logger.error("[PackageSelection] Failed to load packages:", error)
    }
})

// Carousel state - force carousel mode for all screen sizes
const currentIndex = ref(0)
const packages = computed(() => menuStore.packages)
const guestCount = computed(() => Number(orderStore.guestCount))

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
        const started = await sessionStore.start()
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
    } catch (err) {
        console.error(`[❌ Session Start Error] ${err?.message} at ${timestamp}`)
        logger.warn("Session store start failed or unavailable", err)
    }

    // No modal to clear

    // Show a brief toast so the user sees immediate feedback
    // try {
    //   // Element Plus `ElMessage` is used elsewhere in the project (no import needed)
    //   // 1200ms gives a short visible confirmation before navigation
    //   ElMessage.success({
    //     message: 'Package selected — opening menu',
    //     duration: 1200
    //   })
    // } catch (err) {
    //   // ignore if ElMessage is not available
    // }

    // Navigate to the menu page with package ID in query for downstream flows
    try {
    // Ensure menus are loaded (session.start already attempts this, but double-check)
        try { await menuStore.loadAllMenus() } catch (e) { /* non-fatal */ }

        console.log(`[📍 Navigation] Going to menu with package_id=${packageData.id} at ${timestamp}`)
        await router.push({
            path: "/menu",
            query: { packageId: packageData.id }
        })
    } catch (navErr) {
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

// Swipe support for carousel - only in safe zones (not buttons or scrollable areas)
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
    <div class="h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
        <div class="relative z-10 flex flex-col h-screen p-4">
            <div class="w-full max-w-7xl mx-auto flex flex-col h-full">
                <!-- Header row -->
                <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-4">
                    <!-- Back button -->
                    <button
                        class="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-200 active:scale-95"
                        @click="goBack"
                    >
                        <ArrowLeft :size="22" class="text-white" />
                    </button>

                    <!-- Title block -->
                    <div class="text-center px-2">
                        <p class="text-xs tracking-[0.3em] uppercase text-white/45 font-semibold mb-1">
                            Package Selection
                        </p>
                        <h1 class="text-4xl font-bold text-white font-raleway leading-none">
                            Choose Your <span class="text-primary">Package</span>
                        </h1>
                        <p class="text-xs tracking-widest uppercase text-white/55 mt-2">
                            {{ orderStore.guestCount }} Guests &middot; View Included Meats
                        </p>
                    </div>

                    <!-- Package navigation -->
                    <div class="flex items-center gap-2">
                        <button
                            :disabled="packages.length <= 1 || currentIndex === 0"
                            class="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-primary/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 border border-white/10 active:scale-95"
                            @click="prevPackage"
                        >
                            <ChevronLeft :size="22" class="text-white" />
                        </button>
                        <div class="px-3 py-2 bg-white/10 rounded-lg min-w-[60px] text-center">
                            <span class="text-white font-bold text-sm">{{ currentIndex + 1 }}/{{ packages.length }}</span>
                        </div>
                    </div>
                    <h1 class="text-4xl font-bold font-raleway text-white">
                        Select Your <span class="text-primary">Package</span>
                    </h1>
                    <p class="text-white/60 text-sm mt-2 font-kanit">
                        {{ guestCount }} {{ guestCount === 1 ? 'Guest' : 'Guests' }}  •  All Meats Included
                    </p>
                </div>

                <!-- Carousel Controls -->
                <div class="flex-shrink-0 flex items-center gap-2">
                    <button
                        :disabled="packages.length <= 1"
                        class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/40 hover:to-primary/20 ring-1 ring-primary/40 hover:ring-primary/60 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:ring-primary/40 transition-all"
                        aria-label="Previous package"
                        title="Previous (← or swipe)"
                        @click="prevPackage"
                    >
                        <ChevronLeft :size="22" stroke-width="2.5" class="text-primary" />
                    </button>
                    <div class="px-4 py-2 rounded-full bg-primary/20 ring-1 ring-primary/40">
                        <span class="text-primary text-sm font-bold">{{ currentIndex + 1 }}/{{ packages.length }}</span>
                    </div>
                    <button
                        :disabled="packages.length <= 1"
                        class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/40 hover:to-primary/20 ring-1 ring-primary/40 hover:ring-primary/60 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:ring-primary/40 transition-all"
                        aria-label="Next package"
                        title="Next (→ or swipe)"
                        @click="nextPackage"
                    >
                        <ChevronRight :size="22" stroke-width="2.5" class="text-primary" />
                    </button>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="menuStore.isLoadingPackages" class="flex-1 flex items-center justify-center">
                <div class="text-center space-y-4">
                    <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                    <p class="text-white/80 font-kanit">
                        Loading packages...
                    </p>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="packages.length === 0" class="flex-1 flex items-center justify-center">
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

            <!-- Package Card (Premium Display) -->
            <div
                v-else
                class="flex-1 min-h-0 flex flex-col gap-4"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
            >
                <!-- Package Card: centered hero layout -->
                <transition name="pkg-card" mode="out-in">
                    <div
                        v-if="packages[currentIndex]"
                        :key="packages[currentIndex].id"
                        class="flex-1 min-h-0 rounded-2xl ring-1 ring-primary/25 overflow-hidden flex flex-col pkg-card-surface"
                    >
                        <!-- HERO ZONE: identity + price -->
                        <div class="flex-1 overflow-y-auto scrollbar-none flex flex-col items-center justify-center text-center px-8 py-6 gap-4">
                            <!-- Popular badge -->
                            <div
                                v-if="packages[currentIndex].is_popular"
                                class="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/15 ring-1 ring-primary/30"
                            >
                                <Star :size="11" stroke-width="0" fill="currentColor" class="text-primary" />
                                <span class="text-primary text-[10px] font-bold uppercase tracking-[0.18em]">Most Popular</span>
                            </div>

                            <!-- Package name -->
                            <h2 class="text-3xl font-bold text-white font-raleway leading-tight tracking-tight">
                                {{ packages[currentIndex].name }}
                            </h2>

                            <!-- Description (compact, 2-line max) -->
                            <p
                                v-if="packages[currentIndex].description"
                                class="text-white/45 text-sm max-w-xs leading-relaxed pkg-line-clamp"
                            >
                                {{ packages[currentIndex].description }}
                            </p>

                            <!-- Price hero -->
                            <div class="py-2 space-y-1">
                                <div class="flex items-baseline justify-center gap-1.5">
                                    <span class="text-5xl font-black text-primary leading-none tabular-nums tracking-tight">
                                        ₱{{ packages[currentIndex].price }}
                                    </span>
                                    <span class="text-white/35 text-sm font-medium">/person</span>
                                </div>
                                <p class="text-white/25 text-xs font-kanit">
                                    × {{ guestCount }} {{ guestCount === 1 ? 'guest' : 'guests' }}
                                    <span class="text-white/40 ml-1">= ₱{{ (Number(packages[currentIndex].price) * guestCount).toLocaleString() }}</span>
                                </p>
                            </div>

                            <!-- Feature tag row -->
                            <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                                <span
                                    v-if="packages[currentIndex].modifiers?.length"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold"
                                >
                                    <span class="text-primary/80" aria-hidden="true">🥩</span>
                                    {{ packages[currentIndex].modifiers.length }} Premium Cuts
                                </span>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold">
                                    <span aria-hidden="true">🔄</span>
                                    Unlimited Rounds
                                </span>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold">
                                    <span aria-hidden="true">🥗</span>
                                    Sides &amp; Desserts
                                </span>
                            </div>
                        </div>

                        <!-- BOTTOM PANEL: horizontal meat chips + CTA -->
                        <div class="border-t border-white/[0.07] px-5 py-4 space-y-3 pkg-bottom-panel">
                            <!-- Horizontal scrollable meat name chips (no images, clean) -->
                            <div
                                v-if="packages[currentIndex].modifiers?.length"
                                class="overflow-x-auto scrollbar-none -mx-1 px-1"
                                aria-label="Included meats"
                            >
                                <div class="flex gap-1.5 pb-0.5 pkg-chips-row">
                                    <span
                                        v-for="meat in packages[currentIndex].modifiers.slice(0, 14)"
                                        :key="meat.id"
                                        class="flex-shrink-0 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary/75 text-[11px] font-medium font-kanit whitespace-nowrap"
                                    >
                                        {{ meat.name }}
                                    </span>
                                    <span
                                        v-if="packages[currentIndex].modifiers.length > 14"
                                        class="flex-shrink-0 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/35 text-[11px] font-medium whitespace-nowrap"
                                    >
                                        +{{ packages[currentIndex].modifiers.length - 14 }} more
                                    </span>
                                </div>
                            </div>
                            <p v-else class="text-white/25 text-xs text-center font-kanit">
                                All meats included with package
                            </p>

                            <!-- Call to Action: full-width, properly sized -->
                            <button
                                class="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-[15px] tracking-wide transition-all duration-200
                       bg-gradient-to-br from-primary via-primary to-primary-dark text-secondary
                       shadow-[0_2px_16px_rgba(246,181,109,0.28)]
                       hover:shadow-[0_4px_24px_rgba(246,181,109,0.48)] hover:brightness-105
                       active:scale-[0.985] active:shadow-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                       min-h-[52px]"
                                aria-label="Select this package and proceed to menu"
                                @click="handlePackageSelection(packages[currentIndex])"
                            >
                                Select Package
                                <ChevronRight :size="17" stroke-width="2.5" />
                            </button>
                        </div>
                    </div>
                </transition>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Package card gradient surface */
.pkg-card-surface {
  background: linear-gradient(
    150deg,
    rgba(246, 181, 109, 0.10) 0%,
    rgba(12, 12, 12, 0.97) 45%,
    rgba(246, 181, 109, 0.05) 100%
  );
}

/* Bottom panel subtle dark overlay */
.pkg-bottom-panel {
  background: rgba(0, 0, 0, 0.30);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Meat chips row — parent is overflow-x-auto, must be wider than flex parent */
.pkg-chips-row {
  width: max-content;
}

/* 2-line clamp for description */
.pkg-line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Package card swap transition — directional slide with depth */
.pkg-card-enter-active {
  transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pkg-card-leave-active {
  transition: opacity 160ms cubic-bezier(0.4, 0, 0.6, 1), transform 160ms cubic-bezier(0.4, 0, 0.6, 1);
}
.pkg-card-enter-from {
  opacity: 0;
  transform: translateX(36px) scale(0.97);
}
.pkg-card-leave-to {
  opacity: 0;
  transform: translateX(-24px) scale(0.98);
}
</style>
