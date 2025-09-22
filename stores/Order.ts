// stores/order.ts
import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'
import type { Device, DeviceOrder } from '~/types';

export interface OrderResponse {
  id: number
  order_id: string
  order_number: string
  device_id: any // refine later if you want strong typing
  order: any
  status: string
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    current: {} as OrderResponse,
    currentOrderId: null as string | number | null,
    history: [] as DeviceOrder[],
    drawerOpen: false,
    // isListening: false,
  }),

  getters: {
    hasOrder: (state) => !!state.current,
  },

  actions: {
    // setOrder(order: DeviceOrder) {
    //   // this.current.value = order
    //   this.currentOrderId = order.order_id

    //   if (order?.order_id) {
    //     this.listenToOrder(order.order_id)
    //   }

    //   this.history.unshift(order)
    //   this.drawerOpen = true // 👈 auto-open drawer
    // },

  //  listenToOrder(orderId: string | number) {
  //     if (!orderId) return

  //     const { $echo } = useNuxtApp() // 👈 safe access inside action

  //     if (this.currentOrderId && this.currentOrderId !== orderId) {
  //       console.log(`Leaving channel: orders.${this.currentOrderId}`)
  //       $echo.leave(`orders.${this.currentOrderId}`)
  //     }

  //     this.currentOrderId = orderId
  //     console.log(`Listening to channel: orders.${orderId}`)

  //     $echo
  //       .channel(`orders.${orderId}`)
  //       .listen('.order.created', (e: DeviceOrder) => this.handleOrderUpdate(e))
  //       .listen('.order.completed', (e: DeviceOrder) => this.handleOrderUpdate(e))
  //       .listen('.order.voided', (e: DeviceOrder) => this.handleOrderUpdate(e))
  //       .listen('.order.cancelled', (e: DeviceOrder) => this.handleOrderUpdate(e))
  //       .error((error: any) => {
  //         console.error('❌ Error connecting to order channel:', error)
  //       })

  //     this.isListening = true
  //   },

    // handleOrderUpdate(event: any) {
    //   console.log('📢 Order update received:', event)

    //   if (!event?.order) return
    //   this.setOrder(event.order)

    //   const status = event.order?.status?.toLowerCase()

    //   if( status.includes('created') ) {
    //     this.current = event.order
    //     console.log('current order', this.current)
    //   }

    //   if (status?.includes('completed') || status?.includes('void') || status?.includes('cancel')) {
    //     this.transitionToWelcome()
    //   }
    // },

    // transitionToWelcome(delay = 2000) {
    //   console.log('⏳ Returning to welcome screen...')
    //   setTimeout(() => {
    //     this.reset()
    //     navigateTo('/')
    //   }, delay)
    // },

    // reset() {
    //   const { $echo } = useNuxtApp()

    //   if (this.currentOrderId) {
    //     $echo.leave(`orders.${this.currentOrderId}`)
    //   }
    //   this.currentOrderId = null
    //   this.current = {} as OrderResponse
    //   this.isListening = false
    // },

    closeDrawer() {
      this.drawerOpen = false
    },
  },

  persist: {
    key: 'order-store',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['current', 'history', 'drawerOpen'],
  },
})
