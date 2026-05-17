/**
 * Build Version Check Composable
 *
 * Monitors for build mismatches between deployed version and running app.
 * Triggers recovery flow if stale chunks are detected.
 */

import { readonly, ref } from "vue"
import { logger } from "~/utils/logger"

const BUILD_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const BUILD_CHECK_KEY = "pwa-last-build-check"
const BUILD_MISMATCH_THRESHOLD = 2 // Require 2 consecutive mismatches

interface BuildInfo {
    sha: string
    branch: string
    time: string
    version: string
}

interface BuildCheckResult {
    matches: boolean
    current: BuildInfo
    server?: BuildInfo
}

const mismatchCount = ref(0)
const lastCheckResult = ref<BuildCheckResult | null>(null)
let checkInterval: ReturnType<typeof setInterval> | null = null

async function fetchServerBuildInfo (): Promise<BuildInfo | null> {
    try {
        // Try to fetch build info from the server
        const response = await fetch("/build-info.json", {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
        })

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        return {
            sha: data.sha || data.buildSha || "unknown",
            branch: data.branch || data.buildBranch || "unknown",
            time: data.time || data.buildTime || new Date().toISOString(),
            version: data.version || data.appVersion || "unknown",
        }
    } catch {
        // Silent fail - build info endpoint might not exist
        return null
    }
}

function getCurrentBuildInfo (): BuildInfo {
    const config = useRuntimeConfig()
    return {
        sha: config.public.buildSha || "unknown",
        branch: config.public.buildBranch || "unknown",
        time: config.public.buildTime || new Date().toISOString(),
        version: config.public.appVersion || "unknown",
    }
}

async function checkBuildVersion (): Promise<BuildCheckResult> {
    const current = getCurrentBuildInfo()
    const server = await fetchServerBuildInfo()

    if (!server) {
        // Can't verify, assume OK
        return { matches: true, current }
    }

    const matches = current.sha === server.sha

    return { matches, current, server }
}

export function useBuildVersion () {
    const isChecking = ref(false)
    const hasMismatch = ref(false)

    const performCheck = async (redirectOnMismatch = false): Promise<boolean> => {
        if (typeof window === "undefined") { return true }
        if (isChecking.value) { return true }

        isChecking.value = true

        try {
            const result = await checkBuildVersion()
            lastCheckResult.value = result

            if (!result.matches) {
                mismatchCount.value++
                logger.warn(
                    `[BuildVersion] Mismatch detected (${mismatchCount.value}/${BUILD_MISMATCH_THRESHOLD}): ` +
                    `current=${result.current.sha.slice(0, 7)}, server=${result.server?.sha.slice(0, 7)}`
                )

                if (mismatchCount.value >= BUILD_MISMATCH_THRESHOLD) {
                    hasMismatch.value = true

                    // Store for recovery page
                    sessionStorage.setItem("pwa-build-mismatch", JSON.stringify({
                        stored: result.current.sha,
                        current: result.server?.sha,
                        timestamp: Date.now(),
                    }))

                    if (redirectOnMismatch) {
                        window.location.href = "/recovery?type=chunk-load&source=build-check"
                        return false
                    }
                }
            } else {
                // Reset counter on successful match
                if (mismatchCount.value > 0) {
                    logger.info("[BuildVersion] Match confirmed, resetting mismatch counter")
                }
                mismatchCount.value = 0
                hasMismatch.value = false
            }

            localStorage.setItem(BUILD_CHECK_KEY, Date.now().toString())
            return result.matches
        } catch (error) {
            logger.error("[BuildVersion] Check failed:", error)
            return true // Assume OK on error
        } finally {
            isChecking.value = false
        }
    }

    const startPeriodicCheck = (redirectOnMismatch = false) => {
        if (typeof window === "undefined") { return }

        // Clear existing interval
        if (checkInterval) {
            clearInterval(checkInterval)
        }

        // Check immediately on start
        performCheck(redirectOnMismatch)

        // Then check periodically
        checkInterval = setInterval(() => {
            performCheck(redirectOnMismatch)
        }, BUILD_CHECK_INTERVAL_MS)
    }

    const stopPeriodicCheck = () => {
        if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
        }
    }

    const forceCheckNow = () => performCheck(true)

    return {
        isChecking: readonly(isChecking),
        hasMismatch: readonly(hasMismatch),
        mismatchCount: readonly(mismatchCount),
        lastCheckResult: readonly(lastCheckResult),
        performCheck,
        startPeriodicCheck,
        stopPeriodicCheck,
        forceCheckNow,
    }
}
