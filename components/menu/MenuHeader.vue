<script setup lang="ts">
import type { Package } from "../../types"

defineProps<{
  selectedPackage: Package | null;
  tableName: string;
  hasPlacedOrder: boolean;
  isBackDisabled: boolean;
  cartCount: number;
}>()

const emit = defineEmits<{
  "back": [];
  "openCart": [];
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
                <p class="text-white font-bold text-base leading-tight truncate">
                    {{ tableName }}
                </p>
                <p class="text-white/35 text-[10px] uppercase tracking-[0.15em] font-semibold leading-tight">
                    {{ selectedPackage ? (selectedPackage as any).description || 'Korean BBQ Selection' : 'Korean BBQ' }}
                </p>
            </div>
        </div>

        <!-- Right: Table pill + package name + live badge -->
        <div class="flex items-center gap-2 flex-shrink-0">
            <div class="hidden sm:flex items-center gap-1.5 bg-white/[0.05] rounded-full px-3 py-1 border border-white/[0.07]">
                <svg
                    class="w-3 h-3 text-white/35"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
                <span class="text-white/55 text-[11px] font-medium">{{ tableName }}</span>
            </div>

            <div v-if="selectedPackage" class="flex flex-col items-end">
                <span class="text-white/30 text-[9px] uppercase tracking-[0.18em] font-bold leading-none mb-0.5">Package</span>
                <span class="text-primary font-bold text-sm leading-tight truncate max-w-[130px]">{{ selectedPackage.name }}</span>
            </div>

            <div
                v-if="hasPlacedOrder"
                class="flex items-center gap-1.5 bg-success/15 border border-success/25 rounded-full px-2.5 py-1"
            >
                <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
                <span class="text-success text-[10px] font-bold uppercase tracking-wide">Live</span>
            </div>

            <!-- Cart trigger -->
            <button
                class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                aria-label="Open order summary"
                @click="emit('openCart')"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span
                    v-if="cartCount > 0"
                    class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-secondary text-[10px] font-black flex items-center justify-center tabular-nums leading-none"
                >{{ cartCount }}</span>
            </button>
        </div>
    </div>
</template>
