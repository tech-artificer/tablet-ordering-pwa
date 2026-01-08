# Capacitor Android App Integration

This document describes how to build and deploy the Wooserve Kiosk app as a native Android application using Capacitor.

> **Note:** This app is configured for Android tablets only. iOS support is not included.

## Overview

The app is already configured for Capacitor and includes:
- ✅ Capacitor core dependencies
- ✅ Android platform support
- ✅ Native plugins (Haptics, Network, App lifecycle, StatusBar, SplashScreen)
- ✅ Kiosk-optimized configuration for Android tablets
- ✅ Build scripts in package.json
- ✅ GitHub workflow for automated build verification

## Prerequisites

### For Android Development
- **Node.js** 18+ and npm
- **Android Studio** (latest stable version recommended)
- **JDK** 17 or higher
- **Android SDK** with API level 33+ (Android 13)
- **Physical tablet** or Android emulator for testing

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all Capacitor dependencies including:
- `@capacitor/core` - Core Capacitor functionality
- `@capacitor/cli` - Capacitor command-line tools
- `@capacitor/android` - Android platform
- `@capacitor/haptics` - Native haptic feedback
- `@capacitor/network` - Network status monitoring
- `@capacitor/app` - App lifecycle management
- `@capacitor/status-bar` - Status bar control
- `@capacitor/splash-screen` - Splash screen management

### 2. Generate Static Files

Before adding the Android platform, generate static files from the Nuxt app:

```bash
npm run generate
```

**Important:** Use `generate` not `build` for Capacitor. This creates static HTML/JS/CSS files in `.output/public/` that Capacitor can wrap. The `build` command creates a Node.js server which won't work in a native app context.

### 3. Add Android Platform

```bash
npm run cap:add:android
```

This creates an `android/` directory with the native Android project files.

## Configuration

The Capacitor configuration is in `capacitor.config.ts`:

```typescript
{
  appId: 'com.wooserve.kiosk',
  appName: 'Wooserve Kiosk',
  webDir: '.output/public',
  android: {
    allowMixedContent: process.env.NODE_ENV !== 'production',
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
    // ... other settings
  }
}
```

### Key Configuration Options

- **appId**: Unique identifier for your app (change for your deployment: e.g., `com.yourcompany.wooserve`)
- **appName**: Display name shown on device
- **webDir**: Where Capacitor finds the built web assets (`.output/public`)
- **android.allowMixedContent**: Only enabled in development for HTTP API access
- **android.webContentsDebuggingEnabled**: Chrome DevTools debugging (development only)

### Security Notes

The configuration automatically enables stricter security in production:
- Mixed HTTP/HTTPS content is blocked in production
- Web debugging is disabled in production
- Use HTTPS for all API endpoints in production

## Development Workflow

### Build and Sync

After making changes to your web app, sync them to Android:

```bash
# Generate and sync
npm run cap:sync:android

# Or use the combined run command
npm run cap:run:android
```

### Open in Android Studio

```bash
npm run cap:open:android
```

This opens the Android project in Android Studio where you can:
- Run the app on emulators or physical devices
- Debug with Android Studio tools
- Build release APKs/AABs

### Development on Physical Device

1. Enable Developer Options on your Android tablet
2. Enable USB Debugging
3. Connect tablet to computer via USB
4. Run `npm run cap:run:android`
5. Select your device when prompted

## Building for Production

### Android APK (Testing/Sideload)

1. **Generate static files:**
   ```bash
   npm run generate
   ```

2. **Sync to Android:**
   ```bash
   npm run cap:sync:android
   ```

3. **Open Android Studio:**
   ```bash
   npm run cap:open:android
   ```

4. **In Android Studio:**
   - Select **Build → Build Bundle(s) / APK(s) → Build APK**
   - Or **Build → Generate Signed Bundle / APK** for release
   - Configure signing keys in `android/app/build.gradle`

5. **Or use Gradle CLI:**
   ```bash
   npm run cap:build:android
   ```
   
   Output: `android/app/build/outputs/apk/release/app-release.apk`

### Android AAB (Google Play Store)

For Google Play Store distribution:

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Note:** You must configure signing keys before creating a release build. See [Android signing documentation](https://developer.android.com/studio/publish/app-signing).

## Kiosk Mode Features

The app is optimized for tablet kiosk deployment:

### Status Bar
- Hidden by default for fullscreen experience
- Dark theme with brand colors (#0F0F0F)
- Configured in `plugins/capacitor.client.ts`

### Splash Screen
- 2-second display on launch
- Brand colors (#0F0F0F background, #F6B56D accent)
- Fullscreen and immersive
- Configured in `capacitor.config.ts`

### Haptic Feedback
- Enhanced with native Capacitor Haptics API
- Falls back to Web Vibration API on web
- Provides tactile feedback for button presses and actions
- See `utils/haptics.ts`

### Network Monitoring
- Enhanced with native Capacitor Network plugin
- More reliable than web-only detection
- Detects connection type (WiFi, cellular, etc.)
- See `composables/useNetworkStatus.ts`

### App Lifecycle
- Detects when app goes to background/foreground
- Useful for refreshing data when kiosk returns from sleep
- Managed by `composables/useCapacitor.ts`

## Android-Specific Configuration

### Permissions

Default permissions are set in `android/app/src/main/AndroidManifest.xml`:
- `INTERNET` - API communication
- `ACCESS_NETWORK_STATE` - Network monitoring
- `VIBRATE` - Haptic feedback

### Kiosk Mode Setup

For true kiosk lockdown on Android tablets:

1. **Android Kiosk Mode** (Built-in):
   - Settings → Security → Screen Pinning
   - Pin the app to prevent navigation

2. **MDM (Recommended for enterprise)**:
   - Microsoft Intune
   - Jamf
   - Google Workspace (formerly G Suite)

3. **Third-party Kiosk Apps**:
   - Kiosk Browser
   - SureLock
   - Scalefusion

### Tablet Optimization

- Landscape orientation enforced in `AndroidManifest.xml`
- `screenOrientation="landscape"`
- Optimized for 10" tablets (e.g., Galaxy Tab A9)

## API Configuration

The app connects to a Laravel backend. Configure the API URL:

**For Development:**
```env
MAIN_API_URL=http://192.168.1.100:8000/api
```

**For Production:**
```bash
MAIN_API_URL=https://api.wooserve.com/api npm run generate
npm run cap:sync:android
```

**Important:** Always use HTTPS in production. The `allowMixedContent` setting is automatically disabled in production builds for security.

## Updating the App

When you make code changes:

```bash
# 1. Generate static files
npm run generate

# 2. Sync to Android
npm run cap:sync:android

# 3. Re-run in Android Studio or device
```

Or use the combined script:
```bash
npm run cap:run:android
```

## Troubleshooting

### Android Studio Can't Find SDK
- File → Project Structure → SDK Location
- Set Android SDK path (usually `~/Android/Sdk` or `C:\Users\<name>\AppData\Local\Android\Sdk`)

### Gradle Build Errors
- Ensure JDK 17+ is installed and set as JAVA_HOME
- Try: `cd android && ./gradlew clean`
- Check `android/app/build.gradle` for version conflicts

### Capacitor CLI Issues
- Clear Capacitor cache: `rm -rf .capacitor`
- Reinstall platform: `rm -rf android && npm run cap:add:android`

### Network Detection Not Working
- Verify `@capacitor/network` is installed
- Check `composables/useNetworkStatus.ts` for Capacitor integration
- Ensure network permissions in `AndroidManifest.xml`

### App Won't Start on Device
- Check USB debugging is enabled
- Try: `adb devices` to verify device is connected
- Check Android Studio logcat for errors

## CI/CD with GitHub Actions

This repository includes a GitHub workflow (`.github/workflows/android-build.yml`) that automatically:
- Builds the web app
- Generates static files
- Sets up Android environment
- Builds debug APK
- Uploads APK as artifact

The workflow runs on:
- Pull requests to `main` or `staging`
- Pushes to `main` or `staging`
- Changes to TypeScript, Vue, or Capacitor files

### Manual CI/CD Build

For manual or custom CI/CD setups:

```bash
npm ci
npm run generate
npx cap sync android
cd android && ./gradlew assembleRelease
```

**For signed releases**, configure signing in `android/app/build.gradle` and use environment variables for credentials:

```gradle
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_FILE") ?: "release.keystore")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
```

## Additional Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Android Kiosk Mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode)

## Support

For issues specific to this app, please file a GitHub issue. For Capacitor questions, refer to the [Capacitor community forums](https://forum.ionicframework.com/c/capacitor/).
