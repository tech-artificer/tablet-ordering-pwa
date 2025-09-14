import { defineStore } from 'pinia'

export const useGuestStore = defineStore('guest', {
    state: () => ({
        count: 0,
    }),
    actions: {
        setGuest(count: number) {
            return this.count = count
        },
    },
    persist: {
        key: 'guest-store',
        storage: import.meta.client ? localStorage : undefined,
        pick: ['count'],
    },
})
