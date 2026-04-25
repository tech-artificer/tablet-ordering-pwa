import fs from 'fs'
import path from 'path'

const rootDir = process.cwd()
const outputDirCandidates = ['.output/public', 'public', 'dist']
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

function resolveOutputDir() {
  for (const relativeDir of outputDirCandidates) {
    const candidateDir = path.join(rootDir, relativeDir)
    if (fs.existsSync(candidateDir)) {
      return { outputDir: candidateDir, outputDirLabel: relativeDir }
    }
  }

  throw new Error(
    `No generated static output directory found. Checked: ${outputDirCandidates.join(', ')}. Run generate before verification.`
  )
}

const { outputDir, outputDirLabel } = resolveOutputDir()

assertExists(path.join(outputDir, '_nuxt'), `${outputDirLabel}/_nuxt does not exist. Generated client assets are missing.`)

const missing = []

for (const htmlEntry of htmlEntries) {
  const htmlPath = path.join(outputDir, htmlEntry)
  if (!fs.existsSync(htmlPath)) {
    continue
  }

  const html = fs.readFileSync(htmlPath, 'utf8')
  const assetPaths = getAssetPathsFromHtml(html)

  for (const webPath of assetPaths) {
    const diskPath = path.join(outputDir, webPath.replace(/^\//, ''))
    if (!fs.existsSync(diskPath)) {
      missing.push(`${htmlEntry} -> ${webPath}`)
    }
  }
}

if (missing.length > 0) {
  throw new Error(`Build integrity check failed in ${outputDirLabel}/. Missing assets:\n${missing.join('\n')}`)
}

console.log(`Build integrity check passed: all hashed assets referenced by HTML exist in ${outputDirLabel}/.`)
