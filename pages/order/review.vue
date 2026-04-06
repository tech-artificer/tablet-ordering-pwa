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
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <h1 class="text-3xl font-bold mb-6 text-orange-400">3. Review and Confirm Order</h1>
    
    <OrderingStep3ReviewSubmit @orderSubmitted="handleOrderSubmitted" />
  </div>
</template>