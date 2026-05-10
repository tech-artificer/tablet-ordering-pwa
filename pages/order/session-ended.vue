<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import { logger } from "~/utils/logger"
import { useSessionEndFlow } from "~/composables/useSessionEndFlow"
import SessionEndCard from "~/components/ui/SessionEndCard.vue"

definePageMeta({
    layout: "kiosk"
})

const route = useRoute()
const { finalizeAndReturnHome } = useSessionEndFlow()

const reason = computed(() => (route.query.reason as string) || "unknown")
const orderNumber = computed(() => (route.query.order as string) || null)
const isFinalizing = ref(false)
const countdown = ref(5)

const copy = computed(() => {
    switch (reason.value) {
    case "completed":
        return {
            icon: "✅",
            title: "Thank you!",
            message: "Your order is complete. We hope you enjoyed your meal!",
        }
    case "voided":
        return {
            icon: "ℹ️",
            title: "Order Ended",
            message: "Your order was ended by staff. Please see our team if you need help.",
        }
    case "cancelled":
        return {
            icon: "🔄",
            title: "Order Cancelled",
            message: "Your order was cancelled. You can start a new order anytime.",
        }
    default:
        return {
            icon: "👋",
            title: "Session Ended",
            message: "Your session has ended. Thank you for visiting!",
        }
    }
})

let countdownTimer: ReturnType<typeof setInterval> | null = null
let failsafeTimer: ReturnType<typeof setTimeout> | null = null

function returnHome () {
    logger.info("[SessionEnded] Manual return home", { reason: reason.value })
    clearTimers()
    finalizeAndReturnHome()
}

function clearTimers () {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
    if (failsafeTimer) { clearTimeout(failsafeTimer); failsafeTimer = null }
}

onMounted(() => {
    logger.info("[SessionEnded] Page mounted", { reason: reason.value, orderNumber: orderNumber.value })

    countdownTimer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0) {
            clearTimers()
            logger.info("[SessionEnded] Countdown complete — returning home")
            finalizeAndReturnHome()
        }
    }, 1000)

    // Fail-safe: if countdown or finalize hangs, force home after 10s
    failsafeTimer = setTimeout(() => {
        logger.warn("[SessionEnded] Fail-safe timeout reached — forcing home")
        clearTimers()
        finalizeAndReturnHome()
    }, 10_000)
})

onUnmounted(() => {
    clearTimers()
})
</script>

<template>
    <SessionEndCard
        :icon="copy.icon"
        :title="copy.title"
        :message="copy.message"
        :order-number="orderNumber"
        :countdown="countdown"
        :is-finalizing="isFinalizing"
        @return-home="returnHome"
    />
</template>
