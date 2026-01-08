import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wooserve.kiosk',
  appName: 'Wooserve Kiosk',
  webDir: '.output/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'wooserve.app',
    allowNavigation: []
  },
  android: {
    allowMixedContent: true,
    // Tablet optimizations
    webContentsDebuggingEnabled: true,
    // Keep screen on for kiosk mode
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Tablet) Wooserve/1.0'
  },
  ios: {
    contentInset: 'automatic',
    // Tablet optimizations
    scrollEnabled: true,
    overrideUserAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) Wooserve/1.0'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
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
