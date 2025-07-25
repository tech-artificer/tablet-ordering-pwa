import { defineStore } from 'pinia'
interface Order {
    id: number,
    details: Array<OrderItem>
    total: number,
    tax: number,
    subTotal: number,
    date: string
}
interface OrderItem {
    id: number,
    name: string,
    price: number,
    quantity: number,
    image: string
}
export const useOrderStore = defineStore('order', {
    state: () => ({
        orders: [] as Array<Order>,
        current_order: null as Order | null,
        isLoading: false as boolean,
    }),
    actions: {
    },
    persist: {
        key: 'order-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['orders', 'current_order'],
    }
})
