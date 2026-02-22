// @ts-ignore - Nuxt macro imports (editor/CI may not resolve #app in all environments)
import { defineNuxtPlugin } from '#app'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
// @ts-ignore - Nuxt macro imports
import { useRuntimeConfig } from '#imports'
import { useDeviceStore } from '../stores/Device'
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

        const wsPort = config.public.reverb.port ?? 6001
        const wssPort = wsPort

        // Log Reverb configuration
        console.log('[🔴 Echo Init] Config:', {
            key: config.public.reverb.appKey?.substring(0, 8) + '...',
            host: reverbHost,
            wsPort,
            forceTLS: String(config.public.reverb.scheme || '').toLowerCase() === 'https',
            authEndpoint,
            hasAuthToken: !!token,
            timestamp: new Date().toISOString()
        })

        const echo = new Echo({
            broadcaster: 'reverb',
            key: config.public.reverb.appKey,
            wsHost: reverbHost,
            wsPort: wsPort,
            wssPort: wssPort,
            // set forceTLS based on scheme if provided
            forceTLS: String(config.public.reverb.scheme || '').toLowerCase() === 'https',
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

        // Monitor connection state
        if (echo && (echo as any).connector) {
            const connector = (echo as any).connector
            console.log('[✅ Echo Init] Instantiated, broadcaster=' + (echo as any).broadcaster)
            
            // Hook into connection success/failure if available
            try {
                if (typeof connector.socket?.on === 'function') {
                    connector.socket.on('connect', () => {
                        console.log('[🟢 Echo Connected] WebSocket connected at', new Date().toISOString())
                    })
                    connector.socket.on('disconnect', () => {
                        console.log('[🔴 Echo Disconnected] WebSocket disconnected at', new Date().toISOString())
                    })
                    connector.socket.on('error', (err: any) => {
                        console.error('[🔴 Echo Error]', err?.message || err, 'at', new Date().toISOString())
                    })
                }
            } catch (e) {
                logger.debug('[Echo] Connection hooks unavailable', e)
            }
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
                console.log('[📡 Echo Auth Updated] Bearer token', newToken ? 'SET' : 'CLEARED', 'at', new Date().toISOString())
            } catch (e) {
                logger.warn('[Echo] updateEchoAuth failed', e)
                console.error('[❌ Echo Auth Update Failed]', e)
            }
        }

    } catch (err) {
        logger.error('[laravel-echo] initialization failed', err)
        return
    }

})