import { defineNuxtRouteMiddleware } from '#app'
import { useOrderStore } from '~/stores/Order'
import { useCartStore } from '~/stores/Cart'
import { useDeviceStore } from '~/stores/Device'
import { useSessionStore } from '~/stores/Session'


export default defineNuxtRouteMiddleware((to, from) => {
    // Use the order store as source of truth
    const orderStore = useOrderStore()
    const cartStore = useCartStore() 
    const deviceStore = useDeviceStore()
    const sessionStore = useSessionStore()

    console.log('order', orderStore)
    console.log('cart', cartStore)
    console.log('device', deviceStore)
    console.log('session', sessionStore)

    // if( deviceStore.getDeviceToken )

    // console.log('device', deviceStore.getDeviceToken)
    // if( !deviceStore.getTableAssigned ) {
    //     // deviceStore.authenticate()
    // }


    // console.log('table', deviceStore.getTableAssigned)
    
    // Example logic:
    // - If there are orders, ensure user can see the orders page
    // - If no orders and user is on /orders, redirect to home
   
    // const cartItems = cartStore.cartItems
    // const cart = cartStore
    // const order = Array.isArray(orderStore.order) && orderStore.order.length > 0
    // console.log('Order:', order)

    // console.log('Cart Items:', cart)

    // console.log('Cart:')

    // if( order ) {
    //    if( \ > 0 ) {
           
    //    }
    // }


    // Avoid redirect loops
    // if (hasOrder && to.path !== '/orders') {
    //     return navigateTo('/orders')
    // }

    // if (!hasOrder && to.path === '/orders') {
    //     return navigateTo('/')
    // }

    // Otherwise continue
})
