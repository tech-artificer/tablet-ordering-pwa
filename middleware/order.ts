import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useOrderStore } from '@/stores/Order'

export default defineNuxtRouteMiddleware((to) => {
    // Use the order store as source of truth
    const orderStore = useOrderStore()

    // Example logic:
    // - If there are orders, ensure user can see the orders page
    // - If no orders and user is on /orders, redirect to home

    const hasOrders = Array.isArray(orderStore.orders) && orderStore.orders.length > 0

    // Avoid redirect loops
    if (hasOrders && to.path !== '/orders') {
        return navigateTo('/orders')
    }

    if (!hasOrders && to.path === '/orders') {
        return navigateTo('/')
    }

    // Otherwise continue
})
