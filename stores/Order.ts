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
        isLoading: false as boolean,
    }),
    actions: {
        exampleData () {
            this.isLoading = true
            const ordersExample = [
                {
                    id: 1,
                    details: [
                        {
                            id: 1,
                            name: 'Spring Rolls',
                            price: 199.99,
                            quantity: 1,
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 2,
                            name: 'Beef Bulgogi',
                            price: 459.99,
                            quantity: 1,
                            image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 3,
                            name: 'Sushi Platter',
                            price: 899.99,
                            quantity: 1,
                            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
                        }
                    ],
                    total: 1379.97,
                    tax: 0,
                    subTotal: 1379.97,
                    date: '2025-06-01',
                    status: OrderStatus.IN_PROGRESS
                },
                {
                    id: 2,
                    details: [
                        {
                            id: 1,
                            name: 'Spring Rolls',
                            price: 199.99,
                            quantity: 1,
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 2,
                            name: 'Beef Bulgogi',
                            price: 459.99,
                            quantity: 1,
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        }
                    ],
                    total: 1379.97,
                    tax: 0,
                    subTotal: 1379.97,
                    date: '2025-06-02',
                    status: OrderStatus.COMPLETE
                }
            ]
            this.orders = ordersExample
            this.isLoading = false
        }
    },
    persist: {
        key: 'order-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['orders'],
    }
})
