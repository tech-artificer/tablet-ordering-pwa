/**
 * Global Error Handler Plugin
 *
 * Catches ChunkLoadError, dynamic import failures, and other critical errors
 * that would otherwise result in a black screen. Redirects to recovery flow.
 */

import { logger } from "~/utils/logger"

interface ChunkError extends Error {
    type?: string
    request?: string
}

const CRITICAL_ERROR_KEY = "pwa-critical-error"
const LAST_ERROR_TIMESTAMP_KEY = "pwa-last-error-ts"
const ERROR_COUNT_KEY = "pwa-error-count"
const ERROR_WINDOW_MS = 60000 // 1 minute window for error counting
const MAX_ERRORS_IN_WINDOW = 3

function isChunkLoadError (error: Error | ChunkError): boolean {
    const message = error.message || ""
    return (
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("__webpack_require__") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Cannot find module") ||
        message.includes("module script") ||
        (error.name === "ChunkLoadError")
    )
}

function isImportFailureError (error: Error | ChunkError): boolean {
    const message = error.message || ""
    return (
        message.includes("Failed to load module script") ||
        message.includes("error loading dynamically imported module") ||
        message.includes("Dynamic import") ||
        message.includes("import()") ||
        message.includes("Failed to fetch")
    )
}

function isServiceWorkerError (error: Error | ChunkError): boolean {
    const message = error.message || ""
    return (
        message.includes("service worker") ||
        message.includes("ServiceWorker") ||
        message.includes("CacheStorage")
    )
}

function isNuxtChunkError (error: Error | ChunkError): boolean {
    const message = error.message || ""
    return (
        message.includes("nuxt") &&
        (message.includes("chunk") || message.includes("route"))
    )
}

function recordError (): { count: number; shouldReset: boolean } {
    const now = Date.now()
    const lastError = parseInt(localStorage.getItem(LAST_ERROR_TIMESTAMP_KEY) || "0", 10)
    let count = parseInt(localStorage.getItem(ERROR_COUNT_KEY) || "0", 10)

    // Reset count if outside window
    if (now - lastError > ERROR_WINDOW_MS) {
        count = 0
    }

    count++
    localStorage.setItem(ERROR_COUNT_KEY, count.toString())
    localStorage.setItem(LAST_ERROR_TIMESTAMP_KEY, now.toString())

    return { count, shouldReset: count >= MAX_ERRORS_IN_WINDOW }
}

function storeCriticalError (error: Error | ChunkError, type: string): void {
    try {
        const errorData = {
            type,
            message: error.message,
            stack: error.stack,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
        }
        sessionStorage.setItem(CRITICAL_ERROR_KEY, JSON.stringify(errorData))
    } catch {
        // Ignore storage errors
    }
}

function handleCriticalError (error: Error | ChunkError, source: string): void {
    logger.error(`[ErrorHandler] Critical error from ${source}:`, error)

    const { count, shouldReset } = recordError()

    // Determine error type
    let errorType = "unknown"
    if (isChunkLoadError(error)) { errorType = "chunk-load" } else if (isImportFailureError(error)) { errorType = "import-failure" } else if (isServiceWorkerError(error)) { errorType = "service-worker" } else if (isNuxtChunkError(error)) { errorType = "nuxt-chunk" }

    storeCriticalError(error, errorType)

    // If too many errors in short window, force hard reset
    if (shouldReset) {
        logger.warn(`[ErrorHandler] ${count} errors in ${ERROR_WINDOW_MS}ms, forcing hard reset`)
        window.location.href = "/sw-reset?auto=1&reason=error-spike"
        return
    }

    // Redirect to recovery screen with error context
    const params = new URLSearchParams({
        type: errorType,
        source,
        count: count.toString(),
    })
    window.location.href = `/recovery?${params.toString()}`
}

export default defineNuxtPlugin(() => {
    if (typeof window === "undefined") { return }

    // Track if we've already handled an error (prevent loops)
    let handlingError = false

    // Handle unhandled promise rejections (dynamic imports, etc.)
    window.addEventListener("unhandledrejection", (event) => {
        if (handlingError) { return }

        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

        if (isChunkLoadError(error) || isImportFailureError(error)) {
            handlingError = true
            event.preventDefault()
            handleCriticalError(error, "unhandledrejection")
        }
    })

    // Handle global errors
    window.addEventListener("error", (event) => {
        if (handlingError) { return }

        const error = event.error instanceof Error ? event.error : new Error(event.message)

        if (
            isChunkLoadError(error) ||
            isImportFailureError(error) ||
            isServiceWorkerError(error) ||
            isNuxtChunkError(error)
        ) {
            handlingError = true
            event.preventDefault()
            handleCriticalError(error, "error-event")
        }
    })

    // Handle Vue errors via Nuxt's hook
    const nuxtApp = useNuxtApp()
    nuxtApp.hook("vue:error", (error) => {
        if (handlingError) { return }

        const err = error instanceof Error ? error : new Error(String(error))

        if (
            isChunkLoadError(err) ||
            isImportFailureError(err) ||
            isNuxtChunkError(err)
        ) {
            handlingError = true
            handleCriticalError(err, "vue-error")
        }
    })

    // Check for version mismatch on startup
    const checkVersion = async () => {
        try {
            const config = useRuntimeConfig()
            const currentBuild = config.public.buildSha || "unknown"
            const storedBuild = localStorage.getItem("pwa-build-sha")

            if (storedBuild && storedBuild !== currentBuild) {
                logger.warn(`[ErrorHandler] Build mismatch: stored=${storedBuild}, current=${currentBuild}`)
                // Store for recovery page to detect
                sessionStorage.setItem("pwa-build-mismatch", JSON.stringify({
                    stored: storedBuild,
                    current: currentBuild,
                    timestamp: Date.now(),
                }))
            }

            // Always update stored build
            localStorage.setItem("pwa-build-sha", currentBuild)
        } catch {
            // Ignore storage errors
        }
    }

    checkVersion().catch(() => {})

    logger.info("[ErrorHandler] Global error handler initialized")
})
