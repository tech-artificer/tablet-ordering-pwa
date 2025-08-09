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
interface DeviceLoginParams {
    device_uuid: string,
}
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
        async checkDevice () {
            this.isLoading = true
            try {
                const response = await useMainApiO('/api/devices/login', {
                    method: 'GET',
                })
                this.device = response
                this.oldUUID = this.deviceLoginParams.device_uuid
                this.showDeviceRegistration = false
                this.isLoading = false
                this.clearData()

            } catch (error: any) {
                this.showDeviceRegistration = true
            }
        },
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
                this.clearData()
                this.showDeviceRegistration = false
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error as string
                if (error as any) {
                    if (error?.response._data.errors) {
                        this.errorMessage = error?.response._data.errors
                    } else {
                        this.errorMessage = error?.response._data.message
                    }
                    ElNotification({
                        title: 'Error',
                        message: this.errorMessage,
                        type: 'error',
                    } as object)
                }
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

    persist: {
        key: 'device-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['device', 'deviceParams', 'showDeviceRegistration', 'oldUUID'],
    }
})
