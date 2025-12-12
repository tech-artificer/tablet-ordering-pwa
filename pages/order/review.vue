<script setup lang="ts">
import { useRouter } from 'vue-router';
// import { ElNotification } from 'element-plus';

const router = useRouter();

const handleOrderSubmitted = () => {
  // Logic after the API call succeeds in the child component
  // ElNotification({
  //   title: 'Order Confirmed! 🥳',
  //   message: 'Your food is on its way. Estimated wait time: 7 minutes.',
  //   type: 'success',
  //   duration: 3500,
  // });

  // Set the session state flag (important!)
  localStorage.setItem('session_active', 'true'); 

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