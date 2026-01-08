// utils/haptics.ts
// Haptic feedback utility for app-like touch responses
// Supports both Web Vibration API and Capacitor Haptics

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

// Vibration patterns (in milliseconds) - fallback for Web API
const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 20],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
}

/**
 * Check if running in Capacitor native context
 */
function isCapacitor(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Trigger haptic feedback using Capacitor when available, fallback to Web API
 */
async function hapticCapacitor(type: HapticType): Promise<void> {
  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light })
        break
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium })
        break
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy })
        break
      case 'success':
        await Haptics.notification({ type: NotificationType.Success })
        break
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning })
        break
      case 'error':
        await Haptics.notification({ type: NotificationType.Error })
        break
    }
  } catch (e) {
    // Log error for debugging, but don't break the app
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Haptics] Capacitor haptic failed:', e)
    }
  }
}

/**
 * Trigger haptic feedback using Web Vibration API
 */
function hapticWeb(type: HapticType): void {
  if (typeof navigator === 'undefined') return
  if (!navigator.vibrate) return

  try {
    const pattern = patterns[type] || patterns.light
    navigator.vibrate(pattern)
  } catch (e) {
    // Silently fail - haptics are optional enhancement
  }
}

/**
 * Trigger haptic feedback if device supports vibration
 */
export function haptic(type: HapticType = 'light'): void {
  if (isCapacitor()) {
    // Use Capacitor Haptics in native context (async, but fire-and-forget for haptics)
    hapticCapacitor(type).catch((e) => {
      // Log error for debugging, but don't break the app
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Haptics] Failed to trigger haptic:', e)
      }
    })
  } else {
    // Fallback to Web Vibration API
    hapticWeb(type)
  }
}

/**
 * Haptic feedback for button press
 */
export function hapticButton(): void {
  haptic('light')
}

/**
 * Haptic feedback for successful action
 */
export function hapticSuccess(): void {
  haptic('success')
}

/**
 * Haptic feedback for error/warning
 */
export function hapticError(): void {
  haptic('error')
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  // Check Capacitor first
  if (isCapacitor()) {
    return true // Capacitor Haptics is always available on native platforms
  }
  // Fallback to Web API check
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export default {
  haptic,
  hapticButton,
  hapticSuccess,
  hapticError,
  isHapticSupported,
}
