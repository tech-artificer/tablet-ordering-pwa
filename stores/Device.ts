import { defineStore } from 'pinia'

interface Device {
    uuid: string,
    name: string,
    token: string,
    browser: string,
    is_active: boolean,
    last_active_at: string,
}

export const useMyDeviceStore = defineStore('device', {
    state: () => ({
        device: {} as Device,
        isLoading: false as boolean,
    }),

    getters: {
        hasDevice: (state) => {
        return state.device && Object.keys(state.device).length > 0 && state.device.uuid
        }
    },

    actions: {
        async ensureDevice(deviceData?: Partial<Device>) {
        if (this.hasDevice) {
            console.log('Valid device found in persisted state:', this.device)
            return this.device
        }
        console.log('No valid device found, creating new device...')
        if (deviceData) {
            this.device = { ...this.device, ...deviceData } as Device
        }
        await this.storeDevice()
            return this.device
        },
        async storeDevice() {
            if (!this.device || Object.keys(this.device).length === 0) {
                throw new Error('No device data to store')
            }
            this.isLoading = true
            try {
                const { data } = await useMainApi('/api/devices', {
                    method: 'POST',
                    body: this.device,
                })
                this.device = data
                console.log('Device stored successfully:', this.device)
            } catch (error) {
                console.error('Error storing device:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
        updateDevice(updates: Partial<Device>) {
            this.device = { ...this.device, ...updates } as Device
        },
        clearDevice() {
            this.device = {} as Device
        }
    },

    persist: {
        key: 'device-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['device'],
    }
})
