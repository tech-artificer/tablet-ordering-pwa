import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wooserve.kiosk',
  appName: 'Wooserve Kiosk',
  webDir: '.output/public',
  server: {
    androidScheme: 'https',
    hostname: 'wooserve.app',
    // Add API domains here if needed for cross-origin requests
    allowNavigation: []
  },
  android: {
    // Only allow mixed HTTP/HTTPS content in development builds
    allowMixedContent: process.env.NODE_ENV !== 'production',
    // Enable web debugging only in development
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
    // Keep screen on for kiosk mode
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Tablet) Wooserve/1.0'
  },
  // iOS configuration removed - only Android is supported for this kiosk app
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#F6B56D',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F0F'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  }
};

export default config;
