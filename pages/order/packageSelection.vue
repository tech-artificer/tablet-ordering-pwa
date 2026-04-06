<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Inbox } from 'lucide-vue-next';
import type { Package } from "../../types";
import { useMenuStore } from '../../stores/Menu';
import { useOrderStore } from '../../stores/Order';
import { useSessionStore } from '../../stores/Session';
import { useDeviceStore } from '../../stores/Device';
import { logger } from '../../utils/logger'
import { recoverActiveOrderState } from '../../composables/useActiveOrderRecovery'

const menuStore = useMenuStore();
const router = useRouter();
const orderStore = useOrderStore();
const sessionStore = useSessionStore();
const deviceStore = useDeviceStore();

// Load packages on mount
onMounted(async () => {
  const timestamp = new Date().toISOString()
  console.log(`[📦 Package Selection] Page loaded at ${timestamp}`)

  const recovery = await recoverActiveOrderState('package-selection')
  if (recovery.hasActiveOrder) {
    console.log(`[↩️ Active Order Recovered] order_id=${recovery.orderId} status=${recovery.status || 'active'} at ${timestamp}`)
    await router.replace('/menu')
    return
  }

  logger.info('[PackageSelection] Loading packages from API...');
  try {
    await menuStore.loadAllMenus();
    console.log(`[✅ Packages Loaded] ${menuStore.packages.length} packages available at ${timestamp}`)
    logger.info('[PackageSelection] Packages loaded:', menuStore.packages.length);
  } catch (error) {
    console.error(`[❌ Package Load Failed] ${error?.message} at ${timestamp}`)
    logger.error('[PackageSelection] Failed to load packages:', error);
  }
});

// Carousel state - force carousel mode for all screen sizes
const currentIndex = ref(0)
const packages = computed(() => menuStore.packages);

const handlePackageSelection = async (packageData: Package) => {
  // Persist selected package to order store for downstream flows
  const timestamp = new Date().toISOString()
  console.log(`[📦 Package Selected] package_id=${packageData.id} package_name='${packageData.name}' at ${timestamp}`)
  logger.debug('Selected package:', packageData);

  try {
    orderStore.setPackage(packageData)
  } catch (err) {
    logger.warn('Failed to persist package to order store', err)
  }

  // Start session if not already active and ensure token/menu ready
  try {
    console.log(`[🔄 Session Start Attempt] Starting session before navigating to menu at ${timestamp}`)
    const started = await sessionStore.start()
    if (!started) {
      console.log(`[⚠️ Session Start Failed] But proceeding with device credentials check at ${timestamp}`)
      logger.warn('Session start failed — device may require registration')

      // Only show registration if device truly lacks credentials
      const needsRegistration = !deviceStore.token || !(deviceStore.table && (deviceStore.table as any).id)

      if (needsRegistration) {
        console.log(`[🔐 Device Registration Required] Redirecting to Settings at ${timestamp}`)
        // Redirect staff to Settings (PIN-protected) to register device there
        try {
          await router.push('/settings')
        } catch (e) {
          logger.error('Failed to navigate to Settings for registration', e)
        }
        // Stop further navigation to menu
        return
      }

      // If device appears registered (token/table present), log and continue gracefully
      console.log(`[✅ Device Has Credentials] Continuing to menu at ${timestamp}`)
      logger.warn('Session start failed but device appears registered; proceeding.')
    } else {
      console.log(`[✅ Session Started] Ready for menu at ${timestamp}`)
    }
  } catch (err) {
    console.error(`[❌ Session Start Error] ${err?.message} at ${timestamp}`)
    logger.warn('Session store start failed or unavailable', err)
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
      path: '/menu',
      query: { packageId: packageData.id }
    })
  } catch (navErr) {
    // Prevent uncaught promise rejections from bubbling to the global handler
    console.error(`[❌ Navigation Failed] ${navErr?.message} at ${timestamp}`)
    logger.error('Navigation to /menu failed:', navErr)

    // If the navigation failed due to asset/chunk fetch, show a helpful registration UI
    // or remain on the package selection page so the user can retry.
    // If device looks unregistered, surface the registration modal.
    const needsRegistration = !deviceStore.token || !(deviceStore.table && (deviceStore.table as any).id)
    if (needsRegistration) {
      try { await router.push('/settings') } catch (e) { logger.error(e) }
    }
  }
}

// Cards handle inline preview directly

const goBack = () => {
  console.log(`[↩️ Package Selection Cancelled] User returned to guest counter at ${new Date().toISOString()}`)
  router.push('/order/start');
};

function nextPackage() {
  if (!packages.value || packages.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % packages.value.length
}

function prevPackage() {
  if (!packages.value || packages.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + packages.value.length) % packages.value.length
}

// Swipe support for carousel - only in safe zones (not buttons or scrollable areas)
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
const touchDeltaX = ref(0)
const touchDeltaY = ref(0)
const swipeThreshold = 50
const verticalSwipeThreshold = 30

function handleTouchStart(e: TouchEvent) {
  // Don't interfere with button clicks or scrollable areas
  const target = e.target as HTMLElement
  if (
    target.closest('button') || 
    target.closest('.meat-list-horizontal') ||
    target.closest('[role="button"]')
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

function handleTouchMove(e: TouchEvent) {
  if (touchStartX.value === null || touchStartY.value === null) return
  const x = e.touches?.[0]?.clientX ?? 0
  const y = e.touches?.[0]?.clientY ?? 0
  touchDeltaX.value = x - touchStartX.value
  touchDeltaY.value = y - touchStartY.value
}

function handleTouchEnd() {
  if (!touchStartX.value || !touchStartY.value) return
  const deltaX = touchDeltaX.value
  const deltaY = touchDeltaY.value
  
  touchStartX.value = null
  touchStartY.value = null
  touchDeltaX.value = 0
  touchDeltaY.value = 0
  
  // Only trigger if horizontal swipe is dominant and exceeds threshold
  if (Math.abs(deltaY) > verticalSwipeThreshold) return // vertical scroll/swipe detected
  if (Math.abs(deltaX) < swipeThreshold) return
  
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
  <div class="relative h-screen w-screen flex flex-col overflow-hidden">
    <!-- Warm Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-secondary-dark via-secondary to-accent-warm opacity-90"></div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col h-full p-6 gap-6">
      <!-- Header: Back Button + Title + Navigation -->
      <div class="flex items-center justify-between gap-4">
        <button 
          @click="goBack" 
          class="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft :size="20" stroke-width="2" />
        </button>
        
        <div class="flex-1 text-center">
          <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80 mb-1">Step 2</p>
          <h1 class="text-4xl font-bold font-raleway text-white">
            Select Your <span class="text-primary">Package</span>
          </h1>
          <p class="text-white/60 text-sm mt-2 font-kanit">
            {{ orderStore.guestCount }} {{ orderStore.guestCount === 1 ? 'Guest' : 'Guests' }}  •  All Meats Included
          </p>
        </div>

        <!-- Carousel Controls -->
        <div class="flex-shrink-0 flex items-center gap-2">
          <button
            @click="prevPackage"
            :disabled="packages.length <= 1"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-20 hover:bg-primary/20 ring-1 ring-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous package"
          >
            <ChevronLeft :size="20" stroke-width="2" class="text-white" />
          </button>
          <div class="px-3 py-1.5 rounded-full bg-primary/20 ring-1 ring-primary/40">
            <span class="text-primary text-xs font-bold">{{ currentIndex + 1 }}/{{ packages.length }}</span>
          </div>
          <button
            @click="nextPackage"
            :disabled="packages.length <= 1"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-20 hover:bg-primary/20 ring-1 ring-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next package"
          >
            <ChevronRight :size="20" stroke-width="2" class="text-white" />
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="menuStore.isLoadingPackages" class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p class="text-white/80 font-kanit">Loading packages...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="packages.length === 0" class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <Inbox :size="48" stroke-width="1.5" class="text-white/40 mx-auto" />
          <div>
            <h3 class="text-xl font-bold text-white mb-2">No Packages Available</h3>
            <p class="text-white/60 text-sm">Contact staff to check package availability.</p>
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
        <!-- Main Package Card -->
        <transition name="fade" mode="out-in">
          <div 
            v-if="packages[currentIndex]" 
            :key="packages[currentIndex].id"
            class="flex-1 min-h-0 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/15 via-white/5 to-primary/5 ring-1 ring-primary/40 flex flex-col"
          >
            <!-- Header with badge -->
            <div class="p-6 space-y-2 border-b border-white/10">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-3xl font-bold text-white font-raleway">{{ packages[currentIndex].name }}</h2>
                  <p v-if="packages[currentIndex].description" class="text-white/70 text-sm mt-2 line-clamp-2">
                    {{ packages[currentIndex].description }}
                  </p>
                </div>
                <div v-if="packages[currentIndex].is_popular" class="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/20 ring-1 ring-primary/40">
                  <Star :size="16" stroke-width="0" fill="currentColor" class="text-primary" />
                  <span class="text-primary text-xs font-bold uppercase tracking-wider">Popular</span>
                </div>
              </div>
            </div>

            <!-- Content: Meat List + Price + CTA -->
            <div class="flex-1 min-h-0 flex flex-col overflow-hidden p-6 gap-6">
              <!-- Meat List (scrollable) -->
              <div class="flex-1 min-h-0 overflow-y-auto">
                <div class="space-y-3">
                  <p class="text-xs uppercase tracking-[0.2em] font-bold text-primary/80">Included Meats</p>
                  <div v-if="packages[currentIndex].modifiers && packages[currentIndex].modifiers.length" class="space-y-2">
                    <div 
                      v-for="meat in packages[currentIndex].modifiers.slice(0, 8)" 
                      :key="meat.id"
                      class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div class="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                      <span class="text-white/90 font-kanit">{{ meat.name }}</span>
                    </div>
                    <div v-if="packages[currentIndex].modifiers.length > 8" class="text-white/60 text-sm px-3 py-2">
                      +{{ packages[currentIndex].modifiers.length - 8 }} more items
                    </div>
                  </div>
                  <div v-else class="text-white/50 text-sm">No meats specified for this package.</div>
                </div>
              </div>

              <!-- Footer: Price + CTA Button -->
              <div class="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                <div class="space-y-1">
                  <p class="text-white/60 text-xs uppercase tracking-wider font-kanit">Price per Person</p>
                  <div class="flex items-baseline gap-1">
                    <span class="text-4xl font-black text-primary">₱{{ packages[currentIndex].price }}</span>
                    <span class="text-white/50 text-sm">/person</span>
                  </div>
                </div>
                <FlameButton 
                  variant="primary" 
                  size="lg"
                  class="shadow-glow"
                  @click="handlePackageSelection(packages[currentIndex])"
                >
                  Select Package
                  <ChevronRight :size="20" stroke-width="2" />
                </FlameButton>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
