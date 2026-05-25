<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next"
import type { Package } from "../../types"

const props = defineProps<{
  selectedPackage: Package | null;
  tableName: string;
  hasPlacedOrder: boolean;
  isBackDisabled: boolean;
  isRefillMode?: boolean;
}>()

const emit = defineEmits<{
  "back": [];
  "backToSession": [];
}>()

// In refill mode the back button is repurposed as "Back to Session" and must
// stay enabled even though hasPlacedOrder is true — that's the whole point of
// giving the customer a way out of the refill menu.
const isBackInteractive = () => (props.isRefillMode ? true : !props.isBackDisabled)

const onBackClick = () => {
    if (props.isRefillMode) {
        emit("backToSession")
        return
    }
    if (props.isBackDisabled) { return }
    emit("back")
}
</script>

<template>
    <div
        class="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/[0.07]"
        style="background: rgba(15,15,15,0.95); backdrop-filter: blur(12px);"
    >
        <!-- Left: Back + title -->
        <div class="flex items-center gap-3 min-w-0">
            <button
                :disabled="!isBackInteractive()"
                :aria-disabled="!isBackInteractive()"
                class="flex-shrink-0 h-9 rounded-xl border flex items-center justify-center gap-1.5 px-2.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/40"
                :class="[
                    isRefillMode
                        ? 'border-success/40 bg-success/10 text-success hover:bg-success/20 active:scale-95'
                        : isBackInteractive()
                            ? 'border-white/10 bg-white/[0.07] text-white/70 hover:text-white hover:bg-white/15 active:scale-95'
                            : 'border-white/10 bg-white/[0.07] text-white/25 cursor-not-allowed'
                ]"
                :aria-label="isRefillMode ? 'Back to your table session' : 'Go back'"
                @click="onBackClick"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span
                    v-if="isRefillMode"
                    class="text-[11px] font-bold uppercase tracking-wide font-raleway"
                >Back to Session</span>
            </button>
            <div class="min-w-0">
                <p class="text-white font-bold text-lg leading-tight truncate font-raleway">
                    {{ tableName }}
                </p>
            </div>
        </div>

        <!-- Right: package name + live badge + cart
             Note: the table-name pill that used to live here was removed
             2026-05-21 — the left side already shows the table name
             prominently, and rendering it twice in the header is noise.
             Package name remains on the right as the contextual badge. -->
        <div class="flex items-center gap-2 flex-shrink-0">
            <div v-if="selectedPackage" class="flex flex-col items-end">
                <span class="text-white/30 text-[9px] uppercase tracking-[0.18em] font-bold leading-none mb-0.5 font-raleway">Package</span>
                <span class="text-primary font-bold text-sm leading-tight truncate max-w-[130px] font-raleway">{{ selectedPackage.name }}</span>
            </div>

            <div
                v-if="isRefillMode"
                class="flex items-center gap-1.5 bg-success/15 border border-success/30 rounded-full px-2.5 py-1"
            >
                <RefreshCw class="w-3 h-3 text-success" :stroke-width="2.5" />
                <span class="text-success text-[10px] font-bold uppercase tracking-wide font-raleway">Refill Mode</span>
            </div>

            <div
                v-else-if="hasPlacedOrder"
                class="flex items-center gap-1.5 bg-success/15 border border-success/25 rounded-full px-2.5 py-1"
            >
                <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
                <span class="text-success text-[10px] font-bold uppercase tracking-wide font-raleway">Live</span>
            </div>
        </div>
    </div>
</template>
