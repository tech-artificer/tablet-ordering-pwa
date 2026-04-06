import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const appRoot = process.cwd()
const logoPath = path.join(appRoot, 'assets', 'images', 'logo', 'woosoo-icon-color.png')
const outputDir = path.join(appRoot, 'public', 'icons')
const brandBackground = '#0F0F0F'

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true })
}

async function squareIcon(filename, size, scale = 0.78) {
  const logoSize = Math.round(size * scale)
  const padding = size - logoSize

  await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.round(padding / 2),
      bottom: Math.ceil(padding / 2),
      left: Math.round(padding / 2),
      right: Math.ceil(padding / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(outputDir, filename))
}

async function maskableIcon() {
  const size = 512
  const logoSize = Math.round(size * 0.62)
  const buffer = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandBackground,
    },
  })
    .composite([{ input: buffer, gravity: 'center' }])
    .png()
    .toFile(path.join(outputDir, 'pwa-icon-maskable.png'))
}

async function run() {
  await ensureOutputDir()
  await squareIcon('pwa-icon-192.png', 192)
  await squareIcon('pwa-icon-512.png', 512)
  await squareIcon('apple-touch-icon.png', 180, 0.82)
  await maskableIcon()
  console.log('Generated PWA icons in public/icons')
}

run().catch((error) => {
  console.error('Failed to generate PWA icons')
  console.error(error)
  process.exitCode = 1
})