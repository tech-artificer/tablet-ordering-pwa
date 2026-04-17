<script setup lang="ts">
import { useRouter } from 'vue-router';
import { logger } from '~/utils/logger';
import { useSessionStore } from '../../stores/Session';
import confetti from 'canvas-confetti';
// import { ElNotification } from 'element-plus';

const router = useRouter();

const triggerCelebration = () => {
  const colors = ['#F6B56D', '#10B981', '#FFFFFF'];
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
    duration: 2000
  });
};

const handleOrderSubmitted = async () => {
  const timestamp = new Date().toISOString()
  logger.info('[Order Review] Order confirmation received', { timestamp })
  
  // Trigger celebration confetti
  triggerCelebration();
  
  // Logic after the API call succeeds in the child component
  // ElNotification({
  //   title: 'Order Confirmed! 🥳',
  //   message: 'Your food is on its way. Estimated wait time: 7 minutes.',
  //   type: 'success',
  //   duration: 3500,
  // });

  // Mark session active via Session store (centralized localStorage writes)
  try {
    const sessionStore = useSessionStore()
    logger.info('[Order Review] Marking session active', { timestamp })
    await sessionStore.start()
    logger.info('[Session Flow] Order submitted, session active, ready for refill or completion')
  } catch (e) {
    logger.error('[Order Review] Failed to start session store', {
      timestamp,
      error: (e as any)?.message,
    })
  }

  // 1. Navigate to the In-Session (Refill/Support) screen, replacing the history entry
  logger.info('[Order Review] Navigating to in-session screen', { timestamp })
  router.replace('/order/in-session');
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
        <div>
          <h1 class="text-2xl font-bold font-raleway text-white">Review & Confirm</h1>
          <p class="text-sm text-white/50">Double-check your order before submitting</p>
        </div>
      </div>
    
      <OrderingStep3ReviewSubmit @orderSubmitted="handleOrderSubmitted" />
    </div>
  </div>
</template>