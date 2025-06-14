import { defineStore } from 'pinia'

interface Cart {
    id: number,
    name: string,
    description: string,
    price: number,
    quantity: number,
    image: string
}

interface OrderParams {
    device_id: number | null,
    user_id: number | null,
    guest_count: number | null,
    notes: string | null,
    total_amount: number | null,
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        cartItems: [] as Array<Cart>,
        isLoading: false,
        vatRate: 0.12,
        orderParams: {
            device_id: null,
            user_id: null,
            guest_count: null,
            notes: null,
            total_amount: null,
        } as OrderParams,
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
        async confirmOrder() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/orders', {
                    method: 'POST',
                    body: this.orderParams,
                })
                this.order = response
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error
                if (error.response) {
                    if (error.response._data.errors) {
                        this.errorMessage = error.response._data.errors
                    } else {
                        this.errorMessage = error.response._data.message
                    }
                }
            }
        },
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
