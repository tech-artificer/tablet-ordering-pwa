<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  message: string
  orderNumber?: string | null
  countdown: number
  isFinalizing: boolean
}>()

defineEmits<{ returnHome: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
    <Transition name="fade-up" appear>
      <div class="flex flex-col items-center gap-6 max-w-lg w-full text-center">

        <div class="text-7xl" aria-hidden="true">{{ icon }}</div>

        <h1 class="text-4xl font-bold tracking-tight font-raleway">
          {{ title }}
        </h1>

        <p v-if="orderNumber" class="text-lg text-white/60">
          Order {{ orderNumber }}
        </p>

        <p class="text-xl text-white/80 leading-relaxed">
          {{ message }}
        </p>

        <div v-if="isFinalizing" class="text-white/50 text-sm mt-2">
          Finalizing session...
        </div>

        <div v-else class="flex flex-col items-center gap-4 mt-4 w-full">
          <p class="text-white/50 text-sm">
            Returning to welcome screen in {{ countdown }}s
          </p>

          <button
            class="w-full max-w-xs py-4 px-8 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-transform text-white font-semibold text-lg border border-white/20 font-raleway"
            @click="$emit('returnHome')"
          >
            Back to Welcome Now
          </button>
        </div>

      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-up-enter-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}

@media (prefers-reduced-motion: reduce) {
  .fade-up-enter-active { transition: opacity 0.3s ease; }
  .fade-up-enter-from { transform: none; }
}
</style>
