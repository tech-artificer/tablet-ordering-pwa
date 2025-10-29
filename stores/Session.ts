// stores/Session.ts
import { defineStore } from 'pinia'
import { useOrderStore } from '~/stores/Order'
import { useCartStore } from '~/stores/Cart'
import { useDeviceStore } from '~/stores/Device'
import { ElNotification } from 'element-plus'

export const useSessionStore = defineStore('session', {
    state: () => ({
        sessionId: null as number | null,
        dateOpened: null as string | null,
        dateClosed: null as string | null,
        canProceed: false as boolean
    }),

    getters: {
        sessionOpened: (state) => state.dateClosed == null,
    },

    actions: {

        init() {
            this.getLatestSession()
        },

        startSession() {
            this.init()

            useOrderStore().$reset()
            useCartStore().$reset() 
        },

        endSession() {
            navigateTo('/')
        },

        async getLatestSession() {

            try {
                const { session, error } = await useMainApiAuth('/api/session/latest', {
                    method: 'GET',
                })

                console.log('Session Error -', error)
                this.sessionId = Number(session.id) || session.id
                this.dateOpened = session.date_time_opened
                this.dateClosed = session.date_time_closed
                
                if( this.dateClosed == null) {
                    this.canProceed = true
                }

            } catch (error: any) {
                this.canProceed = false

                ElNotification({
                    title: 'Warning',
                    message: 'Error Fetching Latest Session',
                    type: 'warning',
                })

                console.log('Error Fetching Latest Session:')
            }
        },
    },

    persist: {
        key: 'session-store',
        storage: localStorage,
        pick: ['sessionId', 'dateOpened', 'dateClosed', 'canProceed'],
    },
})
