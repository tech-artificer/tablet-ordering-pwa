<script setup lang="ts">
import { useRouter } from 'vue-router';
// import { ElNotification } from 'element-plus';

const router = useRouter();

const handleOrderSubmitted = async () => {
  // Logic after the API call succeeds in the child component
  // ElNotification({
  //   title: 'Order Confirmed! 🥳',
  //   message: 'Your food is on its way. Estimated wait time: 7 minutes.',
  //   type: 'success',
  //   duration: 3500,
  // });

  // Mark session active via Session store (centralized localStorage writes)
  try {
    const { useSessionStore } = await import('../../stores/Session')
    const sessionStore = useSessionStore()
    await sessionStore.start()
  } catch (e) {
    // Fallback: do NOT write session_active directly; log instead
    // Session store should centralize persistence of the flag.
    // Using console.warn keeps this safe in environments without logger.
    // eslint-disable-next-line no-console
    console.warn('sessionStore.start() failed; not setting session_active flag', e)
  }

  // 1. Navigate to the In-Session (Refill/Support) screen, replacing the history entry
  router.replace('/order/in-session');
};
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <h1 class="text-3xl font-bold mb-6 text-orange-400">3. Review and Confirm Order</h1>
    
    <OrderingStep3ReviewSubmit @orderSubmitted="handleOrderSubmitted" />
  </div>
</template>