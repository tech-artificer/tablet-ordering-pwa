// import Echo from 'laravel-echo';
// import Pusher from 'pusher-js';

// export default defineNuxtPlugin(() => {
//     const config = useRuntimeConfig()
//     window.Pusher = Pusher;

//     const echo = new Echo({
//         broadcaster: 'reverb',
//         key: config.public.NUXT_PUBLIC_REVERB_APP_KEY,
//         wsHost: config.public.NUXT_PUBLIC_REVERB_HOST,
//         wsPort: config.public.NUXT_PUBLIC_REVERB_PORT ?? 8081,
//         wssPort: config.public.NUXT_PUBLIC_REVERB_PORT ?? 8081,
//         forceTLS: false,
//         disableStats: true,
//         enabledTransports: ['ws'],
//     });
//     window.Echo = echo
//     return {
//         provide: {
//             echo,
//         }
//     }
// })
