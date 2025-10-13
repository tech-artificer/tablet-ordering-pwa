import { defineStore } from 'pinia'
import type { Device, Table } from '~/types/index'

export const useDeviceStore = defineStore('device', {
    state: () => ({

        device: {} as Device,
        code: '' as string | number | null,
        table:{} as Table,
        token: null as string | null,
        expiration: null as number | string | null,
        isLoading: false as boolean,
        errorMessage: null as string | null,
        showDeviceRegistration: false as boolean,
    }),

    getters: {
        hasDevice: (state: any) => {
            return state.token
        },
        getTableAssigned: (state: any) => state.table.name,
        getDeviceToken: (state: any) => state.token,

    },

    actions: {

        async authenticate() {
            this.isLoading = true
            try {
                const { token, device, table, expires_at, error } = await useMainApiAuth('/api/devices/login', {
                    method: 'GET',
                })

            
                // backend returns { token, device }
               
                if (device && token) {
                    this.device = device
                    this.token = token
                    this.table = table
                    this.expiration = expires_at
                    this.showDeviceRegistration = false
                    this.isLoading = false

                    // ElNotification({
                    //     title: 'Success',
                    //     message: error,
                    //     type: 'success',
                    // })

                    navigateTo('/')

                    // ;(this as any).clearData()
                } else {
                    // defensive: mark as missing device to trigger registration
                    this.showDeviceRegistration = true
                    this.isLoading = false
                    //  ElNotification({
                    //     title: 'Success',
                    //     message: error,
                    //     type: 'success',
                    // })

                }

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },

        async register(formData: any) {
            this.isLoading = true
            try {
                const { token, device, table, expires_at } = await useMainApiAuth('/api/devices/register', {
                    method: 'POST',
                    // ofetch expects serializable body; stringify to satisfy TS BodyInit
                    body: JSON.stringify(formData),
                })

                this.device = device
                this.token = token
                this.table = table
                this.expiration = expires_at

                // ElNotification({
                //     title: 'Registration Complete',
                //     message: 'You can now begin your K-BBQ experience',
                //     type: 'success',
                // })

                // ; (this as any).clearData()
                this.showDeviceRegistration = false
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                const err = error as any
                this.errorMessage = String(err?.message ?? err)
                if (err) {
                    if (err.response?._data?.errors) {
                        this.errorMessage = err.response._data.errors
                    } else {
                        this.errorMessage = err.response?._data?.message ?? this.errorMessage
                    }
                    ElNotification({
                        title: 'Error',
                        message: this.errorMessage,
                        type: 'error',
                    } as object)
                }
            }
        },

        async refresh() {

            try {
                const { token, device, table, expires_at } = await useMainApiAuth('/api/devices/refresh', {
                    method: 'GET',

                })
                // backend returns { token, device }
                if (token && device) {
                    console.log('refresh token', token)
                    this.device = device
                    this.token = token
                    this.table = table
                    this.expiration = expires_at

                } else {

                    ElNotification({
                        title: 'Error',
                        message: 'Authentication Failed',
                        type: 'error',
                    })

                    // defensive: mark as missing device to trigger registration
                    this.showDeviceRegistration = true
                    this.isLoading = false
                }

                console.log('rehydrated device', this.table)

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },
    },

    persist: {
        key: 'device-store',
        storage: localStorage,
        pick: ['device', 'token', 'expiration', 'table'],
    }
})
