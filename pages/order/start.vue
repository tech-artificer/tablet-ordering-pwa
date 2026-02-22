<script setup lang="ts">
import { ChevronRight, ArrowLeft } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router';
import { useOrderStore } from '~/stores/Order';
import { recoverActiveOrderState } from '~/composables/useActiveOrderRecovery'
import { logger } from '~/utils/logger';
import PrimaryButton from '~/components/common/PrimaryButton.vue';

const router = useRouter();
const orderStore = useOrderStore();

onMounted(async () => {
  const recovery = await recoverActiveOrderState('order-start')
  if (recovery.hasActiveOrder) {
    await router.replace('/order/in-session')
  }
})

// // This handler receives the confirmation signal from the child component
const handleGuestConfirmation = () => {
  const timestamp = new Date().toISOString()
  const guestCount = orderStore.guestCount
  console.log(`[👥 Guest Count Selected] ${guestCount} guests at ${timestamp}`)
  logger.info(`[Session Flow] Guest count set to ${guestCount}`)
  // Route to main package selection page (restored with richer UI)
  router.push('/order/packageSelection');
};

const goBack = () => {
  console.log(`[↩️ Guest Counter Cancelled] User returned to welcome screen at ${new Date().toISOString()}`)
  router.push('/');
};
</script>
<template>
  <div class="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
    <!-- Back Button - Consistent with packageSelection (icon only) -->
    <button 
      @click="goBack"
      class="icon-btn absolute top-4 left-4 !w-12 !h-12 text-white"
      aria-label="Go back"
    >
      <ArrowLeft :size="24" :stroke-width="2.5" />
    </button>
    
    <!-- Page Title -->
    <!-- <div class="absolute top-4 left-1/2 -translate-x-1/2">
      <h1 class="text-xl font-bold font-kanit text-white">How Many Guests?</h1>
    </div> -->

    <!-- Main Content -->
    <div class="flex flex-col items-center gap-8">
      <OrderingGuestCounter />
      
      <div class="flex flex-col items-center gap-3">
        <PrimaryButton 
          class="!px-10 !py-4 !text-lg ripple"
          @click="handleGuestConfirmation"
        >
          <span class="flex items-center gap-2">
            Ready To Grill
            <ChevronRight :size="20" />
          </span>
        </PrimaryButton>
        <p class="text-white/60 text-sm font-kanit">Select your guest count and continue</p>
      </div>
    </div>
  </div>
</template>