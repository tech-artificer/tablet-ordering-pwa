<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'
import { useOrderStore } from '../../stores/Order';

const orderStore = useOrderStore();
const guestCount = computed(() => Number(orderStore.guestCount));

const MIN_GUESTS = 2;
const MAX_GUESTS = 20;

const QUICK_PICKS = [2, 4, 6, 8, 10] as const;

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

const selectQuick = (n: number) => {
    orderStore.setGuestCount(n)
}
</script>

<template>
    <section class="w-full max-w-sm flex flex-col items-center gap-8">

        <!-- Main Counter -->
        <div class="w-full flex flex-col items-center gap-6">
            <div class="flex items-center justify-center gap-6">
                <!-- Decrement Button -->
                <button
                    class="flex items-center justify-center w-16 h-16 rounded-full font-bold transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    :class="guestCount <= MIN_GUESTS
                        ? 'border-2 border-white/10 bg-white/5 text-white/25 cursor-not-allowed'
                        : 'border-2 border-primary/50 bg-white/5 hover:bg-primary/20 text-primary'"
                    :disabled="guestCount <= MIN_GUESTS"
                    @click="decrementGuests()"
                    aria-label="Decrease guest count"
                >
                    <Minus :size="28" stroke-width="2.5" />
                </button>

                <!-- Count Display -->
                <div class="text-center min-w-[5rem]">
                    <Transition name="count-pop" mode="out-in">
                        <div :key="guestCount" class="text-7xl font-black text-white leading-none">
                            {{ guestCount }}
                        </div>
                    </Transition>
                    <div class="text-primary text-sm uppercase tracking-[0.18em] font-bold mt-1">
                        {{ guestCount === 1 ? 'Guest' : 'Guests' }}
                    </div>
                </div>

                <!-- Increment Button -->
                <button
                    class="flex items-center justify-center w-16 h-16 rounded-full font-bold transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    :class="guestCount >= MAX_GUESTS
                        ? 'border-2 border-white/10 bg-white/5 text-white/25 cursor-not-allowed'
                        : 'border-2 border-primary/50 bg-white/5 hover:bg-primary/20 text-primary'"
                    :disabled="guestCount >= MAX_GUESTS"
                    @click="incrementGuests()"
                    aria-label="Increase guest count"
                >
                    <Plus :size="28" stroke-width="2.5" />
                </button>
            </div>

            <!-- Quick-pick presets -->
            <div class="flex flex-col items-center gap-2.5">
                <p class="text-white/40 text-[11px] tracking-[0.15em] uppercase font-semibold">Quick select</p>
                <div class="flex items-center gap-2">
                    <button
                        v-for="n in QUICK_PICKS"
                        :key="n"
                        @click="selectQuick(n)"
                        :aria-current="guestCount === n ? 'true' : undefined"
                        class="w-12 h-12 rounded-full text-sm font-bold border transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        :class="guestCount === n
                            ? 'bg-primary text-secondary border-primary shadow-glow scale-105'
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-primary/15 hover:border-primary/30 hover:text-white'"
                        :aria-label="`Select ${n} guests`"
                    >{{ n }}</button>
                </div>
            </div>

            <!-- Range info -->
            <p class="text-white/35 text-xs font-kanit tracking-wider">
                {{ MIN_GUESTS }}–{{ MAX_GUESTS }} guests per table
            </p>
        </div>

    </section>
</template>

<style scoped>
.count-pop-enter-active,
.count-pop-leave-active {
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
}
.count-pop-enter-from {
    transform: translateY(-8px) scale(0.9);
    opacity: 0;
}
.count-pop-leave-to {
    transform: translateY(8px) scale(0.9);
    opacity: 0;
}
</style>