import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useMyDeviceStore } from '@/stores/Device'

export default defineNuxtPlugin((nuxtApp) => {
    // Ensure this plugin only runs on the client
    if (!import.meta.client) {
        return
    }

    const config = useRuntimeConfig()
    // console.log('config', config)
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
        console.warn('[laravel-echo] missing reverb/pusher/runtime config; plugin will not initialize')
        return
    }

    try {
        const deviceStore = useMyDeviceStore()

        // expose Pusher to window for libraries that expect it
        // (only in client runtime)
        // @ts-ignore - augmenting window
        window.Pusher = Pusher

        // Build a normalized auth endpoint
        const authEndpoint = `${String(mainApi).replace(/\/$/, '')}/broadcasting/auth`

        // Prepare headers only if we have a token
        const token = deviceStore?.device?.token
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }
        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        const wsPort = config.public.reverb.port ?? 8081
        const wssPort = wsPort

        const echo = new Echo({
            broadcaster: 'reverb',
            key: config.public.reverb.appKey,
            wsHost: reverbHost,
            wsPort,
            wssPort,
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

        // return { provide: { echo } }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[laravel-echo] initialization failed', err)
        return
    }
})
