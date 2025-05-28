import { defineStore } from "pinia"

export const useConnectionStatus = defineStore('connection-status', {
    state: () => ({
        isOnline: navigator.onLine,
        showNotification: false,
        offlineProgress: 0,
        progressInterval: null
    }),
    actions: {
        updateOnlineStatus() {
            const wasOffline = !this.isOnline
            this.isOnline = navigator.onLine
            this.showNotification = true

            setTimeout(() => {
                this.showNotification = false
            }, 3000)

            if (!this.isOnline) {
                this.startOfflineProgress()
            } else {
                this.stopOfflineProgress()
                if (wasOffline) {
                    this.showConnectedNotification()
                }
            }
        },

        startOfflineProgress() {
            this.offlineProgress = 0
            this.progressInterval = setInterval(() => {
                this.offlineProgress = (this.offlineProgress + 1) % 101
            }, 100)
        },

        stopOfflineProgress() {
            if (this.progressInterval) {
                clearInterval(this.progressInterval)
                this.progressInterval = null
            }
            this.offlineProgress = 0
        },

        showConnectedNotification() {
            this.showNotification = true
            setTimeout(() => {
                this.showNotification = false
            }, 3000)
        }
    }
})
