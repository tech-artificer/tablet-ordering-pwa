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

    // Make Pusher available globally
    window.Pusher = Pusher

    // Configure Echo with environment variables
    window.Echo = new Echo({
        broadcaster: config.public.broadcastConnection,
        key: config.public.reverb.appKey,
        wsHost: config.public.reverb.host,
        wsPort: config.public.reverb.port,
        wssPort: config.public.reverb.port,
        forceTLS: config.public.reverb.scheme === 'https',
        encrypted: config.public.echo.encrypted,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        cluster: 'mt1' // adjust if needed
    })

    return {
        provide: {
        echo: window.Echo
        }
    }
})
