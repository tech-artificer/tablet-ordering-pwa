// stores/errorDialog.ts
import { defineStore } from 'pinia'

export const useErrorDialogStore = defineStore('errorDialog', {
  state: () => ({
    visible: false,
    message: '' as string,
    retrying: false,
    attempts: 0
  }),
  actions: {
    show(msg: string) {
      this.message = msg
      this.visible = true
    },
    hide() {
      this.visible = false
      this.message = ''
      this.retrying = false
      this.attempts = 0
    },
    startRetry() {
      this.retrying = true
      this.attempts++
    },
    stopRetry() {
      this.retrying = false
    }
  }
})