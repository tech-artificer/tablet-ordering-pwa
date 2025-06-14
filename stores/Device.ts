import { defineStore } from 'pinia'

interface DeviceInformation {
    name: string,
    branch_id: number,
    table_id: number | null,
    device_uuid: string,
    updated_at: string,
    created_at: string,
    id: number
}
interface DeviceParams {
    name: string,
    code: string,
    app_version: string,
    last_ip_address: string,
}
interface Device {
    token: string,
    device: DeviceInformation,
    isLoading: boolean,
}

export const useMyDeviceStore = defineStore('device', {
    state: () => ({
        device: {} as Device,
        deviceParams: {
            name: '',
            code: '',
            app_version: '',
            last_ip_address: '',
        } as DeviceParams,
        isLoading: false as boolean,
        errorMessage: null as string | null,
        showDeviceRegistration: false as boolean,
    }),

    getters: {
        hasDevice: (state) => {
            return state.device.token ? true : false
        }
    },

    actions: {
        async registerDevice() {
            this.isLoading = true
            try {
                const response = await useMainApiO('/api/devices/register', {
                    method: 'POST',
                    body: this.deviceParams,
                })
                this.device = response
                ElNotification({
                    title: 'Success',
                    message: 'Device registered successfully',
                    type: 'success',
                })
                this.showDeviceRegistration = false
                this.clearData()
                this.showDeviceRegistration = false
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error
                if (error.response) {
                    if (error.response._data.errors) {
                        this.errorMessage = error.response._data.errors
                    } else {
                        this.errorMessage = error.response._data.message
                    }
                    ElNotification({
                        title: 'Error',
                        message: this.errorMessage,
                        type: 'error',
                    })
                }
            }
        },
        async getIPAddress() {
            const response = await fetch('https://api.ipify.org?format=json')
            const data = await response.json()
            return data.ip
        },
        async clearData() {
            this.deviceParams = {
                name: '',
                code: '',
                app_version: '',
                last_ip_address: '',
            }
            this.errorMessage = null
        }
    },

    persist: {
        key: 'device-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['device', 'deviceParams', 'showDeviceRegistration'],
    }
})
