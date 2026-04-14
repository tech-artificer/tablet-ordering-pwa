import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
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

        // Use runtime-configured Reverb proxy settings.
        // nginx terminates TLS on 8443 and proxies /app to the local Reverb server.
        // Do not override to 8000 here; that stale port causes browser WebSocket failures.
        const forceTLS = String(config.public.reverb.scheme || '').toLowerCase() === 'https'
        const wsProtocol = forceTLS ? 'wss' : 'ws'
        const wsPort = Number(config.public.reverb.port)
        const wssPort = Number(config.public.reverb.port)
        
        logger.info(`[Echo] Connecting to Reverb: ${wsProtocol}://${reverbHost}:${wsPort}/reverb`)

        // Log Reverb configuration
        logger.info('[Echo Init] Config:', {
            key: config.public.reverb.appKey?.substring(0, 8) + '...',
            host: reverbHost,
            wsPort,
            forceTLS,
            authEndpoint,
            hasAuthToken: !!token,
            timestamp: new Date().toISOString()
        })

        const echo = new Echo({
            broadcaster: 'reverb',
            key: config.public.reverb.appKey,
            wsHost: reverbHost,
            wsPort,
            wssPort,
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

        // Clean up WebSocket connection when the app is unmounting to avoid
        // dangling socket connections on page reload / navigation away.
        nuxtApp.hook('app:beforeUnmount', () => {
            try {
                echo?.disconnect?.()
                if (typeof window !== 'undefined') {
                    delete (window as any).Echo
                    delete (window as any).$echo
                    delete (window as any).updateEchoAuth
                }
                logger.info('[Echo] Disconnected on app unmount')
            } catch (e) {
                logger.warn('[Echo] Disconnect on unmount failed', e)
            }
        })

        // Monitor connection state
        if (echo && (echo as any).connector) {
            const connector = (echo as any).connector
            logger.info('[Echo Init] Instantiated, broadcaster=' + (echo as any).broadcaster)
            
            // Hook into connection success/failure if available
            try {
                if (typeof connector.socket?.on === 'function') {
                    connector.socket.on('connect', () => {
                        logger.info('[Echo Connected] WebSocket connected at ' + new Date().toISOString())
                    })
                    connector.socket.on('disconnect', () => {
                        logger.warn('[Echo Disconnected] WebSocket disconnected at ' + new Date().toISOString())
                    })
                    connector.socket.on('error', (err: any) => {
                        logger.error('[Echo Error] ' + (err?.message || err) + ' at ' + new Date().toISOString())
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
                logger.info('[Echo Auth Updated] Bearer token ' + (newToken ? 'SET' : 'CLEARED') + ' at ' + new Date().toISOString())
            } catch (e) {
                logger.warn('[Echo] updateEchoAuth failed', e)
                logger.error('[Echo Auth Update Failed]', e)
            }
        }

    } catch (err) {
        logger.error('[laravel-echo] initialization failed', err)
        return
    }

})