// composables/useCapacitor.ts
// Capacitor platform detection and utilities

import { ref, onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { logger } from '~/utils/logger'

const isNative = ref(false)
const platform = ref<string>('web')
const appInfo = ref<{ version: string; build: string } | null>(null)

export function useCapacitor() {
  /**
   * Check if running in native Capacitor context
   */
  const checkPlatform = () => {
    isNative.value = Capacitor.isNativePlatform()
    platform.value = Capacitor.getPlatform()
    
    logger.debug('[Capacitor] Platform:', platform.value, 'Native:', isNative.value)
  }

  /**
   * Get app information (version, build number)
   */
  const getAppInfo = async () => {
    if (!isNative.value) return null
    
    try {
      const info = await App.getInfo()
      appInfo.value = {
        version: info.version,
        build: info.build
      }
      logger.debug('[Capacitor] App info:', appInfo.value)
      return appInfo.value
    } catch (e) {
      logger.warn('[Capacitor] Failed to get app info:', e)
      return null
    }
  }

  /**
   * Configure status bar for kiosk mode
   */
  const configureStatusBar = async () => {
    if (!isNative.value) return
    
    try {
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#0F0F0F' })
      
      // Hide status bar for true fullscreen kiosk experience
      await StatusBar.hide()
      
      logger.debug('[Capacitor] Status bar configured')
    } catch (e) {
      logger.warn('[Capacitor] Failed to configure status bar:', e)
    }
  }

  /**
   * Hide splash screen
   */
  const hideSplashScreen = async () => {
    if (!isNative.value) return
    
    try {
      await SplashScreen.hide()
      logger.debug('[Capacitor] Splash screen hidden')
    } catch (e) {
      logger.warn('[Capacitor] Failed to hide splash screen:', e)
    }
  }

  /**
   * Setup app lifecycle listeners
   */
  const setupAppListeners = async () => {
    if (!isNative.value) return
    
    try {
      // Listen for app state changes
      await App.addListener('appStateChange', ({ isActive }) => {
        logger.debug('[Capacitor] App state changed:', isActive ? 'active' : 'background')
        
        // Refresh data when app becomes active (useful for kiosk)
        if (isActive) {
          // Could trigger menu refresh or session check here
          logger.debug('[Capacitor] App resumed, consider refreshing data')
        }
      })

      // Listen for back button (Android)
      await App.addListener('backButton', ({ canGoBack }) => {
        logger.debug('[Capacitor] Back button pressed, canGoBack:', canGoBack)
        
        // In kiosk mode, we might want to prevent going back
        // or implement custom navigation
        if (!canGoBack) {
          logger.debug('[Capacitor] At root, preventing exit')
          // Could show confirmation dialog here
        }
      })

      logger.debug('[Capacitor] App listeners configured')
    } catch (e) {
      logger.warn('[Capacitor] Failed to setup app listeners:', e)
    }
  }

  /**
   * Initialize Capacitor features
   */
  const initialize = async () => {
    checkPlatform()
    
    if (isNative.value) {
      await getAppInfo()
      await configureStatusBar()
      await setupAppListeners()
      
      // Hide splash screen after a short delay to ensure app is ready
      const SPLASH_SCREEN_DELAY_MS = 500
      setTimeout(async () => {
        await hideSplashScreen()
      }, SPLASH_SCREEN_DELAY_MS)
    }
  }

  onMounted(() => {
    initialize()
  })

  return {
    isNative,
    platform,
    appInfo,
    
    // Methods
    checkPlatform,
    getAppInfo,
    configureStatusBar,
    hideSplashScreen,
    setupAppListeners,
    initialize,
    
    // Utility checks
    isAndroid: () => platform.value === 'android',
    isIOS: () => platform.value === 'ios',
    isWeb: () => platform.value === 'web'
  }
}
