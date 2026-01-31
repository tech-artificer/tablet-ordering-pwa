<script setup lang="ts">
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ acknowledge: [] }>()

const acknowledge = () => emit('acknowledge')
</script>

<template>
  <div
    v-if="props.visible"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-label="Session complete"
  >
    <div class="max-w-xl w-full mx-6 bg-slate-900/90 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
      <div class="text-5xl mb-4">✅</div>
      <h2 class="text-3xl font-bold text-white mb-3">Session Complete</h2>
      <p class="text-white/70 mb-8">Please prepare for the next group.</p>
      <button
        @click="acknowledge"
        class="px-8 py-4 rounded-xl font-bold text-lg bg-primary text-slate-900 hover:bg-primary/90 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Acknowledge
      </button>
      <p class="mt-4 text-xs text-white/50">Auto-reset in 2 seconds</p>
    </div>
  </div>
</template>
