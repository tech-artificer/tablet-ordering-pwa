<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { Package } from "../../types";
import { useMenuStore } from '../../stores/Menu';
import { useOrderStore } from '../../stores/Order';
import { useSessionStore } from '../../stores/Session';
import { useDeviceStore } from '../../stores/Device';
import { logger } from '../../utils/logger'
import { recoverActiveOrderState } from '../../composables/useActiveOrderRecovery'
import PackageCard from '../../components/PackageCard.vue';

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
  <div class="h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
    <div class="relative z-10 flex flex-col h-screen p-4">
      <div class="w-full max-w-7xl mx-auto flex flex-col h-full">
        <!-- Header row -->
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-3 mb-4">
          <!-- Back button -->
          <button 
            @click="goBack" 
            class="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-200 active:scale-95"
          >
            <ArrowLeft :size="22" class="text-white" />
          </button>
          
          <!-- Title block -->
          <div class="text-center px-2">
            <p class="text-xs tracking-[0.3em] uppercase text-white/45 font-semibold mb-1">Package Selection</p>
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
              @click="prevPackage"
              :disabled="packages.length <= 1 || currentIndex === 0"
              class="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-primary/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 border border-white/10 active:scale-95"
            >
              <ChevronLeft :size="22" class="text-white" />
            </button>
            <div class="px-3 py-2 bg-white/10 rounded-lg min-w-[60px] text-center">
              <span class="text-white font-bold text-sm">{{ currentIndex + 1 }}/{{ packages.length }}</span>
            </div>
            <button
              @click="nextPackage"
              :disabled="packages.length <= 1 || currentIndex === packages.length - 1"
              class="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-primary/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 border border-white/10 active:scale-95"
            >
              <ChevronRight :size="22" class="text-white" />
            </button>
          </div>
        </div>

        <!-- Package info bar - name, badge, price, select button -->
        <div v-if="menuStore.isLoadingPackages" class="flex items-center justify-between gap-4 mb-3 px-2">
          <div class="flex-1 min-w-0 space-y-2">
            <div class="h-6 w-64 bg-white/10 rounded animate-pulse"></div>
            <div class="h-3 w-80 bg-white/10 rounded animate-pulse"></div>
          </div>
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="h-12 w-32 bg-white/10 rounded-xl animate-pulse"></div>
            <div class="h-12 w-40 bg-white/10 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <div v-else-if="packages[currentIndex]" class="flex items-center justify-between gap-4 mb-3 px-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <h2 class="text-white font-bold text-xl truncate">{{ packages[currentIndex].name }}</h2>
              <div v-if="packages[currentIndex].is_popular" 
                  class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white bg-amber-500">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                POPULAR
              </div>
            </div>
            <!-- Package description preview -->
            <p v-if="packages[currentIndex].description" class="text-white/60 text-sm line-clamp-1 max-w-xl">
              {{ packages[currentIndex].description }}
            </p>
          </div>
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="flex items-baseline gap-1 px-4 py-2 rounded-xl bg-primary">
              <span class="text-gray-900 font-bold text-sm">₱</span>
              <span class="text-gray-900 font-extrabold text-2xl">{{ packages[currentIndex].price }}</span>
              <span class="text-gray-900/80 text-xs">/person</span>
            </div>
            <button
              @click="handlePackageSelection(packages[currentIndex])"
              class="h-12 px-6 bg-primary text-gray-900 font-bold text-base rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary/50 active:scale-95 flex items-center gap-2">
              Select Package
              <ChevronRight :size="20" />
            </button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="menuStore.isLoadingPackages" class="flex-1 min-h-0">
          <div class="h-full bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
            <div class="h-6 w-48 bg-white/10 rounded mb-4"></div>
            <div class="h-4 w-80 bg-white/10 rounded mb-8"></div>
            <div class="grid grid-cols-3 gap-4">
              <div v-for="n in 6" :key="n" class="h-20 bg-white/10 rounded-xl"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="packages.length === 0" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">No Packages Available</h3>
            <p class="text-white/60 text-sm">Please check back soon or contact staff.</p>
          </div>
        </div>

        <!-- Package card - takes remaining space -->
        <div 
          v-else
          class="flex-1 min-h-0"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <transition name="slide" mode="out-in">
            <PackageCard
              v-if="packages[currentIndex]"
              :key="packages[currentIndex].id"
              :pkg="packages[currentIndex]"
              class="h-full"
            />
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Slide transition for carousel */
.slide-enter-active {
  transition: all 0.3s ease;
}

.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Line clamp utilities */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
