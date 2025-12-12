import { logger } from '~/utils/logger'

export default defineNuxtPlugin(async (nuxtApp) => {
  const menuStore = useMenuStore();

  // Load menu data on app initialization
  try {
    await menuStore.loadAllMenus();
  } catch (error) {
    logger.error('Failed to initialize menu data:', error);
    // Optionally show a toast/notification to user
  }

  // Optional: Set up auto-refresh interval
  if (process.client) {
    // Refresh every 30 minutes if user is active
    const refreshInterval = setInterval(async () => {
      if (menuStore.isCacheStale && !document.hidden) {
        try {
          await menuStore.loadAllMenus();
          logger.debug('Menu data auto-refreshed');
        } catch (error) {
          logger.error('Auto-refresh failed:', error);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Cleanup on page leave/beforeunload
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval);
    });
    
    // Alternative: Use app:beforeMount hook
    nuxtApp.hook('app:beforeMount', () => {
      // Hook runs before app remounts, good for cleanup
    });
  }
});