import Echo from "laravel-echo"
import Pusher from "pusher-js"
import { useDeviceStore } from "../stores/Device"
import { logger } from "../utils/logger"

type EchoConfig = {
    key: string
    host: string
    port: number
    scheme: string
    path?: string
    authEndpoint?: string
}

function normalizeWsPath (path?: string) {
    const raw = String(path ?? "").trim()
    if (!raw) {
        return ""
    }

    const normalized = raw.startsWith("/") ? raw : `/${raw}`

    // Reverb/Pusher endpoint is already /app/{key}; if wsPath is '/app',
    // pusher-js produces '/app/app/{key}'.
    if (normalized === "/app") {
        return ""
    }

    return normalized
}

function resolveAuthEndpoint (apiBaseUrl: string, authEndpoint?: string) {
    if (!authEndpoint) {
        return "/broadcasting/auth"
    }

    if (/^https?:\/\//i.test(authEndpoint)) {
        return authEndpoint
    }

    if (authEndpoint.startsWith("/")) {
        return authEndpoint
    }

    return `${String(apiBaseUrl).replace(/\/$/, "")}/${authEndpoint.replace(/^\//, "")}`
}

/**
 * Create (or recreate) an Echo instance with the given config.
 * Disconnects any existing instance first.
 */
function createEcho (
    nuxtApp: any,
    cfg: EchoConfig,
    apiBaseUrl: string,
    token: string | null
) {
    if (!cfg?.key) {
        logger.warn("[Echo] Skipping initialization because broadcast key is missing")
        return null
    }

    // Disconnect previous instance if any
    if (typeof window !== "undefined" && (window as any).Echo) {
        try { (window as any).Echo.disconnect() } catch (_) {}
    }

    // expose Pusher to window for libraries that expect it
    // @ts-ignore - augmenting window
    window.Pusher = Pusher

    // Build a normalized auth endpoint
    const authEndpoint = resolveAuthEndpoint(apiBaseUrl, cfg.authEndpoint)

    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json"
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    // Dynamically select protocol based on current page
    const browserHost = typeof window !== "undefined" ? window.location.hostname : ""
    const browserPort = typeof window !== "undefined" ? window.location.port : ""
    const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:"
    const normalizedHost = cfg.host || browserHost
    const normalizedPort = cfg.port || (isHttpsPage ? 443 : 80)
    const currentOriginPort = browserPort ? parseInt(browserPort, 10) : (isHttpsPage ? 443 : 80)
    const wsPort = normalizedPort === 80 || normalizedPort === 443 ? currentOriginPort : normalizedPort
    const wssPort = wsPort
    const forceTLS = isHttpsPage || String(cfg.scheme || "").toLowerCase() === "https"

    const wsPath = normalizeWsPath(cfg.path)

    logger.info(`[Echo] Connecting to Reverb: ${forceTLS ? "wss" : "ws"}://${normalizedHost}:${wsPort}${wsPath}`)

    console.log("[Echo Init] Config:", {
        key: cfg.key?.substring(0, 8) + "...",
        host: normalizedHost,
        wsPort,
        forceTLS,
        authEndpoint,
        hasAuthToken: !!token,
        timestamp: new Date().toISOString()
    })

    const echo = new Echo({
        broadcaster: "reverb",
        key: cfg.key,
        wsHost: normalizedHost,
        wsPort,
        wssPort,
        forceTLS,
        wsPath,
        disableStats: true,
        enabledTransports: ["ws", "wss"],
        authEndpoint,
        auth: {
            headers
        }
    })

    // @ts-ignore - attach for global access
    window.Echo = echo
    // @ts-ignore
    window.$echo = echo

    // Provide via Nuxt injection
    nuxtApp.provide("echo", echo)

    // Monitor connection state
    if (echo && (echo as any).connector) {
        const connector = (echo as any).connector
        console.log("[Echo Init] Instantiated, broadcaster=" + (echo as any).broadcaster)

        try {
            if (typeof connector.socket?.on === "function") {
                connector.socket.on("connect", () => {
                    console.log("[Echo Connected] WebSocket connected at", new Date().toISOString())
                })
                connector.socket.on("disconnect", () => {
                    console.log("[Echo Disconnected] WebSocket disconnected at", new Date().toISOString())
                })
                connector.socket.on("error", (err: any) => {
                    console.error("[Echo Error]", err?.message || err, "at", new Date().toISOString())
                })
            }
        } catch (e) {
            logger.debug("[Echo] Connection hooks unavailable", e)
        }
    }

    return echo
}

function normalizeBroadcastConfig (raw: any): EchoConfig | null {
    if (!raw?.key) {
        return null
    }

    const rawPort = Number(raw.port ?? 0)
    return {
        key: String(raw.key),
        host: String(raw.host ?? ""),
        port: (rawPort === 8080 || rawPort === 6001) ? 0 : rawPort,
        scheme: String(raw.scheme ?? "http"),
        path: normalizeWsPath(String(raw.path ?? "")),
        authEndpoint: raw.authEndpoint ? String(raw.authEndpoint) : (raw.auth_endpoint ? String(raw.auth_endpoint) : undefined),
    }
}

export default defineNuxtPlugin((nuxtApp: any) => {
    const config = useRuntimeConfig()
    const mainApi = config.public.apiBaseUrl

    if (!mainApi) { return }

    try {
        const deviceStore = useDeviceStore()

        // If Echo is already initialized elsewhere, reuse it
        if (typeof window !== "undefined" && (window as any).Echo) {
            // @ts-ignore
            (window as any).$echo = (window as any).Echo
            nuxtApp.provide("echo", (window as any).Echo)
            // Still register initEcho for future config changes
            ;(window as any).initEcho = (cfg: any, tok: string | null) => {
                createEcho(nuxtApp, cfg, String(mainApi), tok)
            }
            return
        }

        // Expose initEcho globally — called by Device store after auth when
        // server provides broadcasting config
        ;(window as any).initEcho = (cfg: any, tok: string | null) => {
            const normalized = normalizeBroadcastConfig(cfg)
            if (!normalized) {
                logger.warn("[Echo] Ignoring incomplete initEcho payload")
                return null
            }

            return createEcho(nuxtApp, normalized, String(mainApi), tok)
        }

        // Determine initial config source:
        // 1. Persisted broadcastConfig from Device store (server-provided, preferred)
        // 2. Dynamic /api/config payload from backend (cold-start source of truth)
        // 3. runtimeConfig from nuxt.config.ts (last-resort fallback for dev / CI)
        const persisted = deviceStore.broadcastConfig
        const token = deviceStore?.token

        const initializeFromApiConfig = async () => {
            try {
                const response = await $fetch<{ broadcasting?: EchoConfig | null }>("/api/config", {
                    baseURL: String(mainApi).startsWith("/") ? undefined : String(mainApi),
                })
                const normalized = normalizeBroadcastConfig(response?.broadcasting)

                if (normalized) {
                    logger.info("[Echo] Using dynamic /api/config broadcast config")
                    createEcho(nuxtApp, normalized, String(mainApi), token)
                    return true
                }
            } catch (error) {
                logger.warn("[Echo] Failed to load /api/config broadcast config", error)
            }

            return false
        }

        if (normalizeBroadcastConfig(persisted)) {
            logger.info("[Echo] Using persisted server-provided broadcast config")
            createEcho(nuxtApp, normalizeBroadcastConfig(persisted)!, String(mainApi), token)
        } else if (config.public.reverb?.appKey) {
            // Fallback to runtimeConfig (env vars)
            logger.info("[Echo] Using runtimeConfig fallback (no server config cached yet)")
            const rawFallbackPort = Number(config.public.reverb.port ?? 0)
            createEcho(nuxtApp, {
                key: config.public.reverb.appKey,
                host: config.public.reverb.host || "",
                port: (rawFallbackPort === 8080 || rawFallbackPort === 6001) ? 0 : rawFallbackPort,
                scheme: config.public.reverb.scheme || "http",
                path: normalizeWsPath(config.public.reverb.path || ""),
            }, String(mainApi), token)

            void initializeFromApiConfig()
        } else {
            void initializeFromApiConfig().then((initialized) => {
                if (!initialized) {
                    logger.info("[Echo] No broadcast config available yet, waiting for auth")
                }
            })
        }

        // Expose a helper to update Echo auth header when token changes
        // (fast path — no full reinit, just updates the bearer token)
        // @ts-ignore
        window.updateEchoAuth = (newToken: string | null) => {
            try {
                const bearer = newToken ? `Bearer ${newToken}` : undefined
                if ((window as any).Echo && (window as any).Echo.connector && (window as any).Echo.connector.options) {
                    ;(window as any).Echo.connector.options.auth = (window as any).Echo.connector.options.auth || {}
                    ;(window as any).Echo.connector.options.auth.headers = (window as any).Echo.connector.options.auth.headers || {}
                    if (bearer) { (window as any).Echo.connector.options.auth.headers.Authorization = bearer } else { delete (window as any).Echo.connector.options.auth.headers.Authorization }
                }
                console.log("[Echo Auth Updated] Bearer token", newToken ? "SET" : "CLEARED", "at", new Date().toISOString())
            } catch (e) {
                logger.warn("[Echo] updateEchoAuth failed", e)
                console.error("[Echo Auth Update Failed]", e)
            }
        }
    } catch (err) {
        logger.error("[laravel-echo] initialization failed", err)
    }
})
