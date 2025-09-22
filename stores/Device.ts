import { defineStore } from 'pinia'
import type { Device } from '~/types/index'

export const useDeviceStore = defineStore('device', {
    state: () => ({

        device: {} as Device,
        code: '' as string | number | null,
        table : {} as any,
        // deviceLoginParams: {
        //     device_uuid: '',
        // } as DeviceLoginParams,
        // table: {} as Table,
        // deviceParams: {
        //     name: '',
        //     code: '',
        //     app_version: '',
        //     last_ip_address: '',
        // } as DeviceParams,
        // oldUUID: '',
        token: null as string | null,
        expiration: null as number | string | null,
        isLoading: false as boolean,
        errorMessage: null as string | null,
        showDeviceRegistration: false as boolean,
    }),

    getters: {
        hasDevice: (state) => {
            return state.token
        },
        getTableAssigned: (state) => state.device.table.name,
        getDeviceToken: (state) => state.token,

    },

    actions: {

        async checkDevice() {
            this.isLoading = true
            try {
                const { token, device, expires_at } = await useMainApiAuth('/api/devices/login', {
                    method: 'GET',
                })
                this.$reset()
                // backend returns { token, device }


                if (device && token) {
                    this.device = device
                    this.token = token
                    this.table = device.table
                    this.expiration = expires_at
                    // this.oldUUID = this.deviceLoginParams.device_uuid
                    this.showDeviceRegistration = false
                    this.isLoading = false

                    ElNotification({
                        title: 'Success',
                        message: 'Device logged in successfully',
                        type: 'success',
                    })

                    navigateTo('/')

                    // ;(this as any).clearData()
                } else {
                    // defensive: mark as missing device to trigger registration
                    this.showDeviceRegistration = true
                    this.isLoading = false


                }

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },
        async register(formData: any) {
            this.isLoading = true
            try {
                const { token, device, expires_at } = await useMainApiAuth('/api/devices/register', {
                    method: 'POST',
                    // ofetch expects serializable body; stringify to satisfy TS BodyInit
                    body: JSON.stringify(formData),
                })

                this.device = device
                this.token = token
                this.table = device.table
                this.expiration = expires_at

                ElNotification({
                    title: 'Registration Complete',
                    message: 'You can now begin your K-BBQ experience',
                    type: 'success',
                })

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

        async authenticate() {

            try {
                const { token, device, table, expires_at } = await useMainApiAuth('/api/devices/login', {
                    method: 'GET',

                })
                // backend returns { token, device }
                if (token && device) {
                    console.log('refresh token', token)
                    this.device = device
                    this.token = token
                    this.table = table
                    this.expiration = expires_at

                    console.log('refreshed device', this.device)

                  console.log('refreshed table', this.table)

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
        async clearData() {
            this.$reset()
            // this.deviceLoginParams = {
            //     device_uuid: '',
            // }
            // this.deviceParams = {
            //     name: '',
            //     code: '',
            //     app_version: '',
            //     last_ip_address: '',
            // }
            this.errorMessage = null
        }
    },

    persist: {
        key: 'device-store',
        storage: localStorage,
        pick: ['device', 'token', 'expiration', 'table'],
    }
})
