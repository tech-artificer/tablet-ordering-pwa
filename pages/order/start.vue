<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

definePageMeta({
    layout: "kiosk"
})

const router = useRouter()
const orderStore = useOrderStore()

const handleGuestConfirmation = () => {
    const timestamp = new Date().toISOString()
    const guestCount = Number(orderStore.guestCount)
    console.log(`[👥 Guest Count Selected] ${guestCount} guests at ${timestamp}`)
    logger.info(`[Session Flow] Guest count set to ${guestCount}`)
    router.push("/order/packageSelection")
}

const goBack = () => {
    console.log(`[↩️ Guest Counter Cancelled] User returned to welcome screen at ${new Date().toISOString()}`)
    router.push("/")
}
</script>

<template>
    <div class="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden">
        <!-- Warm background -->
        <div class="absolute inset-0 bg-screen-base" />

        <!-- Back Button -->
        <button
            class="absolute top-6 left-6 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-white transition-colors"
            aria-label="Go back"
            @click="goBack"
        >
            <ArrowLeft :size="20" stroke-width="2" />
        </button>

        <!-- Content -->
        <div class="relative z-10 flex flex-col items-center gap-8 px-6">
            <!-- Step Indicator -->
            <div class="flex items-center gap-3" aria-label="Order steps">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary text-secondary text-sm font-black flex items-center justify-center shadow-glow">
                        1
                    </div>
                    <span class="text-primary text-xs font-bold uppercase tracking-wide">Guests</span>
                </div>
                <div class="w-8 h-px bg-white/15" />
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/40 text-sm font-bold flex items-center justify-center">
                        2
                    </div>
                    <span class="text-white/30 text-xs font-semibold uppercase tracking-wide">Package</span>
                </div>
                <div class="w-8 h-px bg-white/15" />
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/40 text-sm font-bold flex items-center justify-center">
                        3
                    </div>
                    <span class="text-white/30 text-xs font-semibold uppercase tracking-wide">Menu</span>
                </div>
            </div>

            <div class="space-y-2 text-center">
                <h1 class="text-4xl font-bold font-raleway text-white">
                    <span class="block leading-tight">How Many</span>
                    <span class="text-primary">Guests?</span>
                </h1>
            </div>

            <GuestCounter />

            <div class="flex flex-col items-center gap-3">
                <button
                    type="button"
                    class="btn-primary px-14 py-5 text-lg font-semibold rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all duration-200"
                    @click="handleGuestConfirmation"
                >
                    Ready To Grill
                </button>
                <p class="text-white/60 text-sm font-kanit mt-1">
                    Choose your guest count so we can keep the <span class="text-primary">sizzle going</span>.
                </p>
            </div>
        </div>
    </div>
</template>
