import { defineStore } from 'pinia'

export const useGuestStore = defineStore('guest', {
    state: () => ({
        count: 1,
    }),
    actions: {
        setGuest(count: number) {
            this.count = count
        },
    },
    persist: {
        key: 'guest-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['count'],
    },
} as object)
