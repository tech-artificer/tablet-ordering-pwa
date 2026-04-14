import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const htmlEntries = ['index.html', '200.html', '404.html']

function assertExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message)
  }
}

function getAssetPathsFromHtml(html) {
  const matches = [...html.matchAll(/(?:href|src)="(\/(?:_nuxt|_fonts)\/[^"]+)"/g)]
  return matches.map((m) => m[1])
}

assertExists(distDir, 'dist/ does not exist. Run generate before verification.')
assertExists(path.join(distDir, '_nuxt'), 'dist/_nuxt does not exist. Generated client assets are missing.')

const missing = []

for (const htmlEntry of htmlEntries) {
  const htmlPath = path.join(distDir, htmlEntry)
  if (!fs.existsSync(htmlPath)) {
    continue
  }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const assetPaths = getAssetPathsFromHtml(html)

  for (const webPath of assetPaths) {
    const diskPath = path.join(distDir, webPath.replace(/^\//, ''))
    if (!fs.existsSync(diskPath)) {
      missing.push(`${htmlEntry} -> ${webPath}`)
    }
  }
}

if (missing.length > 0) {
  throw new Error(`Build integrity check failed. Missing assets:\n${missing.join('\n')}`)
}

console.log('Build integrity check passed: all hashed assets referenced by HTML exist in dist/.')
