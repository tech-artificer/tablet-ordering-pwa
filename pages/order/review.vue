<script setup lang="ts">
import confetti from "canvas-confetti"
import { ref } from "vue"
import { useSessionStore } from "../../stores/Session"
import OrderingStep3ReviewSubmit from "~/components/order/OrderingStep3ReviewSubmit.vue"
import { logger } from "~/utils/logger"

definePageMeta({ layout: "kiosk", middleware: ["order-guard"] })

const router = useRouter()
const sessionStore = useSessionStore()
const sessionStartError = ref<string | null>(null)

const triggerCelebration = () => {
    const colors = ["#F6B56D", "#10B981", "#FFFFFF"]
    confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors,
        duration: 2000
    })
}

const handleGoBack = () => {
    logger.info("[Order Review] Going back to menu")
    router.push("/menu")
}

const handleOrderSubmitted = async () => {
    const timestamp = new Date().toISOString()
    logger.info("[Order Review] Order confirmation received", { timestamp })
    sessionStartError.value = null

    triggerCelebration()

    if (!sessionStore.isActive) {
        try {
            logger.info("[Order Review] Marking session active", { timestamp })
            const started = await sessionStore.start({ preserveSubmittedOrder: true })
            if (!started) {
                sessionStartError.value = "Your order was sent to the kitchen, but this tablet could not start the dining session. Please ask staff to reopen the session screen."
                logger.error("[Order Review] Session start returned false after order submission", { timestamp })
                return
            }
            logger.info("[Session Flow] Order submitted, session active, ready for refill or completion")
        } catch (e) {
            logger.error("[Order Review] Failed to start session store", {
                timestamp,
                error: (e as any)?.message,
            })
            sessionStartError.value = "Your order was sent to the kitchen, but this tablet could not start the dining session. Please ask staff to reopen the session screen."
            return
        }
    }

    logger.info("[Order Review] Navigating to in-session screen", { timestamp })
    router.replace("/order/in-session")
}
</script>

<template>
    <NuxtErrorBoundary>
        <div class="min-h-screen bg-app-grid text-white px-4 py-5 md:px-6 md:py-6 overflow-y-auto">
            <div class="max-w-6xl mx-auto">
                <div class="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-sm px-4 py-3 md:px-5 md:py-4 mb-5 md:mb-6">
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold">
                                4
                            </div>
                            <div>
                                <p class="text-primary/90 text-[11px] uppercase tracking-[0.16em] font-bold leading-none mb-1">
                                    Step 04 • Confirm Order
                                </p>
                                <h1 class="text-xl md:text-2xl font-extrabold font-raleway text-white tracking-tight">
                                    Review &amp; Send to Kitchen
                                </h1>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition"
                            aria-label="Go back"
                            @click="handleGoBack()"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    v-if="sessionStartError"
                    role="alert"
                    class="mb-5 rounded-xl border border-error/40 bg-error/15 px-4 py-3 text-sm font-semibold text-error"
                >
                    {{ sessionStartError }}
                </div>
                <OrderingStep3ReviewSubmit @order-submitted="handleOrderSubmitted" />
            </div>
        </div>
        <template #error="{ error, clearError }">
            <div class="flex h-screen items-center justify-center bg-gray-900 text-white flex-col gap-6 p-8">
                <p class="text-xl font-bold text-red-400">
                    Something went wrong
                </p>
                <p class="text-sm text-gray-400 text-center max-w-sm">
                    {{ error?.message || 'An unexpected error occurred.' }}
                </p>
                <button
                    class="px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:opacity-90 transition"
                    @click="clearError()"
                >
                    Try Again
                </button>
            </div>
        </template>
    </NuxtErrorBoundary>
</template>
