import { useSessionStore } from '~/stores/Session'
import { useDeviceStore } from '~/stores/Device'
export default defineNuxtPlugin(async () => {

    const deviceStore = useDeviceStore()
    const sessionStore = useSessionStore()

    // sessionStore.canProceed = false
    if (!deviceStore.hasDevice) {
        await deviceStore.authenticate()
        sessionStore.canProceed = false
        if(!deviceStore.hasDevice) {
            
            navigateTo('/register')
            return;
          
        }
    }
    sessionStore.canProceed = true

    if(sessionStore.canProceed) {
        sessionStore.startSession()
    }

})