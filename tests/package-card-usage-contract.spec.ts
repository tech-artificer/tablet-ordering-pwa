import { readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, join } from "node:path"
import { describe, it, expect } from "vitest"

const ROOT = resolve(__dirname, "..")
const SCAN_DIRS = ["pages", "components", "layouts"]
const EXCLUDE_PATTERNS = ["node_modules", ".nuxt", "dist", ".output", "docs"]

function getVueFiles (baseDir: string): string[] {
    const results: string[] = []
    try {
        const entries = readdirSync(baseDir)
        for (const entry of entries) {
            const fullPath = join(baseDir, entry)
            if (EXCLUDE_PATTERNS.some(p => fullPath.includes(p))) {
                continue
            }
            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
                results.push(...getVueFiles(fullPath))
            } else if (entry.endsWith(".vue")) {
                results.push(fullPath)
            }
        }
    } catch {
        // Skip non-existent directories
    }
    return results
}

describe("package-card usage contract", () => {
    it("requires :pkg, :guest-count, :format-currency on all <PackageCard> tags", () => {
        const vueFiles = SCAN_DIRS.flatMap(dir => getVueFiles(join(ROOT, dir)))

        for (const file of vueFiles) {
            const source = readFileSync(file, "utf8")
            const tagMatches = [...source.matchAll(/<PackageCard\b[^>]*>/g)]

            for (const match of tagMatches) {
                const tag = match[0]
                const hasPkg = /:pkg\b/.test(tag)
                const hasGuestCount = /:guest-count\b/.test(tag)
                const hasFormatCurrency = /:format-currency\b/.test(tag)

                expect(hasPkg, `Missing :pkg prop in ${file}`).toBe(true)
                expect(hasGuestCount, `Missing :guest-count prop in ${file}`).toBe(true)
                expect(hasFormatCurrency, `Missing :format-currency prop in ${file}`).toBe(true)
            }

            expect(
                /<PackageCard\s*\/>/.test(source),
                `Bare <PackageCard /> found in ${file}`
            ).toBe(false)

            expect(
                /<PackageCard\s*>/.test(source),
                `Bare <PackageCard> found in ${file}`
            ).toBe(false)
        }
    })
})
