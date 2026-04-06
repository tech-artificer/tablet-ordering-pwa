<script setup lang="ts">
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
  const guestCount = orderStore.guestCount
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
    <div class="absolute inset-0 bg-gradient-to-br from-secondary-dark via-secondary to-accent-warm opacity-90"></div>
    
    <!-- Back Button -->
    <button 
      @click="goBack"
      class="absolute top-6 left-6 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-white transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft :size="20" stroke-width="2" />
    </button>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center gap-12 px-6">
      <div class="space-y-3 text-center">
        <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80">Step 1</p>
        <h1 class="text-5xl font-bold font-raleway text-white">
          <span class="block leading-tight">How Many</span>
          <span class="text-primary">Guests?</span>
        </h1>
      </div>

      <OrderingGuestCounter />
      
      <div class="flex flex-col items-center gap-4">
        <FlameButton 
          variant="primary" 
          size="lg"
          class="shadow-glow"
          @click="handleGuestConfirmation"
        >
          Ready to Select Package
        </FlameButton>
        <p class="text-white/60 text-sm font-kanit text-center max-w-xs">
          Select your party size so we can prep the perfect feast for your group.
        </p>
      </div>
    </div>
  </div>
</template>
