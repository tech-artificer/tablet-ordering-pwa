import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useOrderStore } from '~/stores/Order'
import { useCartStore } from '~/stores/Cart'
import { useDeviceStore } from '~/stores/Device'


export default defineNuxtRouteMiddleware((to, from) => {
    // Use the order store as source of truth
    const orderStore = useOrderStore()
    const cart = useCartStore() 
    const deviceStore = useDeviceStore()

    // if (!deviceStore.hasDevice) {
    //     deviceStore.checkDevice()
    // }

    console.log('device', deviceStore)
    
    // const order = orderStore.order

    // if( !deviceStore.hasDevice ) {
    //     return navigateTo('/register')
    // }


    // console.log('device', deviceStore.hasDevice)
    // if( order.guest_count === 0 && to.path !== '/guestCount' ) {
        
    // }


    // if (!order.orderedPackage?.name && to.path !== '/') {
    //     console.log('welcome')
    //     return navigateTo('/')
    // }

    // console.log(!order.orderedPackage?.name && from.path == '/woosoo/menu' && to.path == '/')

    // if (!order.orderedPackage?.name && from.path == '/woosoo/menu' && to.path == '/') {
        // console.log('cartstatus', cartStore.cartStatus)
    //     return navigateTo('/')
    // }

    // if (order.orderedPackage?.name && to.path === '/') {
    //     return navigateTo('/woosoo/menu')
    // }
    // cartStore.$reset()
    // orderStore.$reset()

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
