<script setup lang="ts">
import { computed } from 'vue';
import { Minus, Plus } from 'lucide-vue-next'
import { useOrderStore } from '../../stores/order';

const orderStore = useOrderStore();
const guestCount = computed(() => orderStore.guestCount);

const MIN_GUESTS = 2;
const MAX_GUESTS = 20;

const incrementGuests = () => {
    if (guestCount.value < MAX_GUESTS) {
        orderStore.setGuestCount(guestCount.value + 1)
    }
}

const decrementGuests = () => {
    if (guestCount.value > MIN_GUESTS) {
        orderStore.setGuestCount(guestCount.value - 1)
    }
}

</script>

<template>
    <section class="flex flex-col items-center justify-center">
        <div class="flex items-center justify-center gap-10 mt-3 mb-3">
            <!-- Minus Button - Larger touch target (56x56) -->
            <button
                class="touch-btn-circle w-14 h-14 border-2 border-primary font-bold font-kanit bg-primary text-secondary disabled:opacity-40 disabled:cursor-not-allowed ripple shadow-lg hover:shadow-xl hover:shadow-primary/25 active:scale-95"
                :disabled="guestCount <= MIN_GUESTS" @click="decrementGuests()" aria-label="Decrease guest count">
                <Minus :size="28" :stroke-width="3" />
            </button>

            <!-- Guest Count Display -->
            <div
                class="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary bg-transparent text-white text-6xl font-bold shadow-lg shadow-primary/20">
                {{ guestCount }}
            </div>

            <!-- Plus Button - Larger touch target (56x56) -->
            <button
                class="touch-btn-circle w-14 h-14 border-2 border-primary font-bold font-kanit bg-primary text-secondary disabled:opacity-40 disabled:cursor-not-allowed ripple shadow-lg hover:shadow-xl hover:shadow-primary/25 active:scale-95"
                :disabled="guestCount >= MAX_GUESTS" @click="incrementGuests()" aria-label="Increase guest count">
                <Plus :size="28" :stroke-width="3" />
            </button>
        </div>

        <!-- Range indicator -->
        <p class="text-white/40 text-sm font-kanit mt-2">2 - 20 guests</p>
    </section>
</template>