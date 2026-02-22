<script setup lang="ts">
import type { Package, Modifier } from '../types'
import { computed, ref } from 'vue'

const props = defineProps<{ pkg: Package }>()
const emit = defineEmits(['select'])

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

const activeCategory = ref<string>('all')

const filteredModifiers = computed(() => {
  if (activeCategory.value === 'all') {
    return orderedCategories.value.flatMap(category => categorizedModifiers.value[category] || [])
  }
  return categorizedModifiers.value[activeCategory.value] || []
})

const activeCategoryLabel = computed(() => {
  if (activeCategory.value === 'all') return 'All'
  return activeCategory.value.charAt(0).toUpperCase() + activeCategory.value.slice(1)
})

const handleSelect = () => {
  emit('select', props.pkg)
}
</script>

<template>
  <div class="relative bg-[#131316] rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-full flex flex-col">
    <div class="p-5 md:p-6 flex flex-col h-full">
      <!-- <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-white text-2xl font-extrabold tracking-tight">Starter Tray</h3>
          <p class="text-white/60 text-sm mt-1">View meats included in the selected package.</p>
        </div>
        <div class="text-primary/90 text-xs font-bold tracking-[0.18em] uppercase">{{ props.pkg.name }}</div>
      </div> -->

      <!-- <div class="h-px bg-white/10 my-4"></div> -->

      <div class="flex flex-wrap items-center gap-2 mb-4">
        <span class="text-white/50 text-xs tracking-[0.22em] uppercase mr-1">Filter</span>
        <button
          @click="activeCategory = 'all'"
          :class="[
            'px-4 py-2 rounded-full text-xs font-bold tracking-[0.12em] uppercase border transition-colors',
            activeCategory === 'all'
              ? 'bg-primary text-black border-primary'
              : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10'
          ]"
        >
          All
        </button>
        <button
          v-for="category in orderedCategories"
          :key="category"
          @click="activeCategory = category"
          :class="[
            'px-4 py-2 rounded-full text-xs font-bold tracking-[0.12em] uppercase border transition-colors',
            activeCategory === category
              ? 'bg-primary text-black border-primary'
              : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10'
          ]"
        >
          {{ category }}
        </button>
      </div>

      <!-- <div class="mb-3 text-white text-2xl font-extrabold capitalize">{{ activeCategoryLabel }}</div> -->

      <div class="flex-1 overflow-y-auto pr-1">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          <button
            v-for="(mod, index) in filteredModifiers"
            :key="mod.id"
            @click="handleSelect"
            class="relative text-left rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden"
            type="button"
          >
            <div class="relative h-36 md:h-40 bg-black/20 flex items-center justify-center overflow-hidden">
              <img
                v-if="mod.img_url"
                :src="mod.img_url"
                :alt="mod.name"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-4xl font-bold text-white/50 bg-white/5"
              >
                {{ mod.name?.substring(0, 1) }}
              </div>

              <span class="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-extrabold tracking-[0.15em] uppercase">
                Included
              </span>
            </div>

            <div class="p-3">
              <div class="text-white/45 text-xs font-semibold tracking-[0.12em] uppercase mb-1">
                {{ mod.receipt_name || `M${index + 1}` }}
              </div>
              <div class="text-white font-bold text-base leading-tight line-clamp-2">{{ mod.name }}</div>
            </div>
          </button>
        </div>

        <div v-if="filteredModifiers.length === 0" class="text-center text-white/50 py-10 text-sm">
          No inclusions found for this filter.
        </div>
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
</style>
