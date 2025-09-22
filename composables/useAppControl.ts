// import { useNuxtApp } from '#app'
// import { useOrderStore } from '~/stores/Order'
// import { useCartStore } from '~/stores/Cart'
// import { useSessionStore } from '~/stores/session'
// import { useMyDeviceStore } from '~/stores/Device'

// let echo: Echo | null = null

// export const useOrderListener = () => {

//     const { $echo } = useNuxtApp()
//     const orderStore = useOrderStore()
//     const cartStore = useCartStore()
//     const sessionStore = useSessionStore()
//     const deviceStore = useMyDeviceStore()

//     echo.channel(`app-control.${deviceStore.device?.id}`)
//         .listen('.AppControlEvent', (event: any) => {
//             console.log('[AppControl]', event)

//             switch (event.action) {
//                 case 'reset':
//                     // Reset Pinia stores
//                     const stores = [useOrderStore(), useCartStore(), useSessionStore()]
//                     stores.forEach(store => store.$reset?.())
//                     break

//                 case 'navigate':
//                     if (event.payload?.route) {
//                         navigateTo(event.payload.route)
//                     }
//                     break

//                 case 'refresh':
//                     location.reload()
//                     break

//                 case 'toast':
//                     // optional: show a notification on the tablet
//                     console.log('Toast:', event.payload?.message)
//                     break

//                 default:
//                     console.warn('Unknown action', event.action)
//             }
//         })
// }