import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
    interface Window {
        Pusher: typeof Pusher
        Echo: Echo
    }
}

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const deviceStore = useMyDeviceStore()

    // Make Pusher available globally
    window.Pusher = Pusher

    // Configure Echo with environment variables
    const echoConfig = {
        broadcaster: config.public.broadcastConnection || config.public.NUXT_PUBLIC_BROADCAST_CONNECTION,
        key: config.public.reverb.appKey || config.public.NUXT_PUBLIC_REVERB_APP_KEY,
        wsHost: config.public.reverb.host || config.public.NUXT_PUBLIC_REVERB_SERVER_HOST,
        wsPort: config.public.reverb.port || config.public.NUXT_PUBLIC_REVERB_HOST,
        wssPort: config.public.reverb.port || config.public.NUXT_PUBLIC_REVERB_HOST,
        forceTLS: config.public.reverb.scheme === 'https' || false,
        encrypted: config.public.echo.encrypted || false,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        cluster: 'mt1',
        authorizer: () => {
            return {
                authorize: (socketId: string, callback: Function) => {
                    $fetch('/api/broadcasting/auth', {
                        baseURL: config.public.MAIN_API_URL,
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${deviceStore.device.token}`,
                        },
                        body: {
                            socket_id: socketId,
                        },
                    })
                        .then(response => callback(false, response))
                        .catch(error => callback(true, error))
                }
            }
        }
    }

    // Create Echo instance
    const echo = new Echo(echoConfig)

    // Make Echo available globally
    window.Echo = echo

    return {
        provide: {
            echo: window.Echo
        }
    }
})
