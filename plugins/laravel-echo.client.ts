import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useDeviceStore } from '@/stores/Device'
import { useErrorDialogStore } from '@/stores/ErrorDialog'

export default defineNuxtPlugin((nuxtApp) => {
    // Ensure this plugin only runs on the client
    if (!import.meta.client) {
        return
    }

    const config = useRuntimeConfig()
    const errorDialog = useErrorDialogStore()
   
    // Minimal required config checks
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

        const echo = new Echo({
            broadcaster: 'reverb',
            key: config.public.reverb.appKey,
            wsHost: reverbHost,
            wsPort: wsPort,
            wssPort: wssPort,
            // set forceTLS based on scheme if provided
            forceTLS: String(config.public.NUXT_PUBLIC_REVERB_SCHEME || '').toLowerCase() === 'https',
            disableStats: true,
            enabledTransports: ['ws', 'wss'],
            authEndpoint,
            auth: {
                headers
            }
        })

        // @ts-ignore - attach for global access (used across the app)
        window.Echo = echo

        // Provide via Nuxt injection
        nuxtApp.provide('echo', echo)

        
        ElNotification({
            title: 'Connection Successful',
            message: 'Connected.',
            type: 'success',
        })

    } catch (err) {


        ElNotification({
            title: 'Unavailable',
            message: 'Cannot connect to WebSocket.',
            type: 'error',
        })

        errorDialog.show('Failed to connect to WebSocket. Retrying...')
        // eslint-disable-next-line no-console
        console.error('[laravel-echo] initialization failed', err)
        return
    }
})
