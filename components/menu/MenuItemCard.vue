<template>
  <div :class="[
    'relative p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-white flex gap-3 items-center transition-all duration-150 shadow-lg border border-white/10 backdrop-blur-sm',
    (!item.is_available || item.is_available !== false) ? 'active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
  ]">
    
    <!-- Quantity Badge -->
    <div v-if="quantity > 0" class="absolute -top-2 -right-2 bg-primary text-secondary text-sm font-bold w-7 h-7 rounded-full shadow-lg flex items-center justify-center z-10 animate-bounce-in">
      {{ quantity }}
    </div>

    <!-- Image -->
    <div class="w-28 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
      <img v-if="item.image" :src="item.image" class="w-full h-full object-cover" :alt="item.name" />
      <div v-else class="w-full h-full flex items-center justify-center text-sm text-gray-400">
        <span class="text-2xl">🍽️</span>
      </div>
    </div>
    
    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-start gap-2 mb-1">
        <h3 class="text-base font-bold truncate">{{ item.name }}</h3>
        <div class="bg-white text-secondary text-xs font-bold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap flex-shrink-0">
          {{ item.price }}
        </div>
      </div>
      <p class="text-xs text-gray-300 line-clamp-2 mb-2">{{ item.description }}</p>
      <div class="flex gap-2">
        <FlameButton @click="handleAdd" class="flex-1 !py-2 !text-sm" :disabled="item.is_available === false">
          <span class="flex items-center justify-center gap-1">
            <span v-if="item.is_available !== false">+</span>
            <span>{{ item.is_available === false ? 'Unavailable' : 'Add' }}</span>
          </span>
        </FlameButton>
        <FlameButton variant="secondary" @click="$emit('view', item)" class="flex-1 !py-2 !text-sm" :disabled="item.is_available === false">
          Options
        </FlameButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FlameButton from '../../components/ui/FlameButton.vue'

const props = defineProps({ 
  item: Object,
  quantity: { type: Number, default: 0 }
})

const emit = defineEmits(['add', 'view'])

const isAdding = ref(false)

function handleAdd() {
  if (isAdding.value) return
  isAdding.value = true
  emit('add', props.item)
  setTimeout(() => {
    isAdding.value = false
  }, 300)
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
