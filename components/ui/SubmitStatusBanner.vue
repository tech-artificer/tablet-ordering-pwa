<template>
    <!-- Submit Status Banner: persistent feedback for order submission state -->
    <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-300"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
    >
        <div
            v-if="showBanner"
            :class="['submit-status-banner', `submit-status-banner--${submitState.state}`]"
        >
            <!-- Content container -->
            <div class="submit-status-banner__content">
                <!-- Status icon/indicator -->
                <div class="submit-status-banner__indicator">
                    <div v-if="submitState.isTransitioning" class="submit-status-banner__spinner" />
                    <div v-else-if="submitState.isConfirmed" class="submit-status-banner__check">
                        ✓
                    </div>
                    <div v-else-if="submitState.isFailed" class="submit-status-banner__error">
                        !
                    </div>
                    <div v-else-if="submitState.isQueued" class="submit-status-banner__queue">
                        ⟳
                    </div>
                </div>

                <!-- Text content -->
                <div class="submit-status-banner__text">
                    <div class="submit-status-banner__label">
                        {{ submitState.stateLabel }}
                    </div>
                    <div v-if="submitState.isQueued" class="submit-status-banner__detail">
                        {{ pendingCountForDisplay }} order{{ isPlural ? 's' : '' }} queued
                    </div>
                    <div v-else-if="submitState.isConfirmed" class="submit-status-banner__detail">
                        Order #{{ submitState.confirmedOrderNumber || submitState.confirmedOrderId || '—' }}
                    </div>
                    <div v-else-if="submitState.isFailed" class="submit-status-banner__detail">
                        {{ submitState.lastError }}
                    </div>
                </div>

                <!-- Action buttons (only for failed + retrying states) -->
                <div class="submit-status-banner__actions">
                    <button
                        v-if="submitState.isFailed"
                        class="submit-status-banner__btn submit-status-banner__btn--retry"
                        @click="onRetry"
                    >
                        Retry
                    </button>
                    <button
                        v-if="showDismiss"
                        class="submit-status-banner__btn submit-status-banner__btn--dismiss"
                        @click="onDismiss"
                    >
                        Dismiss
                    </button>
                </div>
            </div>

            <!-- Last sync time indicator (for queued state) -->
            <div v-if="submitState.isQueued && lastSyncTimeAgo" class="submit-status-banner__meta">
                Last sync attempt {{ lastSyncTimeAgo }} ago
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useSubmitState } from "~/composables/useSubmitState"

interface Props {
  showDismiss?: boolean
}

interface Emits {
  (e: "retry"): void
  (e: "dismiss"): void
}

withDefaults(defineProps<Props>(), {
    showDismiss: true,
})

const emit = defineEmits<Emits>()

const submitState = useSubmitState()

const showBanner = computed(() => {
    return submitState.state.value !== "idle"
})

const lastSyncTimeAgo = computed<string | null>(() => {
    if (!submitState.lastSyncAttempt.value) { return null }
    const elapsedMs = Date.now() - submitState.lastSyncAttempt.value
    const seconds = Math.floor(elapsedMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) { return `${hours}h` }
    if (minutes > 0) { return `${minutes}m` }
    return `${Math.max(0, seconds)}s`
})

const pendingCountForDisplay = computed(() => submitState.pendingCount.value)
const isPlural = computed(() => pendingCountForDisplay.value !== 1)

const onRetry = () => emit("retry")
const onDismiss = () => emit("dismiss")
</script>

<style scoped>
.submit-status-banner {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-radius: 0.75rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(0.5rem);
    font-size: 0.875rem;
    line-height: 1.5;
}

.submit-status-banner--submitting {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: #60a5fa;
}

.submit-status-banner--queued {
    background: rgba(168, 85, 247, 0.15);
    border-color: rgba(168, 85, 247, 0.3);
    color: #c084fc;
}

.submit-status-banner--retrying {
    background: rgba(217, 119, 6, 0.15);
    border-color: rgba(217, 119, 6, 0.3);
    color: #fbbf24;
}

.submit-status-banner--confirmed {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.3);
    color: #4ade80;
}

.submit-status-banner--failed {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
}

.submit-status-banner__content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.submit-status-banner__indicator {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
}

.submit-status-banner__spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.submit-status-banner__check {
    font-size: 1.25rem;
    font-weight: bold;
}

.submit-status-banner__error {
    font-size: 1.25rem;
    font-weight: bold;
}

.submit-status-banner__queue {
    font-size: 1rem;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.submit-status-banner__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.submit-status-banner__label {
    font-weight: 600;
}

.submit-status-banner__detail {
    font-size: 0.8125rem;
    opacity: 0.85;
}

.submit-status-banner__actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.submit-status-banner__btn {
    padding: 0.5rem 0.875rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.submit-status-banner__btn--retry {
    background: currentColor;
    color: #1f2937;
}

.submit-status-banner__btn--retry:hover {
    opacity: 0.8;
}

.submit-status-banner__btn--dismiss {
    background: rgba(255, 255, 255, 0.1);
    color: currentColor;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.submit-status-banner__btn--dismiss:hover {
    background: rgba(255, 255, 255, 0.15);
}

.submit-status-banner__meta {
    font-size: 0.75rem;
    opacity: 0.7;
    text-align: right;
}
</style>
