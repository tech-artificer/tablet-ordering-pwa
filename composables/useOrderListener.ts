// composables/useOrderListener.ts
import { ref, onUnmounted } from 'vue'
import { useNuxtApp } from '#app'
import { useOrderStore } from '~/stores/Order'
import { useCartStore } from '~/stores/Cart'
// import { useGuestStore } from '@/stores/Guest'

export const useOrderListener = () => {

  const { $echo } = useNuxtApp()
  const orderStore = useOrderStore()
  const cartStore = useCartStore()
//   const guestStore = useGuestStore()

  const activeChannel = ref<string | null>(null)

  function setupOrderListening(orderId: number) {
    if (!orderId) return

    const channelName = `orders.${orderId}`

    // Leave old channel if switching
    if (activeChannel.value && activeChannel.value !== channelName) {
      console.log(`🔌 Leaving channel: ${activeChannel.value}`)
      $echo.leave(activeChannel.value)
    }

    // Already subscribed? skip
    if (activeChannel.value === channelName) {
      console.log(`⏩ Already listening to ${channelName}`)
      return
    }

    console.log(`📡 Subscribing to ${channelName}`)
    activeChannel.value = channelName

    $echo
      .channel(channelName)
      .listen('.order.created', (e: any) => handleOrderCreated(e))
      .listen('.order.confirmed', (e: any) => handleOrderUpdate(e))
      .listen('.order.completed', (e: any) => handleOrderUpdate(e))
      .listen('.order.voided', (e: any) => handleOrderUpdate(e))
      .listen('.order.cancelled', (e: any) => handleOrderUpdate(e))
      .error((err: any) => console.error('❌ Echo error:', err))
  }

  function handleOrderCreated(event: any) {
    console.log('✅ Order created:', event)
    if (!event?.order) return
    orderStore.current = event.order
//     cartStore.orderStatus = event.order.status
//     cartStore.cartStatus = true
  }

  function handleOrderUpdate(event: any) {
    console.log('📨 Order update received:', event)
    if (!event?.order) return

    const order = event.order
    orderStore.current = order
    // cartStore.orderStatus = order.status
    if( order.status.includes('created') ) {
        
    }

    if (shouldReturnToWelcome(order.status)) {
      transitionToWelcome()
    }
  }

  function shouldReturnToWelcome(status: string | undefined) {
    if (!status) return false
    const normalized = status.toLowerCase()
    return ['complete', 'completed', 'void', 'voided', 'cancel', 'cancelled'].some(s =>
      normalized.includes(s)
    )
  }

  function transitionToWelcome(delay = 2000) {
    ElNotification({
      title: 'Session Completed',
      message: 'Returning to Welcome',
      type: 'info',
    })
    setTimeout(() => {
      resetStores()
      navigateTo('/')
    }, delay)
  }

  function resetStores() {
    activeChannel.value && $echo.leave(activeChannel.value)
    activeChannel.value = null
    orderStore.$reset()
    cartStore.$reset()
  }

  onUnmounted(() => {
    if (activeChannel.value) {
      console.log(`🧹 Cleaning up channel: ${activeChannel.value}`)
      $echo.leave(activeChannel.value)
      activeChannel.value = null
    }
  })

  return {
    setupOrderListening,
    resetStores,
  }
}
