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
        isLoading: false,
        vatRate: 0.12
    }),
    getters: {
        hasCartItems: (state) => {
            return state.cartItems && state.cartItems.length > 0
        },
        totalItems: (state) => {
            return state.cartItems.length
        },
        subTotal: (state) => {
            return state.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        },
        vat: (state) => {
            return Math.round((state.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) * state.vatRate) * 100) / 100
        },
        total(): number {
            return this.subTotal + this.vat
        }
    },
    actions: {
        addToCart(item: Omit<Cart, 'quantity'> & { quantity?: number }) {
            const existingItem = this.cartItems.find(cartItem => cartItem.id === item.id)
            const quantityToAdd = item.quantity || 1

            if (existingItem) {
                existingItem.quantity += quantityToAdd
            } else {
                this.cartItems.push({
                    ...item,
                    quantity: quantityToAdd
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
        },

        formatPrice(price: number): string {
            return new Intl.NumberFormat('en-PH', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(price)
        }
    },
    persist: {
        key: 'cart-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['cartItems'],
    }
})
