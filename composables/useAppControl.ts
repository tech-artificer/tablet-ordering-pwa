import { useNuxtApp } from '#app'
import { useSessionStore } from '~/stores/Session'
// import { refreshNuxtData } from '#app';

export function useAppControl(deviceId: string) {
  
  const session = useSessionStore()
  const { $echo } = useNuxtApp()

 const channelName = `device.${deviceId}`
    console.log(`📡 Subscribing to ${channelName}`)
    $echo.channel(channelName)
    .listen('.device.control', (event: any) => {
      console.log('[device.control]', event)

    //   const session = useSessionStore()  
     
      switch (event.action) {
        case 'reset':
           ElNotification({
        title: 'Device Control',
        message: 'Resetting your session, please wait.',
        type: 'info',
      })
          console.log('[device.control]', event)
          session.endSession()

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
        
          case 'reload':
            refreshNuxtData();
          // Example: show toast to user
          console.log('Printer says:', event.payload?.message)
          break

        default:
          console.warn('Unknown action', event.action)
      }
      
      return true;
    })

}