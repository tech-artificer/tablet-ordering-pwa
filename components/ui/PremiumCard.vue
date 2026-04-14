<template>
  <div 
    :class="[
      'rounded-xl overflow-hidden',
      'border transition-all duration-300',
      'flex flex-col h-full',
      interactive ? 'cursor-pointer hover:shadow-warm hover:border-primary/50' : '',
      isEmpty ? 'border-white/10 bg-white/[0.02]' : 'border-white/20 bg-gradient-to-br from-white/8 to-white/3',
      className
    ]"
  >
    <!-- Image Section -->
    <div v-if="hasImage" class="relative h-40 overflow-hidden bg-secondary-dark">
      <img 
        :src="image" 
        :alt="title"
        class="w-full h-full object-cover"
      />
      <!-- Premium badge -->
      <div v-if="premium" class="absolute top-2 right-2 bg-primary/90 text-secondary-dark px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
        Premium
      </div>
    </div>
    
    <!-- Content Section -->
    <div class="flex-1 p-4 flex flex-col gap-3">
      <!-- Title & Badge -->
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-white font-semibold text-base leading-tight">{{ title }}</h3>
          <p v-if="subtitle" class="text-white/60 text-xs mt-1">{{ subtitle }}</p>
        </div>
      </div>
      
      <!-- Description -->
      <p v-if="description" class="text-white/70 text-sm leading-relaxed">{{ description }}</p>
      
      <!-- Items List (for package cards) -->
      <div v-if="items && items.length" class="space-y-1">
        <div v-for="item in items" :key="item" class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
          <span class="text-white/70 text-xs">{{ item }}</span>
        </div>
      </div>
      
      <!-- Price Section -->
      <div v-if="price" class="mt-auto pt-2 border-t border-white/10">
        <p class="text-primary text-lg font-bold">{{ price }}</p>
        <p v-if="priceSubtext" class="text-white/50 text-xs">{{ priceSubtext }}</p>
      </div>
    </div>
    
    <!-- Footer Action -->
    <div v-if="$slots.footer" class="p-4 border-t border-white/10 bg-white/2">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  price: { type: String, default: '' },
  priceSubtext: { type: String, default: '' },
  premium: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  isEmpty: { type: Boolean, default: false },
  items: { type: Array as PropType<string[]>, default: null },
  className: { type: String, default: '' }
})

const hasImage = computed(() => !!props.image)
</script>

<style scoped>
</style>
