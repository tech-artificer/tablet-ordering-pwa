import { defineStore } from 'pinia'

interface Cart {
    id: number,
    name: string,
    description: string,
    price: number,
    quantity: number,
    image: string
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        cartItems: [] as Array<Cart>,
        subTotal: 0,
        tax: 0,
        total: 0,
        isLoading: false,
    }),
    getters: {
        hasCartItems: (state) => {
            return state.cartItems && state.cartItems.length > 0
        },
        totalItems: (state) => {
            return state.cartItems.reduce((sum, item) => sum + item.quantity, 0)
        }
    },
    actions: {
        addToCart(item: Omit<Cart, 'quantity'>) {
            const existingItem = this.cartItems.find(cartItem => cartItem.id === item.id)

            if (existingItem) {
                existingItem.quantity += 1
            } else {
                this.cartItems.push({
                    ...item,
                    quantity: 1
                })
            }
        },

        updateQuantity(itemId: number, quantity: number) {
            const item = this.cartItems.find(cartItem => cartItem.id === itemId)
            if (item) {
                item.quantity = quantity
            }
        },

        removeFromCart(itemId: number) {
            const index = this.cartItems.findIndex(cartItem => cartItem.id === itemId)
            if (index > -1) {
                this.cartItems.splice(index, 1)
            }
        },

        clearCart() {
            this.cartItems = []
        },

        decreaseQuantity(itemId: number) {
            const item = this.cartItems.find(cartItem => cartItem.id === itemId)
            if (item) {
                if (item.quantity > 1) {
                    item.quantity -= 1
                } else {
                    this.removeFromCart(itemId)
                }
            }
        }
    },
    persist: {
        key: 'cart-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['cartItems'],
    }
})
