<script setup lang="ts">
import { onMounted, ref } from "vue"
import { deleteAllCaches, unregisterAllServiceWorkers } from "../utils/pwaReset"
import { logger } from "../utils/logger"

definePageMeta({ layout: false })

const status = ref("Preparing emergency reset...")
const isResetting = ref(false)
const resetError = ref("")

const runEmergencyReset = async () => {
    if (isResetting.value) {
        return
    }

    isResetting.value = true
    resetError.value = ""
    status.value = "Resetting service workers and caches…"

    try {
        const unregisteredCount = "serviceWorker" in navigator
            ? await unregisterAllServiceWorkers()
            : 0
        const deletedCaches = "caches" in window
            ? await deleteAllCaches()
            : []

        status.value = `Unregistered ${unregisteredCount} service worker(s) and cleared ${deletedCaches.length} cache(s). Reloading...`
        window.setTimeout(() => {
            window.location.replace(`/?sw-reset=${Date.now()}`)
        }, 1200)
    } catch (error) {
        resetError.value = "Emergency reset failed. Close the app and reopen it, or try again."
        status.value = resetError.value
        logger.warn("[PWA] Emergency /sw-reset failed", error)
    } finally {
        isResetting.value = false
    }
}

onMounted(() => {
    runEmergencyReset().catch(() => {})
})
</script>

<template>
    <div class="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div class="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-white/5 p-6 shadow-2xl">
            <h1 class="mb-3 text-2xl font-semibold">
                Emergency full-origin reset
            </h1>
            <p class="text-sm text-white/70">
                This route clears every same-origin cache and unregisters every same-origin service worker.
                Use it only when this tablet PWA owns the full origin or when directed during emergency recovery.
            </p>

            <div class="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                {{ status }}
            </div>

            <button
                v-if="resetError"
                type="button"
                class="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/20"
                @click="runEmergencyReset"
            >
                {{ isResetting ? "Resetting..." : "Retry emergency reset" }}
            </button>
        </div>
    </div>
</template>
