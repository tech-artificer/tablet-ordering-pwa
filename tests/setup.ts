// Global test setup for Vitest
// Provide minimal shims and helpers used across unit tests.

// localStorage shim for Node/jsdom
if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {}
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
  }
}

// Minimal sessionStorage shim
if (typeof globalThis.sessionStorage === 'undefined') {
  const storage: Record<string, string> = {}
  // @ts-ignore
  globalThis.sessionStorage = {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
  }
}

// Global stub for formatCurrency used in templates
// Keep it simple: numbers formatted as USD-like string; passthrough otherwise
if (typeof (globalThis as any).formatCurrency === 'undefined') {
  ;(globalThis as any).formatCurrency = (v: any) => {
    const n = Number(v)
    if (!isNaN(n)) return `$${n.toFixed(2)}`
    return String(v)
  }
}

// Helpful: clear storage before each test file runs
import { beforeEach } from 'vitest'
beforeEach(() => {
  try { globalThis.localStorage.clear() } catch (e) {}
  try { globalThis.sessionStorage.clear() } catch (e) {}
})
