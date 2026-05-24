<script setup lang="ts">
import type { Package } from "../../types"

defineProps<{
  selectedPackage: Package | null;
  tableName: string;
  hasPlacedOrder: boolean;
  isBackDisabled: boolean;
}>()

const emit = defineEmits<{
  "back": [];
  "toggleRefillMode": [];
}>()
</script>

<template>
    <div
        class="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/[0.07]"
        style="background: rgba(15,15,15,0.95); backdrop-filter: blur(12px);"
    >
        <!-- Left: Back + title -->
        <div class="flex items-center gap-3 min-w-0">
            <button
                :disabled="isBackDisabled"
                :aria-disabled="isBackDisabled"
                class="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/40"
                :class="isBackDisabled
                    ? 'text-white/25 cursor-not-allowed'
                    : 'text-white/70 hover:text-white hover:bg-white/15 active:scale-95'"
                aria-label="Go back"
                @click="emit('back')"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
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
                v-if="hasPlacedOrder"
                class="flex items-center gap-1.5 bg-success/15 border border-success/25 rounded-full px-2.5 py-1"
            >
                <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
                <span class="text-success text-[10px] font-bold uppercase tracking-wide font-raleway">Live</span>
            </div>

            <!-- Order Refills trigger -->
            <button
                :disabled="!hasPlacedOrder"
                :class="[
                    'flex items-center gap-1.5 border rounded-xl px-3 py-2 font-raleway text-xs font-bold uppercase tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
                    hasPlacedOrder
                        ? 'border-primary/60 text-primary hover:bg-primary/10 active:scale-95 cursor-pointer'
                        : 'border-white/15 text-white/30 opacity-40 cursor-not-allowed'
                ]"
                aria-label="Order refills"
                @click="hasPlacedOrder && emit('toggleRefillMode')"
            >
                <svg
                    class="w-3.5 h-3.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                    aria-hidden="true"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Order Refills
            </button>
        </div>
    </div>
</template>
