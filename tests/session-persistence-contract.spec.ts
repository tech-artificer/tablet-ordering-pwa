import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("session persistence contract", () => {
    it("Session.ts has no manual setItem(\"session-store\") calls", () => {
        const source = readProjectFile("stores/Session.ts")
        expect(source).not.toContain("setItem(\"session-store\"")
        expect(source).not.toContain("setItem('session-store'")
    })

    it("Session.ts and Order.ts have no manual setItem(\"session_active\") calls", () => {
        const sessionSource = readProjectFile("stores/Session.ts")
        const orderSource = readProjectFile("stores/Order.ts")

        expect(sessionSource).not.toContain("setItem(\"session_active\"")
        expect(sessionSource).not.toContain("setItem('session_active'")
        expect(orderSource).not.toContain("setItem(\"session_active\"")
        expect(orderSource).not.toContain("setItem('session_active'")
    })

    // NOTE: Pinia persist hydration round-trip test is deferred.
    // In a JSDOM unit-test environment the storage binding is captured at defineStore()
    // call-time, making reliable mock-localStorage hydration non-trivial without a full
    // Nuxt app context. The two contract tests above prove the core Fix 3 goal
    // (no manual setItem calls). Hydration correctness is validated by the E2E test suite.
    it.todo("store reads persisted session-store value on init via Pinia persist plugin")
})
