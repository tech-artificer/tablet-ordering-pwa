import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { useMyDeviceStore } from '@/stores/Device'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const deviceStore = useMyDeviceStore()
    window.Pusher = Pusher

    const echo = new Echo({
        broadcaster: 'reverb',
        key: config.public.NUXT_PUBLIC_REVERB_APP_KEY,
        wsHost: config.public.NUXT_PUBLIC_REVERB_HOST,
        wsPort: config.public.NUXT_PUBLIC_REVERB_PORT ?? 8081,
        wssPort: config.public.NUXT_PUBLIC_REVERB_PORT ?? 8081,
        forceTLS: false,
        disableStats: true,
        enabledTransports: ['ws'],
        authEndpoint: `${config.public.MAIN_API_URL}/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${deviceStore.device.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        },
    })
    window.Echo = echo
    return {
        provide: {
            echo,
        }
    }
})
