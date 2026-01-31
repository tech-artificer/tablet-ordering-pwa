// @ts-ignore - Nuxt macro imports (editor/CI may not resolve #app in all environments)
import { defineNuxtPlugin } from '#app'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
// @ts-ignore - Nuxt macro imports
import { useRuntimeConfig } from '#imports'
import { useDeviceStore } from '../stores/device'
import { logger } from '../utils/logger'

export default defineNuxtPlugin((nuxtApp: any) => {
    const config = useRuntimeConfig()
 
   const reverbKey = config.public.reverb.appKey
    const reverbHost = config.public.reverb.host
    const mainApi = config.public.mainApiUrl
    // console.log(reverbKey, reverbHost, mainApi)
    if (!reverbKey || !reverbHost || !mainApi) {
        // Missing runtime config — do nothing but warn
        // This keeps the app running in environments without websockets configured
        // (e.g., CI, static preview)
        // eslint-disable-next-line no-console
        // console.log('Reverb server not running; skipping initialization')
        // errorDialog.show('Reverb configuration error. Retrying...')
        return
    }

    try {
        const deviceStore = useDeviceStore()

        // If Echo is already initialized elsewhere, reuse it and avoid double init
        if (typeof window !== 'undefined' && (window as any).Echo) {
            // ensure it's provided to Nuxt and available as $echo
            // @ts-ignore
            (window as any).$echo = (window as any).Echo
            nuxtApp.provide('echo', (window as any).Echo)
            return
        }

        // expose Pusher to window for libraries that expect it
        // (only in client runtime)
        // @ts-ignore - augmenting window
        window.Pusher = Pusher

        // Build a normalized auth endpoint
        const authEndpoint = `${String(mainApi).replace(/\/$/, '')}/broadcasting/auth`

        // Prepare headers only if we have a token
        const token = deviceStore?.token
        
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        // Dynamically select protocol based on current page
        // Always select protocol based on browser context, not .env
        let wsProtocol = 'ws';
        let forceTLS = false;
        let wsPort = config.public.reverb.port;
        let wssPort = config.public.reverb.port;
        
        if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
            wsProtocol = 'wss';
            forceTLS = true;
            // When HTTPS, connect via nginx proxy (port 8000) for TLS termination
            wsPort = 8000;
            wssPort = 8000;
        }
        
        logger.info(`[Echo] Connecting to Reverb: ${wsProtocol}://${reverbHost}:${wsPort}/reverb`)

        const echo = new Echo({
            broadcaster: 'reverb',
            key: config.public.reverb.appKey,
            wsHost: reverbHost,
            wsPort: wsPort,
            wssPort: wssPort,
            wsPath: '/reverb',  // CRITICAL: Use nginx proxy path for TLS termination
            forceTLS,
            disableStats: true,
            enabledTransports: ['ws', 'wss'],
            authEndpoint,
            auth: {
                headers
            }
        })

        // @ts-ignore - attach for global access (used across the app)
        window.Echo = echo
        // also expose as $echo for older code paths
        // @ts-ignore
        window.$echo = echo

        // Provide via Nuxt injection
        nuxtApp.provide('echo', echo)

        // Add connection health monitoring
        if (echo.connector?.pusher) {
            echo.connector.pusher.connection.bind('connected', () => {
                logger.info('[Echo] ✅ WebSocket connected')
            })
            echo.connector.pusher.connection.bind('disconnected', () => {
                logger.warn('[Echo] ⚠️ WebSocket disconnected')
            })
            echo.connector.pusher.connection.bind('error', (err: any) => {
                logger.error('[Echo] 🔴 WebSocket error:', err)
            })
            echo.connector.pusher.connection.bind('failed', () => {
                logger.error('[Echo] 🔴 WebSocket connection failed permanently')
            })
        }

        // Expose a helper to update Echo auth header when token changes
        // Usage: window.updateEchoAuth(tokenString | null)
        // This avoids re-initializing Echo and allows the device store
        // to call this after refreshing/setting a new token.
        // @ts-ignore
        window.updateEchoAuth = (newToken: string | null) => {
            try {
                const bearer = newToken ? `Bearer ${newToken}` : undefined
                // Some Echo connectors expose `connector.options.auth.headers`
                if ((window as any).Echo && (window as any).Echo.connector && (window as any).Echo.connector.options) {
                    ;(window as any).Echo.connector.options.auth = (window as any).Echo.connector.options.auth || {}
                    ;(window as any).Echo.connector.options.auth.headers = (window as any).Echo.connector.options.auth.headers || {}
                    if (bearer) (window as any).Echo.connector.options.auth.headers.Authorization = bearer
                    else delete (window as any).Echo.connector.options.auth.headers.Authorization
                }
            } catch (e) {
                logger.warn('[Echo] updateEchoAuth failed', e)
            }
        }

    } catch (err) {
        logger.error('[laravel-echo] initialization failed', err)
        return
    }

})