import { defineStore } from 'pinia'
import type {  Device, DeviceParams, DeviceLoginParams } from '~/types/index'

export const useMyDeviceStore = defineStore('device', {
    state: () => ({
        device: {} as Device,
        deviceLoginParams: {
            device_uuid: '',
        } as DeviceLoginParams,
        deviceParams: {
            name: '',
            code: '',
            app_version: '',
            last_ip_address: '',
        } as DeviceParams,
        oldUUID: '',
        token: null as string | null,
        isLoading: false as boolean,
        errorMessage: null as string | null,
        showDeviceRegistration: false as boolean,
    }),

    getters: {
        hasDevice: (state) => {
            return state.device.token ? true : false
        },

        getTableAssigned: (state) => state.device.table.name,


    },

    actions: {
        async checkDevice () {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/devices/login', {
                    method: 'GET',

                })
                // backend returns { token, device }
                if (response && response.token) {
                    this.device = response
                    this.oldUUID = this.deviceLoginParams.device_uuid
                    this.showDeviceRegistration = false
                    this.isLoading = false
                    ;(this as any).clearData()
                } else {
                    // defensive: mark as missing device to trigger registration
                    this.showDeviceRegistration = true
                    this.isLoading = false
                }

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },
        async registerDevice() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/devices/register', {
                    method: 'POST',
                    // ofetch expects serializable body; stringify to satisfy TS BodyInit
                    body: JSON.stringify(this.deviceParams),
                })
                this.device = response
                ElNotification({
                    title: 'Success',
                    message: 'Device registered successfully',
                    type: 'success',
                })
                ;(this as any).clearData()
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
                const response = await useMainApiAuth('/api/devices/login', {
                    method: 'GET',

                })
                // backend returns { token, device }
                if (response && response.token) {
                    console.log('refresh token', response)
                    this.device = response
                } else {
                    // defensive: mark as missing device to trigger registration
                    this.showDeviceRegistration = true
                    this.isLoading = false
                }

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },
        async clearData() {
            this.deviceLoginParams = {
                device_uuid: '',
            }
            this.deviceParams = {
                name: '',
                code: '',
                app_version: '',
                last_ip_address: '',
            }
            this.errorMessage = null
        }
    },

    persist: ({
        key: 'device-store',
        storage: import.meta.client ? localStorage : undefined,
        pick: ['device', 'deviceParams', 'showDeviceRegistration', 'oldUUID'],
    } as any)
})
