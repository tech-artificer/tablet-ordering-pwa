import { logger } from "~/utils/logger"

export default defineNuxtPlugin(async (nuxtApp) => {
    const menuStore = useMenuStore()
    const deviceStore = useDeviceStore()
    let refreshInterval: ReturnType<typeof setInterval> | null = null
    let inflightRefresh = false

    const loadMenus = async (forceRefresh = false) => {
        if (!deviceStore.isAuthenticated) {
            logger.debug("Skipping menu bootstrap until device authentication is available")
            return
        }

        try {
            await menuStore.loadAllMenus(forceRefresh)
        } catch (error) {
            logger.error("Failed to initialize menu data:", error)
        }
    }

    nuxtApp.hook("app:auth-ready", async ({ authenticated }: any) => {
        if (!authenticated) {
            return
        }

        await loadMenus()
    })

    if (import.meta.client) {
        const refreshTick = async () => {
            if (inflightRefresh) { return }
            if (!deviceStore.isAuthenticated || !menuStore.isCacheStale || document.hidden) { return }

            inflightRefresh = true
            try {
                await loadMenus()
                logger.debug("Menu data auto-refreshed")
            } finally {
                inflightRefresh = false
            }
        }

        refreshInterval = setInterval(refreshTick, 30 * 60 * 1000)

        const onBeforeUnload = () => {
            if (refreshInterval) {
                clearInterval(refreshInterval)
                refreshInterval = null
            }
        }

        window.addEventListener("beforeunload", onBeforeUnload)

        nuxtApp.hook("app:beforeUnmount", () => {
            onBeforeUnload()
            window.removeEventListener("beforeunload", onBeforeUnload)
        })
    }
})
