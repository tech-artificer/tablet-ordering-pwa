<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { ArrowLeft, Inbox } from "lucide-vue-next"
import type { Package } from "../../types"
import { useMenuStore } from "../../stores/Menu"
import { useOrderStore } from "../../stores/Order"
import { useSessionStore } from "../../stores/Session"
import { useDeviceStore } from "../../stores/Device"
import { logger } from "../../utils/logger"
import PackageCard from "../../components/PackageCard.vue"

definePageMeta({
    layout: "kiosk"
})

const nuxtApp = useNuxtApp()
const menuStore = useMenuStore()
const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const deviceStore = useDeviceStore()

// Load packages on mount
onMounted(async () => {
    if (typeof window !== "undefined") {
        window.addEventListener("resize", onResize)
        document.addEventListener("keydown", handleKeydown)
    }

    const timestamp = new Date().toISOString()
    console.log(`[📦 Package Selection] Page loaded at ${timestamp}`)

    // Packages are now preloaded at the welcome screen via AppBootstrap.preloadForOrdering()
    // No need to fetch here - just use the cached data from MenuStore
    console.log(`[✅ Packages Ready] ${menuStore.packages.length} packages available at ${timestamp}`)
})

// Carousel state retained intentionally so existing script behavior is preserved.
const currentIndex = ref(0)
const packages = computed(() => menuStore.packages)
const guestCount = computed(() => Number(orderStore.guestCount))

// Responsive layout - optimized for 4-column grid on tablet
type PackageRowMode = "four" | "three" | "peek" | "portrait"
const viewportWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1280)
const packageRowMode = computed<PackageRowMode>(() => {
    if (packages.value.length <= 3 && viewportWidth.value >= 900) { return "three" }
    if (viewportWidth.value >= 1400) { return "four" }
    if (viewportWidth.value >= 1200) { return "three" }
    if (viewportWidth.value >= 900) { return "peek" }
    return "portrait"
})
function onResize () {
    viewportWidth.value = window.innerWidth
}

// Card focus and modifier inspector
const focusedPackageId = ref<number | null>(null)
const activeInspectorPackage = ref<Package | null>(null)
const pendingPackageSelection = ref<Package | null>(null)

function handleCardFocus (pkg: Package) {
    focusedPackageId.value = pkg.id
}

function openModifierInspector (pkg: Package) {
    activeInspectorPackage.value = pkg
}

function closeInspector () {
    activeInspectorPackage.value = null
}

function handleKeydown (event: KeyboardEvent) {
    if (event.key === "Escape") {
        closeInspector()
    }
}
const phpCurrencyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
})

const formatCurrency = (value: number | string) => {
    const amount = Number(value)
    return phpCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

const handlePackageSelection = (packageData: Package) => {
    pendingPackageSelection.value = packageData
}

function cancelPackageSelection () {
    pendingPackageSelection.value = null
}

async function confirmPackageSelection () {
    if (!pendingPackageSelection.value) { return }
    const packageData = pendingPackageSelection.value
    pendingPackageSelection.value = null
    await proceedToMenuForPackage(packageData)
}

const proceedToMenuForPackage = async (packageData: Package): Promise<void> => {
    // Persist selected package to order store for downstream flows
    orderStore.setPackage(packageData)

    // Navigate to the menu page with package ID in query for downstream flows
    // Session, auth, and menus were already loaded at welcome screen via sessionStore.start()
    await nuxtApp.$router.push({
        path: "/menu",
        query: { packageId: packageData.id }
    })
}

// Cards handle inline preview directly

onUnmounted(() => {
    if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize)
        document.removeEventListener("keydown", handleKeydown)
    }
})

const goBack = () => {
    console.log(`[↩️ Package Selection Cancelled] User returned to guest counter at ${new Date().toISOString()}`)
    nuxtApp.$router.push("/order/start")
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

                <!-- Package Row Display -->
                <div
                    v-else
                    class="flex-1 min-h-0 pt-3"
                    :class="(packageRowMode === 'three' || packageRowMode === 'four')
                        ? 'overflow-hidden'
                        : 'overflow-x-auto overflow-y-visible pkg-row-scroll'"
                >
                    <!-- Four-up grid mode (≥1400px) -->
                    <div
                        v-if="packageRowMode === 'four'"
                        class="grid grid-cols-4 gap-4 h-full pb-2"
                    >
                        <div
                            v-for="pkg in packages"
                            :key="pkg.id"
                            class="flex h-full min-w-[280px] flex-1"
                        >
                            <PackageCard
                                :pkg="pkg"
                                :guest-count="guestCount"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @select="handlePackageSelection"
                                @focus="handleCardFocus"
                                @view-modifiers="openModifierInspector"
                            />
                        </div>
                    </div>

                    <!-- Three-up grid mode (≥1200px) -->
                    <div
                        v-else-if="packageRowMode === 'three'"
                        class="grid gap-4 xl:gap-5 h-full pb-2"
                        :class="packages.length === 1 ? 'grid-cols-1' : (packages.length === 2 ? 'grid-cols-2' : 'grid-cols-3')"
                    >
                        <div
                            v-for="pkg in packages"
                            :key="pkg.id"
                            class="flex h-full min-w-0 flex-1"
                        >
                            <PackageCard
                                :pkg="pkg"
                                :guest-count="guestCount"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @select="handlePackageSelection"
                                @focus="handleCardFocus"
                                @view-modifiers="openModifierInspector"
                            />
                        </div>
                    </div>

                    <!-- Peek mode (≥900px) -->
                    <div
                        v-else-if="packageRowMode === 'peek'"
                        class="flex h-full snap-x snap-mandatory items-stretch gap-5 pb-2"
                    >
                        <div
                            v-for="pkg in packages"
                            :key="pkg.id"
                            class="flex h-full min-w-[36%] flex-[0_0_36%] snap-start"
                        >
                            <PackageCard
                                :pkg="pkg"
                                :guest-count="guestCount"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @select="handlePackageSelection"
                                @focus="handleCardFocus"
                                @view-modifiers="openModifierInspector"
                            />
                        </div>
                    </div>

                    <!-- Portrait / narrow mode -->
                    <div
                        v-else
                        class="flex h-full snap-x snap-mandatory items-stretch gap-4 pb-2"
                    >
                        <div
                            v-for="pkg in packages"
                            :key="pkg.id"
                            class="flex h-full min-w-[330px] flex-1 snap-start"
                        >
                            <PackageCard
                                :pkg="pkg"
                                :guest-count="guestCount"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @select="handlePackageSelection"
                                @focus="handleCardFocus"
                                @view-modifiers="openModifierInspector"
                            />
                        </div>
                    </div>
                </div>

                <div
                    v-if="pendingPackageSelection"
                    class="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm"
                    @click.self="cancelPackageSelection"
                >
                    <div class="mx-4 w-full max-w-xl rounded-2xl border border-white/15 bg-[#161618] p-6">
                        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                            Confirm package
                        </p>
                        <h3 class="mt-2 text-2xl font-extrabold text-white font-raleway">
                            {{ pendingPackageSelection.name }}
                        </h3>
                        <p class="mt-2 text-sm text-white/70">
                            You are selecting this package for {{ guestCount }} {{ guestCount === 1 ? "guest" : "guests" }}.
                        </p>
                        <p class="mt-1 text-sm font-bold text-[#f6b56d]">
                            Total: {{ formatCurrency(Number(pendingPackageSelection.price) * guestCount) }}
                        </p>

                        <div class="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                class="h-12 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white/80 transition hover:bg-white/10"
                                @click="cancelPackageSelection"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                class="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-extrabold text-secondary transition active:scale-[0.99]"
                                @click="confirmPackageSelection"
                            >
                                Continue to Menu
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modifier inspector overlay -->
                <div v-if="activeInspectorPackage" class="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="closeInspector">
                    <div class="max-w-lg w-full mx-4 bg-[#1a1a1a] rounded-2xl p-6 border border-white/10">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-bold text-white">
                                {{ activeInspectorPackage.name }}
                            </h3>
                            <button class="text-white/50 hover:text-white transition" @click="closeInspector">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
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
