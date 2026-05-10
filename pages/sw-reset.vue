<script setup lang="ts">
definePageMeta({ layout: false, auth: false })

const status = ref("Preparing reset...")
const running = ref(false)

const resetServiceWorker = async () => {
    if (running.value) {
        return
    }
    running.value = true
    if (!("serviceWorker" in navigator)) {
        status.value = "Service workers not supported."
        running.value = false
        return
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
            await reg.unregister()
        }

        if ("caches" in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
        }

        status.value = `Unregistered ${registrations.length} service worker(s). Reloading...`
        setTimeout(() => {
            window.location.replace(`/?sw-reset=${Date.now()}`)
        }, 1200)
    } catch (e: any) {
        status.value = `Error: ${e?.message}`
    } finally {
        running.value = false
    }
}

onMounted(async () => {
    await resetServiceWorker()
})
</script>

<template>
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f0f0f;color:#fff;padding:16px;">
        <div style="text-align:center;max-width:560px;">
            <div style="font-size:1.15rem;line-height:1.4;">
                {{ status }}
            </div>
            <button
                type="button"
                :disabled="running"
                style="margin-top:16px;padding:10px 18px;border-radius:8px;border:1px solid #555;background:#1d4ed8;color:#fff;cursor:pointer;"
                @click="resetServiceWorker"
            >
                {{ running ? "Resetting..." : "Retry reset" }}
            </button>
        </div>
    </div>
</template>
