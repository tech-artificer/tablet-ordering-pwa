<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { Package, Modifier } from "../../types";
import { useMenuStore } from '../../stores/Menu';
import { useOrderStore } from '../../stores/Order';
import { useSessionStore } from '../../stores/Session';
import { useDeviceStore } from '../../stores/Device';
import { logger } from '../../utils/logger'
import PackageCard from '../../components/PackageCard.vue';
import PackageModal from '../../components/PackageModal.vue';

const menuStore = useMenuStore();
const router = useRouter();
const orderStore = useOrderStore();
const sessionStore = useSessionStore();
const deviceStore = useDeviceStore();

// Modal state
const modalRef = ref<InstanceType<typeof PackageModal> | null>(null)
const selectedPackageForModal = ref<Package | null>(null)

// Carousel state - force carousel mode for all screen sizes
const currentIndex = ref(0)
const packages = computed(() => menuStore.packages);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isCarousel = ref(true) // Always show carousel mode

function handleResize() {
  windowWidth.value = window.innerWidth
  // Keep carousel mode for all screen sizes
  isCarousel.value = true
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const handlePackageSelection = async (packageData: Package, modifiers?: any) => {
  // Persist selected package to order store for downstream flows
  logger.debug('Selected package:', packageData, modifiers);

  try {
    orderStore.setPackage(packageData)
  } catch (err) {
    logger.warn('Failed to persist package to order store', err)
  }

  // Start session if not already active and ensure token/menu ready
  try {
    const started = await sessionStore.start()
    if (!started) {
      logger.warn('Session start failed — device may require registration')

      // Only show registration if device truly lacks credentials
      const needsRegistration = !deviceStore.token || !(deviceStore.table && (deviceStore.table as any).id)

      if (needsRegistration) {
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
      logger.warn('Session start failed but device appears registered; proceeding.')
    }
  } catch (err) {
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

    await router.push({
      path: '/menu',
      query: { packageId: packageData.id }
    })
  } catch (navErr) {
    // Prevent uncaught promise rejections from bubbling to the global handler
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

// No modal/openDetails — cards handle inline preview

const goBack = () => {
  router.push('/order/start');
};

// Open modal for detailed view
function openPackageDetails(pkg: Package) {
  selectedPackageForModal.value = pkg
  nextTick(() => {
    modalRef.value?.open()
  })
}

// Handle selection from modal
function handleModalSelect(pkg: Package, selectedModifiers?: Modifier[]) {
  handlePackageSelection(pkg, selectedModifiers)
}

function nextPackage() {
  if (!packages.value || packages.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % packages.value.length
}

function prevPackage() {
  if (!packages.value || packages.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + packages.value.length) % packages.value.length
}

function goTo(index: number) {
  currentIndex.value = Math.max(0, Math.min(index, packages.value.length - 1))
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
        <!-- Compact header row -->
        <div class="flex items-center justify-between gap-4 mb-3">
          <!-- Back button -->
          <button 
            @click="goBack" 
            class="flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-200 active:scale-95"
          >
            <ArrowLeft :size="22" class="text-white" />
          </button>
          
          <!-- Title -->
          <h1 class="text-2xl font-bold text-white font-raleway">
            Choose Your <span class="text-primary">Package</span>
          </h1>
          
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
        <div v-if="packages[currentIndex]" class="flex items-center justify-between gap-4 mb-3 px-2">
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
        <div v-if="menuStore.isLoadingPackages" class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p class="text-white/80 mt-4 text-base">Loading packages...</p>
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
              @select="handlePackageSelection"
              @view-details="openPackageDetails"
              class="h-full"
            />
          </transition>
        </div>
      </div>
    </div>

    <!-- Package Details Modal -->
    <PackageModal
      v-if="selectedPackageForModal"
      ref="modalRef"
      :pkg="selectedPackageForModal"
      @select="handleModalSelect"
    />
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