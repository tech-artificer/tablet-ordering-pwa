<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox, UtensilsCrossed, X } from "lucide-vue-next"
import type { Modifier, Package } from "../../types"
import { useMenuStore } from "../../stores/Menu"
import { useOrderStore } from "../../stores/Order"
import PackageCard from "../../components/PackageCard.vue"
import { displayMeatGroupLabel, groupPackageModifiers } from "../../utils/packageModifierGroups"

definePageMeta({
    layout: "kiosk"
})

const nuxtApp = useNuxtApp()
const menuStore = useMenuStore()
const orderStore = useOrderStore()

// Load packages on mount
onMounted(() => {
    if (typeof window !== "undefined") {
        window.addEventListener("resize", onResize)
        document.addEventListener("keydown", handleKeydown)
    }
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

// Card selection and modifier inspector
const selectedPackage = ref<Package | null>(null)
const activeInspectorPackage = ref<Package | null>(null)
const featuredModifierId = ref<number | null>(null)

function handleCardSelect (pkg: Package) {
    selectedPackage.value = pkg
}

function handleCardFocus (pkg: Package) {
    selectedPackage.value = pkg
}

function openModifierInspector (pkg: Package) {
    activeInspectorPackage.value = pkg
    featuredModifierId.value = ((pkg.modifiers || []) as Modifier[])[0]?.id ?? null
}

function closeInspector () {
    activeInspectorPackage.value = null
    featuredModifierId.value = null
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

const inspectorGroups = computed(() => {
    return groupPackageModifiers(((activeInspectorPackage.value?.modifiers || []) as Modifier[]))
})

const inspectorModifiers = computed(() => inspectorGroups.value.flatMap(group => group.items))

const featuredModifier = computed<Modifier | null>(() => {
    if (!inspectorModifiers.value.length) { return null }
    return inspectorModifiers.value.find(item => item.id === featuredModifierId.value) ?? inspectorModifiers.value[0]
})

const featuredIndex = computed(() => {
    if (!featuredModifier.value) { return 0 }
    return inspectorModifiers.value.findIndex(item => item.id === featuredModifier.value?.id)
})

const inspectorSummary = computed(() => {
    const total = inspectorModifiers.value.length
    const parts = inspectorGroups.value.map(group => `${group.items.length} ${displayMeatGroupLabel(group.label).toLowerCase()}`)
    return `${total} unlimited meats${parts.length ? ` · ${parts.join(" · ")}` : ""}`
})

const featuredGroupLabel = computed(() => {
    const selected = featuredModifier.value
    if (!selected) { return "" }
    const group = inspectorGroups.value.find(item => item.items.some(modifier => modifier.id === selected.id))
    return group ? displayMeatGroupLabel(group.label) : ""
})

const featuredDescription = computed(() => {
    return String((featuredModifier.value as any)?.description || "Classic cut, lightly seasoned and grilled at your table.")
})

function selectFeaturedModifier (modifier: Modifier) {
    featuredModifierId.value = modifier.id
}

function shiftFeaturedModifier (direction: -1 | 1) {
    if (!inspectorModifiers.value.length) { return }
    const current = featuredIndex.value >= 0 ? featuredIndex.value : 0
    const next = (current + direction + inspectorModifiers.value.length) % inspectorModifiers.value.length
    featuredModifierId.value = inspectorModifiers.value[next]?.id ?? null
}

async function chooseActiveInspectorPackage () {
    if (!activeInspectorPackage.value) { return }
    const packageData = activeInspectorPackage.value
    closeInspector()
    await proceedToMenuForPackage(packageData)
}

onUnmounted(() => {
    if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize)
        document.removeEventListener("keydown", handleKeydown)
    }
})

const goBack = () => {
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

function _handleTouchStart (e: TouchEvent) {
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

function _handleTouchMove (e: TouchEvent) {
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
    <div class="relative min-h-dvh w-full overflow-hidden bg-grill-table">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_45%,rgba(255,181,109,0.08),transparent_68%)]" aria-hidden="true" />
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

                    <!-- Title block with 2-step progress (no step 3) -->
                    <div class="text-center px-2 min-w-0">
                        <!-- Step indicator: Guests → Package only -->
                        <div class="mb-1.5 flex items-center justify-center gap-2" aria-label="Step 2 of 2: Package selection">
                            <div class="flex items-center gap-1.5">
                                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffbd72] text-[10px] font-black text-[#140c06]" aria-hidden="true">1</span>
                                <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffbd72]/70">Guests</span>
                            </div>
                            <span class="h-px w-6 bg-white/20" aria-hidden="true" />
                            <div class="flex items-center gap-1.5">
                                <span class="flex h-5 w-5 items-center justify-center rounded-full border border-[#ffbd72] text-[10px] font-bold text-[#ffbd72]" aria-hidden="true">2</span>
                                <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-white">Package</span>
                            </div>
                        </div>
                        <h1 class="text-2xl md:text-3xl xl:text-4xl font-bold text-white font-raleway leading-tight text-balance">
                            Choose Your <span class="text-[#f6b56d] italic">Package</span>
                        </h1>
                        <p class="text-sm text-white/55 mt-1.5 text-pretty font-kanit">
                            For <strong class="text-white font-bold">{{ guestCount }}</strong> {{ guestCount === 1 ? 'guest' : 'guests' }} &middot; tap a package to preview the meats inside
                        </p>
                    </div>

                    <!-- Spacer to balance the grid (matches back button width) -->
                    <div class="w-12 h-12" aria-hidden="true" />
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
                                :is-selected="selectedPackage?.id === pkg.id"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @focus="handleCardFocus"
                                @select="handleCardSelect"
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
                                :is-selected="selectedPackage?.id === pkg.id"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @focus="handleCardFocus"
                                @select="handleCardSelect"
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
                                :is-selected="selectedPackage?.id === pkg.id"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @focus="handleCardFocus"
                                @select="handleCardSelect"
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
                                :is-selected="selectedPackage?.id === pkg.id"
                                :format-currency="formatCurrency"
                                class="w-full"
                                @focus="handleCardFocus"
                                @select="handleCardSelect"
                                @view-modifiers="openModifierInspector"
                            />
                        </div>
                    </div>
                </div>

                <!-- Floating CTA: appears when a package is selected -->
                <Transition name="slide-cta">
                    <div
                        v-if="selectedPackage && !activeInspectorPackage"
                        class="absolute bottom-6 left-1/2 z-20 -translate-x-1/2"
                    >
                        <button
                            type="button"
                            class="flex h-14 min-w-[18rem] items-center justify-center rounded-full bg-gradient-to-r from-[#ffbd72] to-[#f6a84d] px-10 text-base font-black tracking-wide text-[#140c06] shadow-[0_16px_48px_rgba(255,189,114,0.35)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbd72]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black font-raleway"
                            @click="proceedToMenuForPackage(selectedPackage!)"
                        >
                            Continue to Menu →
                        </button>
                    </div>
                </Transition>

                <!-- Modifier inspector overlay
                     NOTE: no horizontal padding on this wrapper — the inner
                     section's `max-w-[76.5rem]` already constrains width on
                     wider viewports, and on the 1340×800 tablet the wrapper
                     padding was clipping the right-column meat cards
                     (visible as "Hyangcho [cut off]"). Sections inside the
                     modal carry their own px-6/px-7 padding. -->
                <div
                    v-if="activeInspectorPackage"
                    class="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md"
                    @click.self="closeInspector"
                >
                    <section
                        class="package-meat-browser grid h-[88dvh] w-full max-w-[76.5rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.35rem] border border-[#8f622f]/75 bg-[linear-gradient(180deg,#17110d_0%,#100c09_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
                        role="dialog"
                        aria-modal="true"
                        :aria-label="`${activeInspectorPackage.name} meat preview`"
                    >
                        <header class="flex min-h-[4.5rem] items-center gap-4 border-b border-[#4a3320]/70 px-7">
                            <!-- Package info -->
                            <div class="flex min-w-0 flex-1 items-center gap-3">
                                <span class="flex-shrink-0 rounded-full border border-[#9c6832] bg-[#2a1a10]/85 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffbd72]">
                                    {{ activeInspectorPackage.name }}
                                </span>
                                <span class="truncate text-sm font-bold text-white">
                                    {{ inspectorSummary }}
                                </span>
                            </div>

                            <!-- Actions -->
                            <div class="flex flex-shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    class="h-9 rounded-full border border-white/20 bg-white/6 px-4 text-xs font-extrabold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                    @click="closeInspector"
                                >
                                    Keep Browsing
                                </button>
                                <button
                                    type="button"
                                    class="h-9 rounded-full bg-gradient-to-r from-[#ffbd72] to-[#f6a84d] px-5 text-xs font-black uppercase text-[#140c06] shadow-[0_8px_20px_rgba(255,189,114,0.2)] transition hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbd72]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                    @click="chooseActiveInspectorPackage"
                                >
                                    Choose Package →
                                </button>
                                <button
                                    type="button"
                                    aria-label="Close meat browser"
                                    class="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/70 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbd72]/70"
                                    @click="closeInspector"
                                >
                                    <X :size="18" />
                                </button>
                            </div>
                        </header>

                        <div class="grid min-h-0 grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] divide-x divide-[#3a2819]/80">
                            <section class="featured-meat-pane min-h-0 overflow-y-auto px-7 py-4">
                                <div class="relative h-[36vh] min-h-[13rem] overflow-hidden rounded-2xl bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                                    <span
                                        v-if="featuredModifier?.receipt_name"
                                        class="absolute left-4 top-4 z-10 rounded-md border border-[#9c6832] bg-black/75 px-3 py-1 text-[11px] font-black text-[#ffbd72]"
                                    >
                                        {{ featuredModifier.receipt_name }}
                                    </span>

                                    <NuxtImg
                                        v-if="featuredModifier?.img_url"
                                        :src="featuredModifier.img_url"
                                        :alt="featuredModifier.name || 'Featured meat cut'"
                                        class="h-full w-full object-contain"
                                        sizes="560px"
                                        format="webp"
                                    />
                                    <div v-else class="flex h-full w-full items-center justify-center text-[#ffbd72]/45">
                                        <UtensilsCrossed :size="76" :stroke-width="1.35" />
                                    </div>

                                    <button
                                        type="button"
                                        aria-label="Previous meat"
                                        class="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/68 text-white transition hover:border-[#ffbd72]/50 hover:text-[#ffbd72]"
                                        @click="shiftFeaturedModifier(-1)"
                                    >
                                        <ChevronLeft :size="20" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Next meat"
                                        class="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/68 text-white transition hover:border-[#ffbd72]/50 hover:text-[#ffbd72]"
                                        @click="shiftFeaturedModifier(1)"
                                    >
                                        <ChevronRight :size="20" />
                                    </button>

                                    <span class="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1 text-xs font-black text-white">
                                        {{ featuredIndex + 1 }} / {{ inspectorModifiers.length }}
                                    </span>
                                </div>

                                <div class="mt-3">
                                    <p class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#ffbd72]">
                                        <span class="h-1.5 w-1.5 rounded-full bg-[#ffbd72]" />
                                        {{ featuredGroupLabel }}
                                    </p>
                                    <h2 class="mt-1 font-raleway text-2xl font-extrabold leading-tight text-white">
                                        {{ featuredModifier?.name || "No meat selected" }}
                                    </h2>
                                    <p class="mt-1 text-xs leading-snug text-white/85">
                                        {{ featuredDescription }}
                                    </p>
                                    <div class="mt-2 flex flex-wrap gap-2">
                                        <span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                                            Unlimited refills
                                        </span>
                                        <span class="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                            Grilled at your table
                                        </span>
                                    </div>
                                    <p class="mt-2 text-xs text-white/55 tracking-wide font-kanit">
                                        ← → browse cuts &middot; all sides included &middot; unlimited refills
                                    </p>
                                </div>
                            </section>

                            <section class="meat-grid-pane min-h-0 overflow-y-auto px-6 py-6">
                                <div
                                    v-for="group in inspectorGroups"
                                    :key="group.label"
                                    class="mb-7 last:mb-0"
                                >
                                    <div class="mb-4 flex items-center gap-3">
                                        <span class="h-1.5 w-1.5 rounded-full bg-[#ffbd72]" />
                                        <h3 class="text-lg font-extrabold text-white">
                                            {{ displayMeatGroupLabel(group.label) }}
                                        </h3>
                                        <span class="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">
                                            {{ group.items.length }} cuts
                                        </span>
                                        <span class="h-px flex-1 bg-[#3a2819]" />
                                    </div>

                                    <div class="grid grid-cols-3 gap-3">
                                        <button
                                            v-for="modifier in group.items"
                                            :key="modifier.id"
                                            type="button"
                                            class="meat-browser-card min-h-[10.5rem] overflow-hidden rounded-xl border bg-[#120d0a] text-left transition hover:border-[#ffbd72]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbd72]/70"
                                            :class="featuredModifier?.id === modifier.id ? 'border-[#ffbd72] shadow-[0_0_0_1px_rgba(255,189,114,0.35),0_10px_32px_rgba(0,0,0,0.45)]' : 'border-white/10'"
                                            @click="selectFeaturedModifier(modifier)"
                                        >
                                            <div class="relative h-28 bg-black">
                                                <span
                                                    v-if="modifier.receipt_name"
                                                    class="absolute left-2 top-2 z-10 rounded bg-black/72 px-2 py-0.5 text-[10px] font-black text-[#ffbd72]"
                                                >
                                                    {{ modifier.receipt_name }}
                                                </span>
                                                <NuxtImg
                                                    v-if="modifier.img_url"
                                                    :src="modifier.img_url"
                                                    :alt="modifier.name || 'Meat cut'"
                                                    class="h-full w-full object-contain"
                                                    loading="lazy"
                                                    sizes="180px"
                                                    format="webp"
                                                />
                                                <div v-else class="flex h-full w-full items-center justify-center text-[#ffbd72]/38">
                                                    <UtensilsCrossed :size="34" :stroke-width="1.35" />
                                                </div>
                                            </div>
                                            <p class="line-clamp-2 px-3 py-3 text-xs font-bold leading-tight text-white">
                                                {{ modifier.name }}
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div v-if="!inspectorGroups.length" class="flex h-full items-center justify-center text-center text-white/55">
                                    No meat inclusions are configured for this package.
                                </div>
                            </section>
                        </div>
                    </section>
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

.package-meat-browser {
    color-scheme: dark;
}

.meat-grid-pane {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 189, 114, 0.75) rgba(255, 255, 255, 0.05);
    overscroll-behavior: contain;
}

.meat-grid-pane::-webkit-scrollbar {
    width: 8px;
}

.meat-grid-pane::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999px;
}

.meat-grid-pane::-webkit-scrollbar-thumb {
    background: rgba(255, 189, 114, 0.75);
    border-radius: 999px;
}

.meat-browser-card {
    transform: translateZ(0);
    -webkit-tap-highlight-color: transparent;
}

.slide-cta-enter-active {
    transition: opacity 200ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-cta-leave-active {
    transition: opacity 160ms ease, transform 200ms cubic-bezier(0.4, 0, 1, 1);
}
.slide-cta-enter-from,
.slide-cta-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(1rem);
}
.slide-cta-enter-to,
.slide-cta-leave-from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

@media (prefers-reduced-motion: reduce) {
    .animate-spin {
        animation: none;
    }
    .slide-cta-enter-active,
    .slide-cta-leave-active {
        transition: none;
    }
}
</style>
