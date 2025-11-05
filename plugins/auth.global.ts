import { useSessionStore } from '~/stores/Session'
import { useDeviceStore } from '~/stores/Device'

export default defineNuxtPlugin(async (to) => {
  
    const deviceStore = useDeviceStore()
    const sessionStore = useSessionStore()


    // await deviceStore.verifyToken();
    await deviceStore.authenticate();
    // console.log('Verify Token', response);


    if (!deviceStore.hasDevice || !deviceStore.getTableAssigned ) {

        sessionStore.canProceed = false

        if(!deviceStore.hasDevice) {
            navigateTo('/register')
            return;
        }
    }

    sessionStore.canProceed = true

    if(sessionStore.canProceed) {
        sessionStore.startSession()
        console.log('session started')
    }

})