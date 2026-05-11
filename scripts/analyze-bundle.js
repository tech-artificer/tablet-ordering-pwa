#!/usr/bin/env node

import { readFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL(".", import.meta.meta))

// Simple bundle analyzer for PWA performance monitoring
function analyzeBundle () {
    try {
        const manifestPath = join(__dirname, "../.output/public/_nuxt/manifest.json")
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))

        console.log("🔍 PWA Bundle Analysis")
        console.log("=====================")

        let totalSize = 0
        const assets = []

        // Analyze main chunks
        Object.entries(manifest).forEach(([key, entry]) => {
            if (typeof entry === "string" && entry.endsWith(".js")) {
                try {
                    const filePath = join(__dirname, "../.output/public", entry)
                    const stats = readFileSync(filePath)
                    const size = stats.length

                    totalSize += size
                    assets.push({
                        file: entry,
                        size: formatBytes(size),
                        sizeBytes: size
                    })
                } catch (e) {
                    // File might not exist yet, skip
                }
            }
        })

        // Sort by size (largest first)
        assets.sort((a, b) => b.sizeBytes - a.sizeBytes)

        console.log(`Total bundle size: ${formatBytes(totalSize)}`)
        console.log("\nLargest assets:")
        assets.slice(0, 10).forEach((asset, index) => {
            console.log(`${index + 1}. ${asset.file} - ${asset.size}`)
        })

        // Performance recommendations
        console.log("\n📊 Performance Recommendations:")
        if (totalSize > 1024 * 1024) { // > 1MB
            console.log("⚠️  Bundle size is large. Consider code splitting.")
        }

        const largestAsset = assets[0]
        if (largestAsset && largestAsset.sizeBytes > 500 * 1024) { // > 500KB
            console.log(`⚠️  ${largestAsset.file} is large and may benefit from splitting.`)
        }

        if (assets.length > 20) {
            console.log("⚠️  Many chunks detected. Consider optimizing chunk strategy.")
        }

        console.log("\n✅ Bundle analysis complete")
    } catch (error) {
        console.error("❌ Bundle analysis failed:", error.message)
        console.log("💡 Make sure to run \"npm run build\" first")
    }
}

function formatBytes (bytes) {
    if (bytes === 0) { return "0 Bytes" }
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Run analysis
analyzeBundle()
