<script setup lang="ts">
import { onMounted } from 'vue';
import { ArrowLeft } from 'lucide-vue-next'
import { useOrderStore } from '~/stores/Order';
import { recoverActiveOrderState } from '~/composables/useActiveOrderRecovery'
import { logger } from '~/utils/logger';

const router = useRouter();
const orderStore = useOrderStore();

onMounted(async () => {
  const recovery = await recoverActiveOrderState('order-start')
  if (recovery.hasActiveOrder) {
    await router.replace('/order/in-session')
  }
})

const handleGuestConfirmation = () => {
  const timestamp = new Date().toISOString()
  const guestCount = Number(orderStore.guestCount)
  console.log(`[👥 Guest Count Selected] ${guestCount} guests at ${timestamp}`)
  logger.info(`[Session Flow] Guest count set to ${guestCount}`)
  router.push('/order/packageSelection');
};

const goBack = () => {
  console.log(`[↩️ Guest Counter Cancelled] User returned to welcome screen at ${new Date().toISOString()}`)
  router.push('/');
};
</script>

<template>
  <div class="relative h-screen w-screen flex flex-col items-center justify-center overflow-hidden">
    <!-- Warm background -->
    <div class="absolute inset-0 bg-screen-base"></div>
    
    <!-- Back Button -->
    <button 
      @click="goBack"
      class="absolute top-6 left-6 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-white transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft :size="20" stroke-width="2" />
    </button>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center gap-8 px-6">
      <!-- Step Indicator -->
      <div class="flex items-center gap-3" aria-label="Order steps">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-primary text-secondary text-sm font-black flex items-center justify-center shadow-glow">1</div>
          <span class="text-primary text-xs font-bold uppercase tracking-wide">Guests</span>
        </div>
        <div class="w-8 h-px bg-white/15"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/40 text-sm font-bold flex items-center justify-center">2</div>
          <span class="text-white/30 text-xs font-semibold uppercase tracking-wide">Package</span>
        </div>
        <div class="w-8 h-px bg-white/15"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white/40 text-sm font-bold flex items-center justify-center">3</div>
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
      
      <div class="flex flex-col items-center gap-4">
        <div class="relative group">
          <div class="absolute -inset-2 rounded-2xl bg-primary/25 blur-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <button
            @click="handleGuestConfirmation"
            class="relative flex items-center justify-center gap-2.5 rounded-xl font-bold text-[15px] tracking-wide transition-all duration-200
                   bg-gradient-to-br from-primary via-primary to-primary-dark text-secondary
                   shadow-[0_2px_20px_rgba(246,181,109,0.30)]
                   hover:shadow-[0_4px_28px_rgba(246,181,109,0.50)] hover:brightness-110
                   active:scale-[0.97] active:shadow-none
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                   min-h-[52px] px-8"
            aria-label="Confirm guest count and select package"
          >
            Choose a Package
          </button>
        </div>
        <p class="text-white/60 text-sm font-kanit text-center max-w-xs">
          Select your party size so we can prep the perfect feast for your group.
        </p>
      </div>
    </div>
  </div>
</template>
