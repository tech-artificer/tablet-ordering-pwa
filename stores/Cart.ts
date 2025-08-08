import { defineStore } from 'pinia'

interface Cart {
    id: number,
    menu_id: number,
    name: string,
    description: string,
    price: number,
    quantity: number,
    image: string,
    tax_amount: number
}

interface OrderParams {
    guest_count: number | null,
    note: string | null,
    total_amount: number | null,
    items: Array<Cart>,
}

export const useCartStore = defineStore('cart', {
    state: () => ({
        errorMessage: "" as string,
        cartItems: [] as Array<Cart>,
        isLoading: false,
        vatRate: 0.12,
        cartStatus: false,
        orderStatus: null,
        order: null,
        orderParams: {
            guest_count: null,
            note: null,
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
            return state.cartItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
        },
        total(): number {
            return this.subTotal
        }
    },
    actions: {
        async confirmOrder() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/devices/create-order', {
                    method: 'POST',
                    body: this.orderParams,
                })
                this.order = response
                this.isLoading = false
            } catch (error: any) {
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
                minimumFractionDigits: 2,
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
