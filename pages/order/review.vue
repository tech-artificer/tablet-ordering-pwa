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
  <div class="relative h-screen w-screen flex flex-col overflow-hidden">
    <!-- Warm Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-secondary-dark via-secondary to-accent-warm opacity-90"></div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center gap-4 p-6 border-b border-white/10">
        <button
          @click="goBack"
          class="flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-primary transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft :size="20" stroke-width="2" />
        </button>
        <div>
          <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80">Step 3</p>
          <h1 class="text-3xl font-bold font-raleway text-white">
            Ready to <span class="text-primary">Grill?</span>
          </h1>
        </div>
      </div>

      <!-- Content: Review Form -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <OrderingStep3ReviewSubmit @orderSubmitted="handleOrderSubmitted" />
      </div>
    </div>
  </div>
</template>