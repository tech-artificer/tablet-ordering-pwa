import { defineStore } from "pinia"

export const useConnectionStatus = defineStore('connection-status', {
    state: () => ({
        isOnline: navigator.onLine,
        isReallyOnline: navigator.onLine,
        showNotification: false,
        offlineProgress: 0,
        progressInterval: null
    }),

    actions: {
        async checkInternet() {
            try {
                await fetch('https://www.google.com/favicon.ico', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    cache: 'no-cache'
                })
                return true
            } catch {
                return false
            }
        },

        async updateOnlineStatus() {
            const wasReallyOnline = this.isReallyOnline
            this.isOnline = navigator.onLine

            if (this.isOnline) {
                this.isReallyOnline = await this.checkInternet()
            } else {
                this.isReallyOnline = false
            }
            if (wasReallyOnline !== this.isReallyOnline) {
                this.showNotification = true
                setTimeout(() => {
                    this.showNotification = false
                }, 3000)
            }

            if (!this.isReallyOnline) {
                this.startOfflineProgress()
            } else {
                this.stopOfflineProgress()
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
        }
    }
})
