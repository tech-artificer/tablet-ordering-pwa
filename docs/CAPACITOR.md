# Capacitor Native App Integration

This document describes how to build and deploy the Wooserve Kiosk app as a native Android or iOS application using Capacitor.

## Overview

The app is already configured for Capacitor and includes:
- ✅ Capacitor core dependencies
- ✅ Android and iOS platform support
- ✅ Native plugins (Haptics, Network, App lifecycle, StatusBar, SplashScreen)
- ✅ Kiosk-optimized configuration
- ✅ Build scripts in package.json

## Prerequisites

### For Android Development
- **Node.js** 18+ and npm
- **Android Studio** (latest stable version)
- **JDK** 17 or higher
- **Android SDK** with API level 33+ (Android 13)

### For iOS Development
- **macOS** (required for iOS builds)
- **Xcode** 14+ 
- **CocoaPods** (`sudo gem install cocoapods`)
- **iOS Simulator** or physical iOS device

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all Capacitor dependencies including:
- `@capacitor/core` - Core Capacitor functionality
- `@capacitor/cli` - Capacitor command-line tools
- `@capacitor/android` - Android platform
- `@capacitor/ios` - iOS platform
- `@capacitor/haptics` - Native haptic feedback
- `@capacitor/network` - Network status monitoring
- `@capacitor/app` - App lifecycle management
- `@capacitor/status-bar` - Status bar control
- `@capacitor/splash-screen` - Splash screen management

### 2. Generate Static Files

Before adding platforms, generate static files from the Nuxt app:

```bash
npm run generate
```

**Important:** Use `generate` not `build` for Capacitor. This creates static HTML/JS/CSS files in `.output/public/` that Capacitor can wrap. The `build` command creates a Node.js server which won't work in a native app context.

### 3. Add Native Platforms

Add the platforms you want to build for:

```bash
# Add Android
npm run cap:add:android

# Add iOS (macOS only)
npm run cap:add:ios
```

This creates `android/` and/or `ios/` directories with native project files.

## Configuration

The Capacitor configuration is in `capacitor.config.ts`:

```typescript
{
  appId: 'com.wooserve.kiosk',
  appName: 'Wooserve Kiosk',
  webDir: '.output/public',
  // ... platform-specific settings
}
```

### Key Configuration Options

- **appId**: Unique identifier for your app (change for your deployment)
- **appName**: Display name shown on device
- **webDir**: Where Capacitor finds the built web assets
- **server.androidScheme/iosScheme**: Use `https` for security
- **plugins**: Configure splash screen, status bar, keyboard behavior

## Development Workflow

### Build and Sync

After making changes to your web app, sync them to native platforms:

```bash
# Sync all platforms
npm run cap:sync

# Sync specific platform
npm run cap:sync:android
npm run cap:sync:ios
```

### Open in Native IDE

```bash
# Open Android Studio
npm run cap:open:android

# Open Xcode (macOS only)
npm run cap:open:ios
```

### Run on Device/Emulator

```bash
# Run on Android
npm run cap:run:android

# Run on iOS
npm run cap:run:ios
```

## Building for Production

### Android APK/AAB

1. **Generate static files:**
   ```bash
   npm run generate
   ```

2. **Sync to Android:**
   ```bash
   npm run cap:sync:android
   ```

   Or use the combined script:
   ```bash
   npm run cap:run:android  # Generates + syncs + runs
   ```

3. **Open Android Studio:**
   ```bash
   npm run cap:open:android
   ```

4. **In Android Studio:**
   - Select **Build → Build Bundle(s) / APK(s) → Build APK** for testing
   - Or **Build → Generate Signed Bundle / APK** for release
   - Configure signing keys in `android/app/build.gradle`

5. **Or use Gradle CLI:**
   ```bash
   cd android
   ./gradlew assembleRelease  # APK
   ./gradlew bundleRelease    # AAB for Play Store
   ```

   Output: `android/app/build/outputs/apk/release/app-release.apk`

### iOS IPA

1. **Generate static files:**
   ```bash
   npm run generate
   ```

2. **Sync to iOS:**
   ```bash
   npm run cap:sync:ios
   ```

3. **Open Xcode:**
   ```bash
   npm run cap:open:ios
   ```

4. **In Xcode:**
   - Select the target device or simulator
   - Configure signing in **Signing & Capabilities**
   - Select **Product → Archive**
   - Distribute via App Store Connect or Ad Hoc

## Kiosk Mode Features

The app is optimized for tablet kiosk deployment:

### Status Bar
- Hidden by default for fullscreen experience
- Dark theme with brand colors
- Configured in `plugins/capacitor.client.ts`

### Splash Screen
- 2-second display on launch
- Brand colors (#0F0F0F background, #F6B56D accent)
- Configured in `capacitor.config.ts`

### Haptic Feedback
- Enhanced with native Capacitor Haptics
- Falls back to Web Vibration API on web
- See `utils/haptics.ts`

### Network Monitoring
- Enhanced with native Capacitor Network plugin
- Better reliability than web-only detection
- See `composables/useNetworkStatus.ts`

### App Lifecycle
- Detects when app goes to background/foreground
- Useful for refreshing data when kiosk returns from sleep
- See `composables/useCapacitor.ts`

## Platform-Specific Notes

### Android

**Permissions:**
Default permissions are set in `android/app/src/main/AndroidManifest.xml`:
- `INTERNET` - API communication
- `ACCESS_NETWORK_STATE` - Network monitoring
- `VIBRATE` - Haptic feedback

**Kiosk Mode:**
For true kiosk lockdown on Android tablets:
1. Use Android's **Kiosk Mode** or **Screen Pinning**
2. Or deploy via MDM (Mobile Device Management) like Intune or Jamf
3. Or use dedicated kiosk apps like **Fully Kiosk Browser** (though Capacitor is better)

**Tablet Optimization:**
- Landscape orientation enforced in manifest
- `screenOrientation="landscape"` in `AndroidManifest.xml`

### iOS

**Permissions:**
Permissions are requested at runtime. Common ones:
- Network access (automatic)
- Vibration/Haptics (automatic)

**Kiosk Mode:**
iOS has **Guided Access** for kiosk lockdown:
1. Settings → Accessibility → Guided Access
2. Enable and set a passcode
3. Open your app, triple-click home button, start Guided Access

**iPad Optimization:**
- Configured for landscape in `capacitor.config.ts`
- Fullscreen manifest settings

## API Configuration

The app connects to a Laravel backend. Set the API URL:

**For Development (web):**
```env
MAIN_API_URL=http://192.168.1.100:8000/api
```

**For Production Native Apps:**
Edit `capacitor.config.ts` if you need to whitelist specific domains or configure CORS differently. The `server.allowNavigation` array can include your API domain if needed.

Alternatively, set environment variables before generating:
```bash
MAIN_API_URL=https://api.wooserve.com/api npm run generate
npm run cap:sync
```

## Updating the App

When you make code changes:

```bash
# 1. Generate static files
npm run generate

# 2. Sync to native platforms
npm run cap:sync

# 3. Re-run or rebuild in IDE
```

Or use the combined scripts:
```bash
npm run cap:run:android
npm run cap:run:ios
```

## Troubleshooting

### Android Studio Can't Find SDK
- File → Project Structure → SDK Location
- Set Android SDK path (usually `~/Android/Sdk` or `C:\Users\<name>\AppData\Local\Android\Sdk`)

### iOS Build Errors
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Run `pod install` in `ios/App` directory if CocoaPods issues occur

### Capacitor CLI Issues
- Clear Capacitor cache: `rm -rf .capacitor`
- Reinstall platforms: `rm -rf android ios && npm run cap:add:android`

### Splash Screen Not Hiding
- Check `plugins/capacitor.client.ts` and `composables/useCapacitor.ts`
- Ensure `SplashScreen.hide()` is called after app loads

### Network Detection Not Working
- Verify `@capacitor/network` is installed
- Check `composables/useNetworkStatus.ts` for Capacitor integration
- Ensure network permissions in `AndroidManifest.xml` (Android)

## Additional Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Nuxt Capacitor Integration](https://nuxt.com/blog/nuxt-on-the-edge#native-mobile-apps)

## Notes for CI/CD

For automated builds:

**Android:**
```bash
npm ci
npm run generate
npx cap sync android
cd android && ./gradlew assembleRelease
```

**iOS (requires macOS runner):**
```bash
npm ci
npm run generate
npx cap sync ios
cd ios/App && pod install
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath App.xcarchive archive
```

Consider using Fastlane for more advanced CI/CD workflows.
