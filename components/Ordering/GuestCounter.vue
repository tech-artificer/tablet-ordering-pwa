<script setup lang="ts">
import { computed } from 'vue';
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
    <section class="w-full max-w-md flex flex-col items-center justify-center gap-6">
        <!-- Guest Counter Label -->
        <div class="text-center text-white/60 text-xs uppercase tracking-widest font-semibold">
            Guest Counter
        </div>

        <!-- Main Title -->
        <h1 class="text-center text-5xl lg:text-6xl font-extrabold font-raleway tracking-tight text-white">
            How Many <span class="text-primary">Guests?</span>
        </h1>

        <!-- Counter Controls -->
        <div class="w-full flex flex-col items-center gap-6 py-8">
            <div class="flex items-center justify-center gap-12">
                <!-- Minus Button -->
                <button
                    class="touch-btn-circle w-16 h-16 border-2 border-primary font-bold bg-transparent text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 active:scale-95 transition-all duration-150"
                    :disabled="guestCount <= MIN_GUESTS" 
                    @click="decrementGuests()"
                    aria-label="Decrease guest count"
                >
                    <Minus :size="32" :stroke-width="2.5" />
                </button>
                
                <!-- Guest Count Display -->
                <div class="text-center">
                    <div class="text-8xl font-black text-white mb-1">
                        {{ guestCount }}
                    </div>
                    <div class="text-white/70 text-xs uppercase tracking-widest font-semibold">
                        Guests
                    </div>
                </div>

                <!-- Plus Button -->
                <button
                    class="touch-btn-circle w-16 h-16 border-2 border-primary font-bold bg-transparent text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/10 active:scale-95 transition-all duration-150"
                    :disabled="guestCount >= MAX_GUESTS" 
                    @click="incrementGuests()"
                    aria-label="Increase guest count"
                >
                    <Plus :size="32" :stroke-width="2.5" />
                </button>
            </div>
            
            <!-- Range constraint -->
            <p class="text-white/60 text-sm font-kanit">{{ MIN_GUESTS }} - {{ MAX_GUESTS }} guests per table</p>
        </div>
    </section>
</template>