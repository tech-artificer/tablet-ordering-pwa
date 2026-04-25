<script setup lang="ts">
import { Users, Minus, Plus } from 'lucide-vue-next'
import { useOrderStore } from '~/stores/Order'

const orderStore = useOrderStore()
const { guestCount } = orderStore

const MIN = 2
const MAX = 20

const canDecrement = computed(() => guestCount.value > MIN)
const canIncrement = computed(() => guestCount.value < MAX)

function decrement() {
  if (canDecrement.value) orderStore.setGuestCount(guestCount.value - 1)
}
function increment() {
  if (canIncrement.value) orderStore.setGuestCount(guestCount.value + 1)
}
</script>

<template>
  <div class="flex flex-col items-center gap-6" role="group" aria-label="Guest count selector">

    <!-- Guest count display -->
    <div class="relative flex items-center justify-center">
      <!-- Ambient glow ring -->
      <div class="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150 pointer-events-none" aria-hidden="true"></div>

      <!-- Ring -->
      <div class="relative w-40 h-40 rounded-full ring-2 ring-primary/30 bg-secondary-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1 shadow-[0_0_40px_rgba(246,181,109,0.12)]">
        <Users :size="22" class="text-primary/60" aria-hidden="true" />
        <span
          class="text-6xl font-black font-raleway text-white leading-none tabular-nums transition-all duration-200"
          aria-live="polite"
          :aria-label="`${guestCount} guests`"
        >
          {{ guestCount }}
        </span>
        <span class="text-xs text-white/40 uppercase tracking-widest font-semibold">guests</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-5">
      <!-- Decrement -->
      <button
        @click="decrement"
        :disabled="!canDecrement"
        class="touch-btn-circle w-14 h-14 rounded-full ring-1 transition-all duration-150
               bg-white/10 ring-white/15 text-white/70
               hover:bg-white/15 hover:ring-primary/50 hover:text-white
               active:scale-90 active:bg-white/20
               disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:ring-white/15 disabled:hover:text-white/70
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        :aria-label="`Decrease guest count, currently ${guestCount}`"
      >
        <Minus :size="22" stroke-width="2.5" />
      </button>

      <!-- Stepper dots -->
      <div class="flex items-center gap-1" aria-hidden="true">
        <div
          v-for="n in MAX"
          :key="n"
          class="w-1.5 h-1.5 rounded-full transition-colors duration-150"
          :class="n <= guestCount ? 'bg-primary' : 'bg-white/15'"
        ></div>
      </div>

      <!-- Increment -->
      <button
        @click="increment"
        :disabled="!canIncrement"
        class="touch-btn-circle w-14 h-14 rounded-full ring-1 transition-all duration-150
               bg-primary/15 ring-primary/30 text-primary
               hover:bg-primary/25 hover:ring-primary/60
               active:scale-90 active:bg-primary/35
               disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary/15 disabled:hover:ring-primary/30
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        :aria-label="`Increase guest count, currently ${guestCount}`"
      >
        <Plus :size="22" stroke-width="2.5" />
      </button>
    </div>

    <!-- Min/max hint -->
    <p class="text-white/30 text-xs font-kanit tracking-wide">
      Min {{ MIN }} · Max {{ MAX }} guests
    </p>

  </div>
</template>
