import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const publicDir = path.join(rootDir, 'public')

const generatedEntries = [
  '200.html',
  '404.html',
  'auth',
  'index.html',
  'manifest.webmanifest',
  'menu',
  'order',
  'settings',
  'sw.js',
  'test',
  'workbox-354287e6.js',
  '_fonts',
  '_nuxt'
]

for (const entry of generatedEntries) {
  const target = path.join(publicDir, entry)
  if (!fs.existsSync(target)) {
    continue
  }

  fs.rmSync(target, { recursive: true, force: true })
}

for (const entry of fs.readdirSync(publicDir)) {
  if (!entry.startsWith('workbox-')) {
    continue
  }

  fs.rmSync(path.join(publicDir, entry), { recursive: true, force: true })
}

console.log('Removed stale generated artifacts from public/')