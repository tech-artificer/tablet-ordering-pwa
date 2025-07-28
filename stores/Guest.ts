import { defineStore } from 'pinia'

export const useGuestStore = defineStore('guest', {
    state: () => ({
        count: 1,
    }),
    actions: {},
    persist: {
        key: 'guest-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['count'],
    },
} as object)
