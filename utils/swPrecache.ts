export type PrecacheEntry = {
  url: string
  revision: string | null
}

export function ensureAppShellPrecached(entries: PrecacheEntry[]): PrecacheEntry[] {
  const hasIndexHtml = entries.some((entry) => entry.url === 'index.html' || entry.url === '/index.html')

  if (hasIndexHtml) {
    return entries
  }

  return [...entries, { url: '/index.html', revision: null }]
}
