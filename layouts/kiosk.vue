<script setup lang="ts">
import { useMenuStore } from "~/stores/Menu"
import { logger } from "~/utils/logger"
const menuStore = useMenuStore()
const route = useRoute()

const retryLoad = async () => {
    menuStore.clearAllErrors()
    try {
        await menuStore.loadAllMenus(true)
    } catch (error) {
        logger.error("Retry failed:", error)
    }
}

const refreshMenu = async () => {
    try {
        await menuStore.refreshMenus()
    } catch (error) {
        logger.error("Refresh failed:", error)
    }
}

// Listen for online/offline events
if (import.meta.client) {
    onMounted(() => {
        window.addEventListener("online", async () => {
            logger.info("Back online, refreshing menu...")
            await menuStore.refreshMenus()
        })
    })
}
</script>

<template>
    <div class="min-h-screen min-w-screen flex items-center justify-center bg-app-grid overflow-hidden">
        <Transition name="slide-left" mode="out-in" appear>
            <div :key="route.path" class="h-screen w-screen z-10 safe-area-top safe-area-bottom">
                <slot />
            </div>
        </Transition>

    </div>
</template>

<style>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
