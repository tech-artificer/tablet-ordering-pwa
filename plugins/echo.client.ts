import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useDeviceStore } from '../stores/Device'
import { logger } from '../utils/logger'

/**
 * Create (or recreate) an Echo instance with the given config.
 * Disconnects any existing instance first.
 */
function createEcho(
    nuxtApp: any,
    cfg: { key: string; host: string; port: number; scheme: string; authEndpoint?: string },
    mainApiUrl: string,
    token: string | null
) {
    // Disconnect previous instance if any
    if (typeof window !== 'undefined' && (window as any).Echo) {
        try { (window as any).Echo.disconnect() } catch (_) {}
    }

    // expose Pusher to window for libraries that expect it
    // @ts-ignore - augmenting window
    window.Pusher = Pusher

    // Build a normalized auth endpoint
    const authEndpoint = cfg.authEndpoint
        ? `${String(mainApiUrl).replace(/\/$/, '')}${cfg.authEndpoint}`
        : `${String(mainApiUrl).replace(/\/$/, '')}/broadcasting/auth`

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    // Dynamically select protocol based on current page
    let wsPort = cfg.port
    let wssPort = cfg.port
    let forceTLS = false

    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        forceTLS = true
        // When HTTPS, connect via nginx proxy (port 8000) for TLS termination
        wsPort = 8000
        wssPort = 8000
    }

    logger.info(`[Echo] Connecting to Reverb: ${forceTLS ? 'wss' : 'ws'}://${cfg.host}:${wsPort}/reverb`)

    console.log('[Echo Init] Config:', {
        key: cfg.key?.substring(0, 8) + '...',
        host: cfg.host,
        wsPort,
        forceTLS: String(cfg.scheme || '').toLowerCase() === 'https',
        authEndpoint,
        hasAuthToken: !!token,
        timestamp: new Date().toISOString()
    })

    const echo = new Echo({
        broadcaster: 'reverb',
        key: cfg.key,
        wsHost: cfg.host,
        wsPort: wsPort,
        wssPort: wssPort,
        forceTLS: String(cfg.scheme || '').toLowerCase() === 'https',
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
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
    nuxtApp.provide('echo', echo)

    // Monitor connection state
    if (echo && (echo as any).connector) {
        const connector = (echo as any).connector
        console.log('[Echo Init] Instantiated, broadcaster=' + (echo as any).broadcaster)

        try {
            if (typeof connector.socket?.on === 'function') {
                connector.socket.on('connect', () => {
                    console.log('[Echo Connected] WebSocket connected at', new Date().toISOString())
                })
                connector.socket.on('disconnect', () => {
                    console.log('[Echo Disconnected] WebSocket disconnected at', new Date().toISOString())
                })
                connector.socket.on('error', (err: any) => {
                    console.error('[Echo Error]', err?.message || err, 'at', new Date().toISOString())
                })
            }
        } catch (e) {
            logger.debug('[Echo] Connection hooks unavailable', e)
        }
    }

    return echo
}

export default defineNuxtPlugin((nuxtApp: any) => {
    const config = useRuntimeConfig()
    const mainApi = config.public.mainApiUrl

    if (!mainApi) return

    try {
        const deviceStore = useDeviceStore()

        // If Echo is already initialized elsewhere, reuse it
        if (typeof window !== 'undefined' && (window as any).Echo) {
            // @ts-ignore
            (window as any).$echo = (window as any).Echo
            nuxtApp.provide('echo', (window as any).Echo)
            // Still register initEcho for future config changes
            ;(window as any).initEcho = (cfg: any, tok: string | null) => {
                createEcho(nuxtApp, cfg, String(mainApi), tok)
            }
            return
        }

        // Expose initEcho globally — called by Device store after auth when
        // server provides broadcasting config
        ;(window as any).initEcho = (cfg: any, tok: string | null) => {
            createEcho(nuxtApp, cfg, String(mainApi), tok)
        }

        // Determine initial config source:
        // 1. Persisted broadcastConfig from Device store (server-provided, preferred)
        // 2. runtimeConfig from nuxt.config.ts (fallback for first boot / dev / CI)
        const persisted = deviceStore.broadcastConfig
        const token = deviceStore?.token

        if (persisted && persisted.key) {
            logger.info('[Echo] Using persisted server-provided broadcast config')
            createEcho(nuxtApp, persisted, String(mainApi), token)
        } else if (config.public.reverb?.appKey && config.public.reverb?.host) {
            // Fallback to runtimeConfig (env vars)
            logger.info('[Echo] Using runtimeConfig fallback (no server config cached yet)')
            createEcho(nuxtApp, {
                key: config.public.reverb.appKey,
                host: config.public.reverb.host,
                port: config.public.reverb.port || 6001,
                scheme: config.public.reverb.scheme || 'http',
            }, String(mainApi), token)
        } else {
            // No config available — Echo will init after first successful auth
            logger.info('[Echo] No broadcast config available yet, waiting for auth')
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
                    if (bearer) (window as any).Echo.connector.options.auth.headers.Authorization = bearer
                    else delete (window as any).Echo.connector.options.auth.headers.Authorization
                }
                console.log('[Echo Auth Updated] Bearer token', newToken ? 'SET' : 'CLEARED', 'at', new Date().toISOString())
            } catch (e) {
                logger.warn('[Echo] updateEchoAuth failed', e)
                console.error('[Echo Auth Update Failed]', e)
            }
        }

    } catch (err) {
        logger.error('[laravel-echo] initialization failed', err)
        return
    }

})
