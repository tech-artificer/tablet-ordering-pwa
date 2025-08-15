
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

export default defineNuxtPlugin(() => {
  // Make Pusher available globally for Echo
  window.Pusher = Pusher

  const config = {
    broadcaster: 'pusher',
    cluster: 'mt1',    
    key: 'vhy4mrtlhdwa61lukcze', // your Reverb app key
    wsHost: '192.168.100.85', // your server IP or hostname
    wsPort: 6001,
    wssPort: 6001,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authorizer: () => {
        
      return {
        authorize: (socketId, callback) => {
          $fetch('/api/broadcasting/auth', {
            baseURL: 'http://192.168.100.85', // API base
            method: 'POST',
            headers: {
              Authorization: `Bearer ${useRuntimeConfig().public.apiToken}`, // from runtime config
            },
            body: {
              socket_id: socketId,
              channel_name: channel.name,
            },
          })
            .then(response => callback(false, response))
            .catch(error => callback(true, error))
        },
      }
    },
  }

  const echo = new Echo(config)

  // Provide Echo instance to the whole app
  return {
    provide: {
      echo,
    },
  }
})


// import Echo from 'laravel-echo';

// import Pusher from 'pusher-js';
// import { useMyDeviceStore } from '@/stores/Device'
// window.Pusher = Pusher;

// export default defineNuxtPlugin((nuxtApp) => {
//   const config = useRuntimeConfig();
//   const deviceStore = useMyDeviceStore();

//   // Validate required dependencies
//   if (!deviceStore.device?.token) {
//     console.error('Device token not available');
//     return;
//   }

//   try {
//     window.Echo = new Echo({
//       broadcaster: config.public.NUXT_PUBLIC_BROADCAST_CONNECTION,
//       key: config.public.NUXT_PUBLIC_REVERB_APP_KEY,
//       wsHost: config.public.NUXT_PUBLIC_REVERB_HOST,
//       wsPort: config.public.NUXT_PUBLIC_REVERB_PORT,
//       forceTLS: false,
//       enabledTransports: ['ws', 'wss'],
//       authEndpoint: `${config.public.MAIN_API_URL}/api/broadcasting/auth`,
//       auth: {
//         headers: {
//           Authorization: `Bearer ${deviceStore.device.token}`,
//         }
//       },
//     });

//     // Setup channel listeners
//     const channel = `orders.${deviceStore.device.deviceId}`;
//     window.Echo.private(channel)
//       .listen('order.created', (e) => {
//         console.log('Order created:', e.order_id);
//       });

//     return {
//       provide: {
//         echo: window.Echo
//       }
//     };
//   } catch (error) {
//     console.error('Failed to initialize Echo:', error);
//   }
// });