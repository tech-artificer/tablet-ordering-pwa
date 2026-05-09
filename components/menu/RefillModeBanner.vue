<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next"

defineProps<{
  hasPlacedOrder: boolean;
  isRefillMode: boolean;
}>()

const emit = defineEmits<{
  "toggleRefillMode": [];
  "backToSession": [];
}>()
</script>

<template>
    <div class="bg-success/20 border-b border-success/30 px-6 py-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <RefreshCw :size="24" :stroke-width="2" class="text-success" />
                <div>
                    <p class="font-bold text-success">
                        Refill Mode Active
                    </p>
                    <p class="text-sm text-success/80">
                        Only unlimited items available (Meats &amp; Sides)
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button
                    class="flex items-center gap-1.5 rounded-xl border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition hover:bg-success/20 active:scale-95"
                    @click="emit('backToSession')"
                >
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Session
                </button>
                <refill-button
                    :has-placed-order="hasPlacedOrder"
                    :is-refill-mode="isRefillMode"
                    @toggle-refill-mode="emit('toggleRefillMode')"
                />
            </div>
        </div>
    </div>
</template>
