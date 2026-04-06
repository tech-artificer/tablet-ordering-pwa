import { logger } from '~/utils/logger'

export default defineNuxtPlugin(async (nuxtApp) => {
  const menuStore = useMenuStore()
  const deviceStore = useDeviceStore()

  const loadMenus = async (forceRefresh = false) => {
    if (!deviceStore.isAuthenticated) {
      logger.debug('Skipping menu bootstrap until device authentication is available')
      return
    }

    try {
      await menuStore.loadAllMenus(forceRefresh)
    } catch (error) {
      logger.error('Failed to initialize menu data:', error)
    }
  }

  nuxtApp.hook('app:auth-ready', async ({ authenticated }: any) => {
    if (!authenticated) {
      return
    }

    await loadMenus()
  })

  if (import.meta.client) {
    const refreshInterval = setInterval(async () => {
      if (deviceStore.isAuthenticated && menuStore.isCacheStale && !document.hidden) {
        await loadMenus()
        logger.debug('Menu data auto-refreshed')
      }
    }, 30 * 60 * 1000)

    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval)
    })

    nuxtApp.hook('app:beforeMount', () => {
      // Hook runs before app remounts, good for cleanup
    })
  }
})