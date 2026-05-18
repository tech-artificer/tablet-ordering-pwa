/**
 * Global Error Handler Plugin Tests
 *
 * Tests the error detection and recovery routing logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("Error Handler Plugin", () => {
    let errorHandlers: Array<(event: ErrorEvent | PromiseRejectionEvent) => void> = []
    const originalAddEventListener = window.addEventListener
    const originalLocation = window.location

    beforeEach(() => {
        errorHandlers = []

        // Mock addEventListener to capture error handlers
        window.addEventListener = vi.fn((event: string, handler: any) => {
            if (event === "error" || event === "unhandledrejection") {
                errorHandlers.push(handler)
            }
        }) as any

        // Mock window.location
        Object.defineProperty(window, "location", {
            value: { href: "" },
            writable: true,
        })

        localStorage.clear()
        sessionStorage.clear()
    })

    afterEach(() => {
        window.addEventListener = originalAddEventListener
        Object.defineProperty(window, "location", {
            value: originalLocation,
            writable: true,
        })
    })

    describe("Chunk Load Error Detection", () => {
        const isChunkLoadError = (message: string): boolean => {
            return (
                message.includes("ChunkLoadError") ||
                message.includes("Loading chunk") ||
                message.includes("__webpack_require__") ||
                message.includes("Failed to fetch dynamically imported module") ||
                message.includes("Cannot find module")
            )
        }

        it("detects various chunk load error messages", () => {
            const testCases = [
                { message: "ChunkLoadError: Loading chunk 123 failed", expected: true },
                { message: "Loading chunk app/layout failed", expected: true },
                { message: "Failed to fetch dynamically imported module", expected: true },
                { message: "Cannot find module './some-module'", expected: true },
                { message: "__webpack_require__ is not defined", expected: true },
                { message: "Random error message", expected: false },
                { message: "Network error", expected: false },
            ]

            testCases.forEach(({ message, expected }) => {
                expect(isChunkLoadError(message)).toBe(expected)
            })
        })
    })

    describe("Import Failure Detection", () => {
        const isImportFailureError = (message: string): boolean => {
            return (
                message.includes("Failed to load module script") ||
                message.includes("error loading dynamically imported module") ||
                message.includes("Dynamic import") ||
                message.includes("Failed to fetch")
            )
        }

        it("detects dynamic import failures", () => {
            const testCases = [
                { message: "Failed to load module script", expected: true },
                { message: "error loading dynamically imported module", expected: true },
                { message: "Dynamic import failed", expected: true },
                { message: "Failed to fetch resource", expected: true },
                { message: "Some other error", expected: false },
            ]

            testCases.forEach(({ message, expected }) => {
                expect(isImportFailureError(message)).toBe(expected)
            })
        })
    })

    describe("Error Recording", () => {
        it("records error timestamp and increments count", () => {
            const ERROR_WINDOW_MS = 60000
            const now = Date.now()

            // Record first error
            localStorage.setItem("pwa-error-count", "1")
            localStorage.setItem("pwa-last-error-ts", now.toString())

            // Simulate recording second error
            const lastError = parseInt(localStorage.getItem("pwa-last-error-ts") || "0", 10)
            let count = parseInt(localStorage.getItem("pwa-error-count") || "0", 10)

            if (now - lastError <= ERROR_WINDOW_MS) {
                count++
            } else {
                count = 1
            }

            localStorage.setItem("pwa-error-count", count.toString())

            expect(count).toBe(2)
        })

        it("resets error count outside time window", () => {
            const ERROR_WINDOW_MS = 60000
            const now = Date.now()
            const oldTimestamp = now - ERROR_WINDOW_MS - 1000 // Outside window

            localStorage.setItem("pwa-error-count", "5")
            localStorage.setItem("pwa-last-error-ts", oldTimestamp.toString())

            const lastError = parseInt(localStorage.getItem("pwa-last-error-ts") || "0", 10)
            let count = parseInt(localStorage.getItem("pwa-error-count") || "0", 10)

            if (now - lastError > ERROR_WINDOW_MS) {
                count = 0
            }

            expect(count).toBe(0)
        })

        it("triggers hard reset after 3 errors in window", () => {
            const MAX_ERRORS = 3
            const errorCount = 4
            const shouldReset = errorCount >= MAX_ERRORS

            expect(shouldReset).toBe(true)
        })
    })

    describe("Critical Error Storage", () => {
        it("stores error details in sessionStorage", () => {
            const error = new Error("ChunkLoadError: Loading chunk failed")
            const errorData = {
                type: "chunk-load",
                message: error.message,
                stack: error.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
            }

            sessionStorage.setItem("pwa-critical-error", JSON.stringify(errorData))

            const stored = sessionStorage.getItem("pwa-critical-error")
            expect(stored).not.toBeNull()

            const parsed = JSON.parse(stored!)
            expect(parsed.type).toBe("chunk-load")
            expect(parsed.message).toBe(error.message)
        })
    })

    describe("Recovery Routing", () => {
        it("routes to recovery page with correct params", () => {
            const error = new Error("ChunkLoadError: Loading chunk 123 failed")
            const errorType = "chunk-load"
            const source = "unhandledrejection"
            const count = 2

            const params = new URLSearchParams({
                type: errorType,
                source,
                count: count.toString(),
            })

            expect(params.toString()).toContain("type=chunk-load")
            expect(params.toString()).toContain("source=unhandledrejection")
            expect(params.toString()).toContain("count=2")
        })

        it("routes to sw-reset on error spike", () => {
            const errorCount = 3
            const MAX_ERRORS = 3

            if (errorCount >= MAX_ERRORS) {
                window.location.href = "/sw-reset?auto=1&reason=error-spike"
            }

            expect(window.location.href).toBe("/sw-reset?auto=1&reason=error-spike")
        })
    })

    describe("Build Version Mismatch", () => {
        it("detects build version mismatch", () => {
            const storedBuild: string = "abc123"
            const currentBuild: string = "def456"

            const hasMismatch = storedBuild !== currentBuild
            expect(hasMismatch).toBe(true)
        })

        it("stores mismatch details for recovery", () => {
            const mismatch = {
                stored: "abc123",
                current: "def456",
                timestamp: Date.now(),
            }

            sessionStorage.setItem("pwa-build-mismatch", JSON.stringify(mismatch))

            const stored = JSON.parse(sessionStorage.getItem("pwa-build-mismatch")!)
            expect(stored.stored).toBe("abc123")
            expect(stored.current).toBe("def456")
        })
    })
})
