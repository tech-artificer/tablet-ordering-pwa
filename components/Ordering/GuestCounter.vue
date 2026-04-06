<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'
import { useOrderStore } from '../../stores/Order';

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
    <section class="w-full max-w-md flex flex-col items-center justify-center gap-8">
        <!-- Counter Controls -->
        <div class="w-full flex flex-col items-center gap-8">
            <div class="flex items-center justify-center gap-16">
                <!-- Decrement Button -->
                <button
                    class="flex items-center justify-center w-20 h-20 rounded-full border-2 border-primary/60 font-bold bg-white/5 hover:bg-primary/20 text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all duration-200"
                    :disabled="guestCount <= MIN_GUESTS" 
                    @click="decrementGuests()"
                    aria-label="Decrease guest count"
                >
                    <Minus :size="36" stroke-width="2.5" />
                </button>
                
                <!-- Guest Count Display -->
                <div class="text-center">
                    <div class="text-9xl font-black text-white leading-none mb-2">
                        {{ guestCount }}
                    </div>
                    <div class="text-primary text-sm uppercase tracking-[0.15em] font-bold">
                        {{ guestCount === 1 ? 'Guest' : 'Guests' }}
                    </div>
                </div>

                <!-- Increment Button -->
                <button
                    class="flex items-center justify-center w-20 h-20 rounded-full border-2 border-primary/60 font-bold bg-white/5 hover:bg-primary/20 text-primary disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all duration-200"
                    :disabled="guestCount >= MAX_GUESTS" 
                    @click="incrementGuests()"
                    aria-label="Increase guest count"
                >
                    <Plus :size="36" stroke-width="2.5" />
                </button>
            </div>
            
            <!-- Range Info -->
            <p class="text-white/50 text-xs font-kanit tracking-wider">
                {{ MIN_GUESTS }}–{{ MAX_GUESTS }} guests maximum per table
            </p>
        </div>
    </section>
</template>

<style scoped>
</style>