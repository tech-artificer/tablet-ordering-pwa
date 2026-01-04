// plugins/capacitor.client.ts
// Initialize Capacitor plugins and configuration

import { defineNuxtPlugin } from '#app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

export default defineNuxtPlugin(() => {
  // Only run on client-side
  if (typeof window === 'undefined') return

  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform()

  console.log('[Capacitor] Initializing on platform:', platform)

  if (isNative) {
    // Configure status bar for kiosk mode
    StatusBar.setStyle({ style: Style.Dark }).catch(console.warn)
    StatusBar.setBackgroundColor({ color: '#0F0F0F' }).catch(console.warn)
    
    // For kiosk mode, hide the status bar
    StatusBar.hide().catch(console.warn)

    // Splash screen will be hidden by useCapacitor composable
    // after app is fully initialized
    console.log('[Capacitor] Platform configured for kiosk mode')
  }

  // Make Capacitor available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).Capacitor = Capacitor
  }
})
