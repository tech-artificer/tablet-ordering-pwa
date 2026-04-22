<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
import { logger } from '~/utils/logger';
import { useSessionStore } from '../../stores/Session';
import confetti from 'canvas-confetti';

const router = useRouter();

const triggerCelebration = () => {
  const colors = ['#F6B56D', '#10B981', '#FFFFFF'];
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.5 },
    colors: colors,
    duration: 2000
  });
};

const handleOrderSubmitted = async () => {
  const timestamp = new Date().toISOString()
  logger.info('[Order Review] Order confirmation received', { timestamp })
  
  triggerCelebration();

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

  logger.info('[Order Review] Navigating to in-session screen', { timestamp })
  router.replace('/order/in-session');
};

const goBack = () => {
  router.push('/menu');
};
</script>

<template>
  <NuxtErrorBoundary>
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
    <template #error="{ error, clearError }">
      <div class="flex h-screen items-center justify-center bg-gray-900 text-white flex-col gap-6 p-8">
        <p class="text-xl font-bold text-red-400">Something went wrong</p>
        <p class="text-sm text-gray-400 text-center max-w-sm">{{ error?.message || 'An unexpected error occurred.' }}</p>
        <button
          class="px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:opacity-90 transition"
          @click="clearError()"
        >Try Again</button>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>