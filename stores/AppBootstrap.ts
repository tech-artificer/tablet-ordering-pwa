import { defineStore } from "pinia"
import { reactive, computed, toRefs } from "vue"
import { useDeviceStore } from "./Device"
import { useSessionStore } from "./Session"
import { useMenuStore } from "./Menu"
import { logger } from "../utils/logger"

export const useAppBootstrapStore = defineStore("appBootstrap", () => {
    const state = reactive({
        isPreloading: false,
        isReady: false,
        preloadError: null as string | null,
        preloadStage: "" as "" | "auth" | "session" | "menus" | "packageDetails",
    })

    const isLoading = computed(() => state.isPreloading)
    const hasError = computed(() => state.preloadError !== null)
    const currentStage = computed(() => state.preloadStage)

    /**
     * Preload all data needed for the ordering flow.
     * This is the ONE place where all API calls happen before entering the order flow.
     * Called from the welcome screen before allowing "Begin the Feast".
     */
    async function preloadForOrdering (): Promise<boolean> {
        if (state.isPreloading) {
            logger.debug("[AppBootstrap] Preload already in progress, skipping duplicate call")
            return state.isReady
        }

        if (state.isReady) {
            logger.debug("[AppBootstrap] Already ready, skipping preload")
            return true
        }

        state.isPreloading = true
        state.preloadError = null
        state.preloadStage = "auth"

        const deviceStore = useDeviceStore()
        const sessionStore = useSessionStore()
        const menuStore = useMenuStore()

        try {
            // Step 1: Ensure device is authenticated
            logger.info("[AppBootstrap] Step 1: Authenticating device...")
            const hasToken = Boolean(deviceStore.token)
            const authSuccess = hasToken
                ? await deviceStore.refresh()
                : await deviceStore.authenticate()

            if (!authSuccess || !deviceStore.isAuthenticated) {
                throw new Error("Device authentication failed. Please register this tablet in Settings.")
            }
            logger.info("[AppBootstrap] Device authenticated")

            // Step 2: Fetch latest session (lightweight, just syncs sessionId)
            state.preloadStage = "session"
            logger.info("[AppBootstrap] Step 2: Syncing session...")
            try {
                await sessionStore.fetchLatestSession()
                logger.info("[AppBootstrap] Session synced")
            } catch (e) {
                // Non-fatal: session may not exist yet, that's OK
                logger.debug("[AppBootstrap] Session sync returned no session (non-fatal):", e)
            }

            // Step 3: Load all menu data
            state.preloadStage = "menus"
            logger.info("[AppBootstrap] Step 3: Loading all menus...")
            const menuResult = await menuStore.loadAllMenus(true)
            if (!menuResult.success) {
                logger.warn("[AppBootstrap] Some menu fetches failed:", menuResult.errors)
                // Non-fatal: we can still proceed with partial data
            }
            logger.info("[AppBootstrap] Menus loaded:", {
                packages: menuStore.packages.length,
                sides: menuStore.sides.length,
                desserts: menuStore.desserts.length,
                beverages: menuStore.beverages.length,
            })

            // Step 4: Preload package details for all packages
            // This eliminates the skeleton flash when entering menu
            state.preloadStage = "packageDetails"
            if (menuStore.packages.length > 0) {
                logger.info("[AppBootstrap] Step 4: Preloading package details...")
                const packageDetailPromises = menuStore.packages.slice(0, 4).map(pkg =>
                    menuStore.fetchPackageDetails(pkg.id).catch(e => {
                        logger.debug(`[AppBootstrap] Package ${pkg.id} details preload failed (non-fatal):`, e)
                        return null
                    })
                )
                await Promise.allSettled(packageDetailPromises)
                logger.info("[AppBootstrap] Package details preloaded")
            }

            state.isReady = true
            state.isPreloading = false
            state.preloadStage = ""
            logger.info("[AppBootstrap] Preload complete - ordering flow ready")
            return true

        } catch (error: any) {
            const message = error?.message || "Failed to prepare ordering system"
            state.preloadError = message
            state.isPreloading = false
            state.isReady = false
            state.preloadStage = ""
            logger.error("[AppBootstrap] Preload failed:", error)
            throw new Error(message)
        }
    }

    /**
     * Reset the bootstrap state (useful for testing or forced re-auth)
     */
    function reset () {
        state.isPreloading = false
        state.isReady = false
        state.preloadError = null
        state.preloadStage = ""
        logger.debug("[AppBootstrap] State reset")
    }

    /**
     * Get human-readable stage description for UI
     */
    const stageDescription = computed(() => {
        switch (state.preloadStage) {
            case "auth": return "Authenticating device..."
            case "session": return "Syncing session..."
            case "menus": return "Loading menus..."
            case "packageDetails": return "Preparing packages..."
            default: return "Preparing..."
        }
    })

    return {
        ...toRefs(state),
        isLoading,
        hasError,
        currentStage,
        stageDescription,
        preloadForOrdering,
        reset,
    }
})
