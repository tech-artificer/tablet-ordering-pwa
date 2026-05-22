<script setup lang="ts">
import { computed, onMounted, watch } from "vue"
import { useSessionStore } from "~/stores/Session"
import { useConnectionStore } from "~/stores/Connection"

const sessionStore = useSessionStore()
const connectionStore = useConnectionStore()

const wsIndicator = computed(() => {
    const state = (connectionStore.reverbState as unknown) as string
    switch (state) {
    case "connected": return { color: "bg-green-400", label: "Live" }
    case "disconnected": return { color: "bg-yellow-400 animate-pulse", label: "Reconnecting" }
    default: return { color: "bg-red-500 animate-pulse", label: "Offline" }
    }
})

// remainingMs stores elapsed ms since session start (session ends via order status, not timer)
const elapsedMs = computed(() => Number(sessionStore.remainingMs || 0))

// Progress bar fills as time passes; reference = 2 h so the bar reaches full at 2 h
const REFERENCE_MS = 2 * 60 * 60 * 1000
const progress = computed(() => Math.min(100, (elapsedMs.value / REFERENCE_MS) * 100))

const formattedElapsed = computed(() => {
    const totalSeconds = Math.floor(elapsedMs.value / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

onMounted(() => {
    sessionStore.ensureTimer()
})

watch(() => sessionStore.isActive, (active) => {
    if (active) { sessionStore.ensureTimer() }
})

</script>

<template>
    <div v-if="sessionStore.isActive" class="session-timer" role="status" aria-live="polite">
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <span class="text-lg">⏳</span>
                <div>
                    <p class="text-sm text-white/70">
                        Time dining
                    </p>
                    <p class="text-lg font-bold text-white tabular-nums">
                        {{ formattedElapsed }}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-1.5" :title="wsIndicator.label">
                <span class="w-2 h-2 rounded-full" :class="wsIndicator.color" />
                <span class="text-xs text-white/50">{{ wsIndicator.label }}</span>
            </div>
        </div>
        <div class="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
                class="h-full rounded-full bg-gradient-to-r from-green-400 via-primary to-red-400 transition-all duration-300"
                :style="{ width: `${progress}%` }"
            />
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
