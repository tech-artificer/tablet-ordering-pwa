import { useNuxtApp } from '#app'


export function useAppControl(deviceId: string) {
  
 const { $echo } = useNuxtApp()

 const channelName = `device.${deviceId}`
    console.log(`📡 Subscribing to ${channelName}`)
  $echo.channel(channelName)
    .listen('.device.control', (event: any) => {
      console.log('[device.control]', event)

    //   const session = useSessionStore()  

      switch (event.action) {
        case 'reset':
            console.log('[device.control]', event)
        //   session.endSession()
          // also reset dependent stores
        //   useOrderStore().$reset()
        //   useCartStore().$reset()
        //   navigateTo('/welcome')
          break

        case 'navigate':
             console.log('[device.control]', event)
        //   if (event.payload?.route) {
        //     navigateTo(event.payload.route)
        //   }
          break

        case 'print_status':
          // Example: show toast to user
          console.log('Printer says:', event.payload?.message)
          break

        default:
          console.warn('Unknown action', event.action)
      }
    })
}