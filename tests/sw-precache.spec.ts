import { describe, expect, it } from 'vitest'
import { ensureAppShellPrecached } from '../utils/swPrecache'

describe('service worker precache safeguards', () => {
  it('adds /index.html when workbox manifest does not include it', () => {
    const manifest = [
      { url: '/_nuxt/app.js', revision: 'abc123' },
      { url: 'manifest.webmanifest', revision: 'def456' },
    ]

    const result = ensureAppShellPrecached(manifest)

    expect(result).toHaveLength(manifest.length + 1)
    expect(result.some((entry) => entry.url === '/index.html')).toBe(true)
  })

  it('does not add duplicate app shell when index.html is already present', () => {
    const manifest = [
      { url: 'index.html', revision: 'aaa111' },
      { url: '/_nuxt/app.js', revision: 'abc123' },
    ]

    const result = ensureAppShellPrecached(manifest)

    expect(result).toHaveLength(manifest.length)
    expect(result.filter((entry) => entry.url === '/index.html' || entry.url === 'index.html')).toHaveLength(1)
  })
})
