// utils/haptics.ts
// Haptic feedback utility for app-like touch responses

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

// Vibration patterns (in milliseconds)
const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 20],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
}

/**
 * Trigger haptic feedback if device supports vibration
 */
export function haptic(type: HapticType = 'light'): void {
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
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export default {
  haptic,
  hapticButton,
  hapticSuccess,
  hapticError,
  isHapticSupported,
}
