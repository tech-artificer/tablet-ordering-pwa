import { useMenuStore } from "~/stores/Menu"
import { logger } from "~/utils/logger"

export default defineNuxtRouteMiddleware(async (to, _from) => {
    const menuStore = useMenuStore()

    // Only check on specific routes that need menu data
    const requiresMenu = ["/menu", "/order", "/customize"]

    if (requiresMenu.some(route => to.path.startsWith(route))) {
        if (menuStore.packages.length === 0 || menuStore.isCacheStale) {
            try {
                await menuStore.loadAllMenus()
            } catch (error) {
                logger.error("Failed to load menu:", error)
                // Optionally redirect to error page
                // return navigateTo('/error');
            }
        }
    }
})
