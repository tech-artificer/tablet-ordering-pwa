<script setup lang="ts">
/**
 * Recovery Screen
 *
 * Displays when the app encounters critical errors (chunk load failures,
 * stale cache, etc.) instead of showing a black screen.
 */

import { computed, onMounted, ref } from "vue"
import { logger } from "~/utils/logger"
import { deleteAllCaches, unregisterAllServiceWorkers } from "~/utils/pwaReset"

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()

const errorType = computed(() => route.query.type as string || "unknown")
const errorSource = computed(() => route.query.source as string || "unknown")
const errorCount = computed(() => parseInt(route.query.count as string || "0", 10))

const isRecovering = ref(false)
const recoveryStatus = ref("")
const recoveryError = ref("")
const autoRetryCount = ref(0)
const MAX_AUTO_RETRIES = 2

interface BuildMismatch {
    stored: string
    current: string
    timestamp: number
}

const buildMismatch = ref<BuildMismatch | null>(null)

onMounted(() => {
    // Check for build mismatch
    try {
        const mismatch = sessionStorage.getItem("pwa-build-mismatch")
        if (mismatch) {
            buildMismatch.value = JSON.parse(mismatch)
        }
    } catch {
        // Ignore parse errors
    }

    // Auto-retry once if this is first recovery attempt
    if (errorCount.value <= 1 && autoRetryCount.value < MAX_AUTO_RETRIES) {
        autoRetryCount.value++
        setTimeout(() => {
            handleSoftReload()
        }, 2000)
    }
})

const errorTitle = computed(() => {
    switch (errorType.value) {
    case "chunk-load":
    case "nuxt-chunk":
        return "App Update Required"
    case "import-failure":
        return "Loading Failed"
    case "service-worker":
        return "Cache Issue Detected"
    default:
        return "Something Went Wrong"
    }
})

const errorDescription = computed(() => {
    switch (errorType.value) {
    case "chunk-load":
    case "nuxt-chunk":
        return "The app was updated and needs to reload. Your order progress is safely saved."
    case "import-failure":
        return "Failed to load app components. This usually happens after an update."
    case "service-worker":
        return "The offline cache needs to be refreshed."
    default:
        return "An unexpected error occurred. Please try reloading the app."
    }
})

async function handleSoftReload (): Promise<void> {
    if (isRecovering.value) { return }
    isRecovering.value = true
    recoveryStatus.value = "Reloading app..."
    recoveryError.value = ""

    logger.info("[Recovery] Performing soft reload")

    // Clear error tracking
    try {
        localStorage.removeItem("pwa-error-count")
        localStorage.removeItem("pwa-last-error-ts")
        sessionStorage.removeItem("pwa-critical-error")
        sessionStorage.removeItem("pwa-build-mismatch")
    } catch {
        // Ignore storage errors
    }

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500))

    // Reload to home page
    window.location.href = "/?recovered=" + Date.now()
}

async function handleHardReset (): Promise<void> {
    if (isRecovering.value) { return }
    isRecovering.value = true
    recoveryStatus.value = "Clearing cache and resetting..."
    recoveryError.value = ""

    logger.info("[Recovery] Performing hard reset")

    try {
        // Unregister service workers
        if ("serviceWorker" in navigator) {
            const unregistered = await unregisterAllServiceWorkers()
            recoveryStatus.value = `Unregistered ${unregistered} service worker(s)...`
            await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Clear all caches
        if ("caches" in window) {
            const deleted = await deleteAllCaches()
            recoveryStatus.value = `Cleared ${deleted.length} cache(s)...`
            await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Clear localStorage except critical device data
        const deviceToken = localStorage.getItem("device-token")
        const deviceId = localStorage.getItem("device-id")
        const tableAssignment = localStorage.getItem("table-assignment")

        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && !key.startsWith("device-") && !key.startsWith("pwa-build")) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Clear sessionStorage except critical data
        sessionStorage.clear()

        // Restore critical device data
        if (deviceToken) { localStorage.setItem("device-token", deviceToken) }
        if (deviceId) { localStorage.setItem("device-id", deviceId) }
        if (tableAssignment) { localStorage.setItem("table-assignment", tableAssignment) }

        recoveryStatus.value = "Reset complete. Reloading..."
        await new Promise(resolve => setTimeout(resolve, 500))

        // Navigate to sw-reset for final cleanup
        window.location.href = "/sw-reset?auto=1&reason=recovery-reset"
    } catch (error) {
        logger.error("[Recovery] Hard reset failed:", error)
        recoveryError.value = "Reset failed. Please close and reopen the app."
        isRecovering.value = false
    }
}

function handleEmergencyReset (): void {
    logger.info("[Recovery] Emergency reset triggered")

    // Nuclear option: clear everything and reload
    try {
        localStorage.clear()
        sessionStorage.clear()
    } catch {
        // Ignore
    }

    window.location.href = "/sw-reset?emergency=1"
}

function getBuildInfo (): string {
    const config = useRuntimeConfig()
    return `${config.public.buildSha?.slice(0, 7) || "unknown"}`
}
</script>

<template>
    <div class="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 py-10">
        <div class="w-full max-w-md">
            <!-- Icon -->
            <div class="w-24 h-24 rounded-full bg-[#F6B56D]/10 flex items-center justify-center mx-auto mb-8">
                <svg
                    class="w-12 h-12 text-[#F6B56D]"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-white text-2xl font-bold text-center mb-3">
                {{ errorTitle }}
            </h1>

            <!-- Description -->
            <p class="text-white/60 text-base text-center leading-relaxed mb-8">
                {{ errorDescription }}
            </p>

            <!-- Build mismatch warning -->
            <div
                v-if="buildMismatch"
                class="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
                <p class="text-amber-400 text-sm text-center">
                    App was updated (build {{ buildMismatch.stored.slice(0, 7) }} → {{ buildMismatch.current.slice(0, 7) }})
                </p>
            </div>

            <!-- Recovery Status -->
            <div
                v-if="recoveryStatus"
                class="mb-6 p-4 rounded-xl bg-white/5 border border-white/10"
            >
                <div class="flex items-center justify-center gap-3">
                    <svg
                        v-if="isRecovering"
                        class="w-5 h-5 text-[#F6B56D] animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        />
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span class="text-white/80 text-sm">{{ recoveryStatus }}</span>
                </div>
            </div>

            <!-- Error Message -->
            <div
                v-if="recoveryError"
                class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
            >
                <p class="text-red-400 text-sm text-center">
                    {{ recoveryError }}
                </p>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3">
                <button
                    type="button"
                    class="w-full min-h-[56px] px-6 rounded-xl bg-[#F6B56D] text-[#0F0F0F] font-bold text-base tracking-wide active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isRecovering"
                    @click="handleSoftReload"
                >
                    {{ isRecovering ? "Reloading..." : "Reload App" }}
                </button>

                <button
                    type="button"
                    class="w-full min-h-[52px] px-6 rounded-xl bg-white/10 text-white font-semibold text-base active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isRecovering"
                    @click="handleHardReset"
                >
                    {{ isRecovering ? "Resetting..." : "Reset & Clear Cache" }}
                </button>

                <button
                    v-if="errorCount >= 2"
                    type="button"
                    class="w-full min-h-[48px] px-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-medium text-sm active:scale-95 transition-transform"
                    @click="handleEmergencyReset"
                >
                    Emergency Full Reset
                </button>
            </div>

            <!-- Debug Info -->
            <div class="mt-8 text-center">
                <p class="text-white/30 text-xs font-mono">
                    Error: {{ errorType }} | Build: {{ getBuildInfo() }}
                </p>
                <p class="text-white/20 text-xs mt-1">
                    Tap "Reset & Clear Cache" if reloading doesn't work
                </p>
            </div>
        </div>
    </div>
</template>
