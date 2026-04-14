<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '~/stores/Session'

const sessionStore = useSessionStore()
const router = useRouter()
const redirecting = ref(false)

const totalMs = computed(() => {
  if (sessionStore.sessionEndsAt && sessionStore.sessionStartedAt) {
    return Math.max(1, Number(sessionStore.sessionEndsAt) - Number(sessionStore.sessionStartedAt))
  }
  return 60 * 60 * 1000
})

const remainingMs = computed(() => Number(sessionStore.remainingMs || 0))

const progress = computed(() => {
  if (!totalMs.value) return 0
  return Math.max(0, Math.min(100, (remainingMs.value / totalMs.value) * 100))
})

const formattedRemaining = computed(() => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs.value / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

onMounted(() => {
  sessionStore.ensureTimer()
})

watch(() => sessionStore.isActive, (active) => {
  if (active) sessionStore.ensureTimer()
})

watch(remainingMs, async (ms) => {
  if (ms > 0) return
  if (!sessionStore.timerExpired.value || redirecting.value) return
  redirecting.value = true
  try {
    await router.replace('/')
  } finally {
    sessionStore.timerExpired.value = false
    redirecting.value = false
  }
})
</script>

<template>
  <div v-if="sessionStore.isActive" class="session-timer" role="status" aria-live="polite">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="text-lg">⏳</span>
        <div>
          <p class="text-sm text-white/70">Session ends in</p>
          <p class="text-lg font-bold text-white tabular-nums">{{ formattedRemaining }}</p>
        </div>
      </div>
      <div class="text-xs text-white/60">60-minute session</div>
    </div>
    <div class="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        class="h-full rounded-full bg-gradient-to-r from-green-400 via-primary to-red-400 transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.session-timer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.65));
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 16px;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
