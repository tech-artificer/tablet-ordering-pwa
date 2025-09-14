import { defineStore } from 'pinia'
import type { Order } from '~/types/index'
// export interface Order {
//     id: number,
//     details: Array<OrderItem>
//     total: number,
//     tax: number,
//     guest_count: number,
//     subTotal: number,
//     date: string
// }
export interface OrderItem {
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
        pick: ['orders', 'current_order'],
    }
    
})
