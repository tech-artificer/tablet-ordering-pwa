// utils/logger.ts
// Minimal logger wrapper that silences debug output in production.
const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

// Check if debug mode is enabled via localStorage (for on-device debugging)
const isDebugEnabled = (): boolean => {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('DEBUG_MODE') === 'true'
}

function safeCall(fn: (...args: any[]) => void, args: any[]) {
  try {
    fn(...args)
  } catch (e) {
    // swallow logging errors to avoid breaking app
  }
}

export const logger = {
  debug: (...args: any[]) => {
    if (!isProd || isDebugEnabled()) safeCall(console.debug.bind(console), args)
  },
  info: (...args: any[]) => {
    if (!isProd || isDebugEnabled()) safeCall(console.info.bind(console), args)
  },
  warn: (...args: any[]) => safeCall(console.warn.bind(console), args),
  error: (...args: any[]) => safeCall(console.error.bind(console), args),
  // Always log regardless of environment (for critical user-facing issues)
  critical: (...args: any[]) => safeCall(console.error.bind(console), ['🚨', ...args]),
}

// Enable/disable debug mode at runtime
export const setDebugMode = (enabled: boolean) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEBUG_MODE', enabled ? 'true' : 'false')
  }
}

export default logger