# Split Layout Implementation Guide

## Changes Required

### 1. pages/order/packageSelection.vue

**Remove carousel breakpoint logic** - Always show carousel for all screen sizes:
- Remove `isCarousel` ref and `handleResize` function
- Remove `onMounted` and `onBeforeUnmount` for resize listener
- Remove grid layout section entirely

**Update carousel container**:
```vue
<!-- Replace carousel section with: -->
<div v-else class="flex-1 relative flex items-center overflow-hidden">
  <!-- Left swipe button -->
  <button
    @click="prevPackage"
    :disabled="packages.length <= 1"
    class="absolute left-0 z-20 p-4 bg-primary/90 hover:bg-primary backdrop-blur-sm rounded-r-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-xl active:scale-95 h-24"
    aria-label="Previous package"
  >
    <ChevronLeft :size="32" class="text-white"></ChevronLeft>
  </button>

  <!-- Package card wrapper -->
  <div 
    class="w-full px-20 h-full flex items-center"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <transition name="slide" mode="out-in">
      <div
        v-if="packages[currentIndex]"
        :key="packages[currentIndex].id"
        class="w-full h-full max-h-[calc(100vh-180px)]"
      >
        <PackageCard
          :pkg="packages[currentIndex]"
          @select="handlePackageSelection"
        ></PackageCard>
      </div>
    </transition>
  </div>

  <!-- Right swipe button -->
  <button
    @click="nextPackage"
    :disabled="packages.length <= 1"
    class="absolute right-0 z-20 p-4 bg-primary/90 hover:bg-primary backdrop-blur-sm rounded-l-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-xl active:scale-95 h-24"
    aria-label="Next package"
  >
    <ChevronRight :size="32" class="text-white"></ChevronRight>
  </button>

  <!-- Swipe indicator -->
  <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full z-10">
    <ChevronLeft :size="20" class="text-white/70 animate-pulse"></ChevronLeft>
    <span class="text-white text-sm font-medium">Swipe to browse</span>
    <ChevronRight :size="20" class="text-white/70 animate-pulse"></ChevronRight>
  </div>

  <!-- Package counter -->
  <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
    <div class="inline-flex items-center gap-2 px-6 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10">
      <span class="text-white font-bold text-lg">{{ currentIndex + 1 }}</span>
      <span class="text-white/40">/</span>
      <span class="text-white/60 font-medium">{{ packages.length }}</span>
    </div>
  </div>

  <!-- Dot indicators -->
  <div class="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-3 items-center z-10">
    <button
      v-for="(pkg, idx) in packages"
      :key="pkg.id"
      @click="goTo(idx)"
      :class="[
        'transition-all duration-300 rounded-full',
        idx === currentIndex 
          ? 'w-10 h-3 bg-primary' 
          : 'w-3 h-3 bg-white/30 hover:bg-white/50'
      ]"
      :aria-label="`Go to package ${idx + 1}`"
    ></button>
  </div>
</div>
```

**Update container classes**:
- Change main div to: `class="min-h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden"`
- Change inner container to: `class="relative z-10 flex flex-col h-screen p-3 sm:p-6"`
- Loading/empty states should use `flex-1` for centering

### 2. components/PackageCard.vue

**Complete split layout** - Image on left (50%), Details on right (50%):

```vue
<template>
  <div class="relative bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 h-full">
    
    <!-- Split layout container -->
    <div class="flex flex-col md:flex-row h-full">
      <!-- LEFT SIDE: Image (50% width) -->
      <div class="relative w-full md:w-1/2 overflow-hidden">
        <img 
          :src="props.pkg.img_url" 
          :alt="props.pkg.name" 
          class="w-full h-full object-cover" 
        />
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent"></div>

        <!-- Popular badge -->
        <div v-if="(props.pkg as Package)?.is_popular" class="absolute top-4 left-4">
          <div class="relative">
            <div class="absolute inset-0 bg-amber-500 rounded-full blur-md opacity-60 animate-pulse"></div>
            <div class="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold text-white shadow-lg backdrop-blur-sm"
              style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>POPULAR</span>
            </div>
          </div>
        </div>

        <!-- Price badge -->
        <div class="absolute bottom-4 left-4">
          <div class="relative">
            <div class="absolute inset-0 bg-primary rounded-2xl blur-lg opacity-50"></div>
            <div class="relative inline-flex items-baseline gap-1 px-4 py-2.5 rounded-2xl bg-primary text-gray-900 font-raleway font-extrabold shadow-xl border border-white/20">
              <span class="text-base">₱</span>
              <span class="text-2xl">{{ props.pkg.price }}</span>
              <span class="text-xs opacity-80 ml-1">/ person</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: Details and Modifiers (50% width) -->
      <div class="relative flex-1 p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <!-- Title -->
          <h3 class="text-2xl sm:text-3xl text-white font-raleway font-extrabold mb-3 tracking-tight">
            {{ props.pkg.name }}
          </h3>
          
          <!-- Description -->
          <p v-if="props.pkg.description" class="text-sm text-white/70 mb-4">
            {{ props.pkg.description }}
          </p>

          <!-- Category badges -->
          <div class="mb-4 flex flex-wrap gap-2">
            <span 
              v-for="c in extractModifierGroups(props.pkg)" 
              :key="c"
              class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
              {{ c }}
            </span>
          </div>

          <!-- Modifiers list -->
          <div>
            <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
              <span>Included Items</span>
              <span class="text-white/50 text-sm">({{ meatList.length }})</span>
            </h4>
            
            <div class="space-y-2 max-h-64 overflow-y-auto pr-2 meat-list">
              <template v-if="meatList.length">
                <div 
                  v-for="m in meatList" 
                  :key="m.id || m.name" 
                  class="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                  <img 
                    v-if="m.img_url" 
                    :src="m.img_url" 
                    :alt="m.name" 
                    class="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10" 
                  />
                  <div v-else class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-semibold text-white ring-1 ring-white/10">
                    {{ m.name?.substring(0,1) }}
                  </div>
                  <span class="text-white/90 font-medium text-sm">{{ m.name }}</span>
                </div>
              </template>
              <template v-else>
                <!-- Fallback modifiers -->
                <div class="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-semibold text-white">P</div>
                  <span class="text-white/90 font-medium text-sm">Pork</span>
                </div>
                <div class="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-semibold text-white">B</div>
                  <span class="text-white/90 font-medium text-sm">Beef</span>
                </div>
                <div class="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-semibold text-white">C</div>
                  <span class="text-white/90 font-medium text-sm">Chicken</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- CTA button at bottom -->
        <button
          @click.stop="handleSelect"
          aria-label="Select package"
          class="w-full mt-6 min-h-[56px] px-6 py-4 bg-primary text-secondary font-kanit font-bold text-lg rounded-md transition-all duration-300 shadow-lg hover:shadow-xl hover:opacity-90 active:scale-95 flex items-center justify-center gap-3 ui-hover-lift">
          <span class="text-primaryLight">Select This Package</span>
          <ChevronRight class="w-6 h-6"></ChevronRight>
        </button>
      </div>
    </div>
  </div>
</template>
```

## Key Features

✅ Single package view for all screen sizes
✅ Split layout: 50% image, 50% details/modifiers
✅ Large, obvious swipe buttons on left/right edges
✅ "Swipe to browse" indicator at bottom
✅ Everything fits in viewport (overflow-hidden on main container)
✅ Select button always visible
✅ Consistent button styling (solid primary, no gradients)
✅ Package counter and dot indicators for navigation

## Testing Checklist

- [ ] Only one package shows at a time
- [ ] Image takes exactly 50% width
- [ ] Modifiers list scrollable if needed
- [ ] Select button always visible
- [ ] Swipe gestures work
- [ ] Side buttons visible and functional
- [ ] No content cutoff or overflow scrolling on main page
- [ ] Works on Samsung Galaxy Tab A9 landscape

