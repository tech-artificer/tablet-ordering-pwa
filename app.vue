<script setup lang="ts">
import { useDeviceStore } from "~/stores/Device"
import { useSessionStore } from "~/stores/Session"
import { useAppUpdate } from "~/composables/useAppUpdate"
import { useBroadcasts } from "~/composables/useBroadcasts"
import { useNetworkStatus } from "~/composables/useNetworkStatus"
import { useKioskFullscreen } from "~/composables/useKioskFullscreen"
import { useBuildVersion } from "~/composables/useBuildVersion"
import { logger } from "~/utils/logger"

const router = useRouter()
const nuxtApp = useNuxtApp()
const deviceStore = useDeviceStore()
const sessionStore = useSessionStore()
const { initializeBroadcasts, cleanup } = useBroadcasts()
const { attachListener, requestFullscreen } = useKioskFullscreen()
const { startPeriodicCheck, stopPeriodicCheck } = useBuildVersion()

// Update system is now route-controlled (welcome screen + settings only)
// See useAppUpdate.ts for new kiosk-safe API
const { initializeAppUpdate, disposeAppUpdate } = useAppUpdate()
const isLoading = ref(true)
let broadcastTimer: ReturnType<typeof setTimeout> | null = null
let gestureListenersAttached = false

// Sleep/wake tracking
let hiddenSince: number | null = null
const FORCE_REINIT_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

// Initialize network status monitoring
useNetworkStatus()

const PUBLIC_ROUTES = ["/", "/settings", "/auth/register"]

async function checkAuthentication (): Promise<void> {
    const currentRoute = router.currentRoute.value.path

    if (PUBLIC_ROUTES.includes(currentRoute)) {
        return
    }

    if (deviceStore.isAuthenticated) {
        logger.debug("[Auth] Already authenticated")
        return
    }

    logger.debug("[Auth] Not authenticated, attempting login...")
    const isAuthenticated = await deviceStore.authenticate()

    if (isAuthenticated) {
        logger.debug("[Auth] Authentication successful")
        return
    }

    logger.debug("[Auth] Authentication failed, redirecting to settings PIN")
    await router.replace("/settings?requirePin=1")
}

async function silentlyAuthenticateWelcomeRoute (): Promise<boolean> {
    if (deviceStore.isAuthenticated) {
        logger.debug("[Auth] Welcome route already authenticated")
        return true
    }

    if (deviceStore.token) {
        try {
            logger.debug("[Auth] Welcome route refresh attempt")
            const refreshed = await deviceStore.refresh()
            if (refreshed && deviceStore.isAuthenticated) {
                logger.debug("[Auth] Welcome route refresh successful")
                return true
            }
        } catch (error) {
            logger.warn("[Auth] Welcome route refresh failed", error)
        }
    }

    try {
        logger.debug("[Auth] Welcome route silent login attempt")
        const authenticated = await deviceStore.authenticate()
        if (authenticated && deviceStore.isAuthenticated) {
            logger.debug("[Auth] Welcome route silent login successful")
            return true
        }
    } catch (error) {
        logger.warn("[Auth] Welcome route silent login failed", error)
    }

    logger.debug("[Auth] Welcome route remains unauthenticated")
    return false
}

async function resolveAuthenticationState (): Promise<boolean> {
    const currentRoute = router.currentRoute.value.path

    if (currentRoute === "/") {
        return silentlyAuthenticateWelcomeRoute()
    }

    if (PUBLIC_ROUTES.includes(currentRoute)) {
        return deviceStore.isAuthenticated.value
    }

    await checkAuthentication()
    return deviceStore.isAuthenticated.value
}

function scheduleBroadcastInitialization (): void {
    if (!deviceStore.isAuthenticated.value) {
        return
    }

    if (broadcastTimer) {
        clearTimeout(broadcastTimer)
    }

    broadcastTimer = setTimeout(() => {
        initializeBroadcasts()
    }, 1000)
}

function enforceFullscreenIfNeeded (): void {
    if (typeof document === "undefined") { return }
    if (deviceStore.getKioskUnlocked()) { return }

    requestFullscreen().catch(() => undefined)
}

function handleFullscreenGestureRecovery (): void {
    enforceFullscreenIfNeeded()
}

function registerGestureFullscreenRecovery (): void {
    if (typeof document === "undefined" || gestureListenersAttached) { return }

    gestureListenersAttached = true
    document.addEventListener("pointerdown", handleFullscreenGestureRecovery, { passive: true })
    document.addEventListener("touchstart", handleFullscreenGestureRecovery, { passive: true })
}

function unregisterGestureFullscreenRecovery (): void {
    if (typeof document === "undefined" || !gestureListenersAttached) { return }

    document.removeEventListener("pointerdown", handleFullscreenGestureRecovery)
    document.removeEventListener("touchstart", handleFullscreenGestureRecovery)
    gestureListenersAttached = false
}

function handleVisibilityChange (): void {
    if (typeof document === "undefined") { return }

    if (document.hidden) {
        hiddenSince = Date.now()
        return
    }

    // Device woke up
    const hiddenDurationMs = hiddenSince !== null ? Date.now() - hiddenSince : 0
    hiddenSince = null

    enforceFullscreenIfNeeded()

    logger.info(`[App] Wake detected after ${Math.round(hiddenDurationMs / 1000)}s`)

    if (!deviceStore.isAuthenticated.value || !sessionStore.isActive) { return }

    if (hiddenDurationMs >= FORCE_REINIT_THRESHOLD_MS) {
    // After long sleep, force a full Echo teardown and re-init so channels
    // re-subscribe and missed events are replayed. Short sleeps rely on
    // useBroadcasts' auto-reconnect (Mission-7 Task 1.7).
        logger.warn("[App] Wake after >5min — forcing full broadcast re-init")
        cleanup()
    }

    initializeBroadcasts()
    // Note: session sync + order polling restart on wake are handled by
    // Session.ts _onVisibilityChange — no duplication needed here.
}

onMounted(async () => {
    attachListener()
    registerGestureFullscreenRecovery()
    await initializeAppUpdate()

    // Start periodic build version checking (for stale chunk detection)
    startPeriodicCheck(false)

    try {
        const authenticated = await resolveAuthenticationState()
        await nuxtApp.callHook("app:auth-ready", { authenticated })

        if (authenticated) {
            scheduleBroadcastInitialization()
        }
    } finally {
        isLoading.value = false
    }
    // Enforce fullscreen as early as possible (browser may defer until user gesture)
    enforceFullscreenIfNeeded()

    // Register sleep/wake handler
    if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange)
    }
})

onUnmounted(() => {
    if (broadcastTimer) {
        clearTimeout(broadcastTimer)
    }

    cleanup()
    disposeAppUpdate()
    unregisterGestureFullscreenRecovery()
    stopPeriodicCheck()

    if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
})
</script>

<template>
    <div class="contents">
        <SplashScreen :visible="isLoading" />

        <!-- Global connection and error overlays -->
        <ConnectionBlockingOverlay />

        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </div>
</template>
