// ~/stores/ErrorDialog.js (or similar path)

import { defineStore } from 'pinia'

export const useErrorDialogStore = defineStore('errorDialog', {
  state: () => ({
    // 1. STATE: Controls visibility
    isVisible: false,
    // 2. STATE: Controls content
    message: '',
    title: 'Error',
  }),
  actions: {
    // ACTION: Called from the middleware/plugin
    show(message: string, title = 'Connection Error') {
      this.message = message
      this.title = title
      this.isVisible = true // <--- Set the state to true
    },
    // ACTION: Called from the dialog component's close button
    hide() {
      this.isVisible = false // <--- Set the state back to false
      this.message = ''
    },
  },

  persist: {
    key: 'error-dialog-store',
    storage: localStorage,
    pick: ['isVisible', 'message', 'title'],
  },
})