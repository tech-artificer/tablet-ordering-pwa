<script setup lang="ts">
import type { Package, Modifier } from '../types'
import { ChevronDown, Eye, Sparkles } from 'lucide-vue-next'
import { computed, ref } from 'vue'

const props = defineProps<{ pkg: Package }>()
const emit = defineEmits(['select', 'viewDetails'])

// Category icons and colors for visual grouping
const categoryConfig: Record<string, { icon: string; color: string; gradient: string }> = {
  pork: { icon: '🥓', color: '#F472B6', gradient: 'from-pink-500/20 to-pink-600/10' },
  beef: { icon: '🥩', color: '#EF4444', gradient: 'from-red-500/20 to-red-600/10' },
  chicken: { icon: '🍗', color: '#F59E0B', gradient: 'from-amber-500/20 to-amber-600/10' },
  seafood: { icon: '🦐', color: '#06B6D4', gradient: 'from-cyan-500/20 to-cyan-600/10' },
  fish: { icon: '🐟', color: '#0EA5E9', gradient: 'from-sky-500/20 to-sky-600/10' },
  vegetable: { icon: '🥬', color: '#22C55E', gradient: 'from-green-500/20 to-green-600/10' },
  side: { icon: '🍚', color: '#A78BFA', gradient: 'from-violet-500/20 to-violet-600/10' },
  other: { icon: '✨', color: '#94A3B8', gradient: 'from-slate-500/20 to-slate-600/10' }
}

// Smart categorization: group modifiers by keywords in name or group field
const categorizedModifiers = computed(() => {
  const mods = (props.pkg?.modifiers || []) as Modifier[]
  if (!mods.length) return {}

  const categories: Record<string, Modifier[]> = {}

  mods.forEach(mod => {
    const name = (mod.name || '').toLowerCase()
    const group = (mod.group || '').toLowerCase()
    const searchText = `${name} ${group}`

    let category = 'other'
    if (/pork|bacon|ham|lechon|liempo|sisig/i.test(searchText)) category = 'pork'
    else if (/beef|wagyu|steak|bulalo|tapa|caldereta/i.test(searchText)) category = 'beef'
    else if (/chicken|manok|wings|inasal|tinola/i.test(searchText)) category = 'chicken'
    else if (/shrimp|prawn|crab|lobster|squid|pusit|hipon|alimango/i.test(searchText)) category = 'seafood'
    else if (/fish|bangus|tilapia|salmon|tuna|lapu/i.test(searchText)) category = 'fish'
    else if (/veggie|vegetable|salad|kangkong|pechay|sitaw/i.test(searchText)) category = 'vegetable'
    else if (/rice|side|soup|sauce|dip/i.test(searchText)) category = 'side'

    if (!categories[category]) categories[category] = []
    categories[category].push(mod)
  })

  return categories
})

// Order categories for consistent display
const orderedCategories = computed(() => {
  const order = ['beef', 'pork', 'chicken', 'seafood', 'fish', 'vegetable', 'side', 'other']
  return order.filter(cat => categorizedModifiers.value[cat]?.length)
})

// Total modifiers count
const totalModifiers = computed(() => {
  return (props.pkg?.modifiers || []).length
})

// Expanded category state
const expandedCategory = ref<string | null>(null)

function toggleCategory(category: string) {
  expandedCategory.value = expandedCategory.value === category ? null : category
}

function getCategoryConfig(category: string) {
  return categoryConfig[category] || categoryConfig.other
}

// Get representative image for a category (first item with image)
function getCategoryImage(category: string): string | null {
  const items = categorizedModifiers.value[category] || []
  const withImage = items.find(m => m.img_url)
  return withImage?.img_url || null
}

const handleSelect = () => {
  emit('select', props.pkg)
}

const handleViewDetails = () => {
  emit('viewDetails', props.pkg)
}
</script>

<template>
  <div class="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-full flex flex-col">
    
    <!-- Hero background image with overlay -->
    <div class="absolute inset-0 z-0">
      <NuxtImg
        v-if="props.pkg.img_url"
        :src="props.pkg.img_url"
        :alt="props.pkg.name || 'Package image'"
        class="w-full h-full object-cover"
        loading="lazy"
        sizes="100vw"
        format="webp"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col h-full p-6">
      
      <!-- Top: Package description if available -->
      <div v-if="props.pkg.description" class="mb-4">
        <p class="text-white/80 text-base leading-relaxed line-clamp-2 max-w-2xl mx-auto text-center">
          {{ props.pkg.description }}
        </p>
      </div>

      <!-- Center: Category chips grid -->
      <div class="flex-1 flex flex-col justify-center">
        
        <!-- Total count badge -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/20 backdrop-blur-sm rounded-full border border-primary/30">
            <Sparkles :size="18" class="text-primary" />
            <span class="text-white font-bold text-lg">{{ totalModifiers }} Items Included</span>
          </div>
        </div>

        <!-- Category chips -->
        <div class="flex flex-wrap justify-center gap-3 mb-4 px-4">
          <button
            v-for="category in orderedCategories"
            :key="category"
            @click="toggleCategory(category)"
            :class="[
              'group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all duration-300 min-h-[56px]',
              'border backdrop-blur-md',
              expandedCategory === category 
                ? 'bg-white/20 border-primary/60 scale-105 shadow-lg shadow-primary/20' 
                : 'bg-black/40 border-white/15 hover:bg-white/10 hover:border-white/30'
            ]"
          >
            <!-- Category image or emoji -->
            <div class="relative">
              <NuxtImg
                v-if="getCategoryImage(category)"
                :src="getCategoryImage(category)!"
                :alt="`${category} item`"
                class="w-10 h-10 rounded-xl object-cover ring-2 ring-white/30"
                loading="lazy"
                sizes="80px"
                format="webp"
              />
              <div 
                v-else
                class="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                :class="`bg-gradient-to-br ${getCategoryConfig(category).gradient}`"
              >
                {{ getCategoryConfig(category).icon }}
              </div>
            </div>
            
            <!-- Category name and count -->
            <div class="text-left">
              <div class="text-white font-semibold text-sm capitalize">{{ category }}</div>
              <div class="text-white/60 text-xs">{{ categorizedModifiers[category]?.length }} items</div>
            </div>

            <!-- Expand indicator -->
            <ChevronDown 
              :size="18" 
              :class="[
                'text-white/50 transition-transform duration-300 ml-1',
                expandedCategory === category ? 'rotate-180 text-primary' : ''
              ]"
            />
          </button>
        </div>

        <!-- Expanded category items -->
        <transition name="expand">
          <div 
            v-if="expandedCategory && categorizedModifiers[expandedCategory]?.length"
            class="mt-2 px-4"
          >
            <div class="bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 max-h-[200px] overflow-hidden">
              <!-- Horizontal scrollable row -->
              <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div 
                  v-for="mod in categorizedModifiers[expandedCategory]"
                  :key="mod.id"
                  class="flex-shrink-0 w-28 flex flex-col items-center text-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all duration-200"
                >
                  <NuxtImg
                    v-if="mod.img_url" 
                    :src="mod.img_url" 
                    :alt="mod.name || 'Menu item'" 
                    class="w-16 h-16 rounded-lg object-cover ring-1 ring-white/30 mb-2"
                    loading="lazy"
                    sizes="96px"
                    format="webp"
                  />
                  <div 
                    v-else 
                    class="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xl font-bold text-white ring-1 ring-white/30 mb-2"
                  >
                    {{ mod.name?.substring(0, 1) }}
                  </div>
                  <span class="text-white font-medium text-xs leading-tight line-clamp-2">{{ mod.name }}</span>
                </div>
              </div>
              
              <!-- Scroll hint -->
              <div v-if="categorizedModifiers[expandedCategory].length > 5" class="text-center mt-2">
                <span class="text-white/40 text-xs">← Swipe to see more →</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Bottom: View all button -->
      <div class="mt-4 text-center">
        <button 
          @click="handleViewDetails"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-white/70 hover:text-white text-sm font-medium transition-colors duration-200 rounded-full hover:bg-white/10"
        >
          <Eye :size="16" />
          View All Inclusions
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 300px;
}

/* Text line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.scrollbar-track-transparent::-webkit-scrollbar-track {
  background: transparent;
}
</style>
