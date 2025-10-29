// stores/cart.ts
import { defineStore } from 'pinia'
import type { CartItem } from '~/types'
import { useOrderStore } from './Order'
import { useDeviceStore } from './Device'


export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    isOpen: false,
    packageSelected: {
      id: 0,
      name: '',
      price: 0,
      receipt_name: '',
      img_url: '',
      modifiers: [] as CartItem[],
    } as CartItem,
    guestCount: 2, // Default to 2 guests

  }),

  getters: {

    totalItems: (state): number => state.items.map(i => i.price * i.quantity).reduce((sum, i) => sum + i, 0),

    // cartItems: (state): CartItem[] => state.items,

    cartItems(): CartItem[] {
      const base = [...this.items]
      if (this.packageSelected) {
        const pkgIndex = base.findIndex(i => i.id === this.packageSelected?.id)
        if (pkgIndex >= 0) {
          base[pkgIndex].quantity = this.guestCount
        } else {
          base.unshift({
            ...this.packageSelected,
            quantity: this.guestCount,
          })
        }
      }
      return base
    },

    // subtotal: (state): number => state.cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
    // vat: (state): number => state.items.reduce((sum, i) => sum + (i.tax_amount), 0),

    // total() : number {
    //   return this.subtotal + this.vat
    // }
    subtotal: (state): number =>
      state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      + (state.packageSelected?.price || 0) * state.guestCount,


    vat: (state): number =>
      state.items.reduce((sum, i) => {
        const tax = Number(i.tax_amount) || 0 // convert string → number, fallback 0
        return sum + tax
      }, 0) + (Number(state.packageSelected.tax_amount) || 0),

    discount: (state) => 0,

    total(): number {
      return this.subtotal + this.vat - this.discount
    }

    // vat: (cartItems: CartItem[]) =>
    //   cartItems.reduce((sum, item) => sum + item.tax_amount, 0),


  },

  actions: {


    setPackage(pkg: CartItem) {
      this.packageSelected = pkg
    },

    add(item: CartItem) {
      if (this.packageSelected?.id === item.id) {
        // don’t let users add package like a normal item
        this.guestCount++
        return
      }

      const existing = this.items.find(i => i.id === item.id)
      if (existing) {
        existing.quantity++
      } else {
        this.items.push({ ...item, quantity: 1 })
      }
    },

    updateQuantity(id: number, quantity: number) {
      if (this.packageSelected?.id === id) {
        this.guestCount = Math.max(1, quantity) // package quantity always tied to guest count
        return
      }

      const existing = this.items.find(i => i.id === id)
      if (existing) {
        existing.quantity = quantity
        if (existing.quantity <= 0) this.remove(id)
      }
    },

    remove(id: number) {
      if (this.packageSelected?.id === id) {
        this.packageSelected = {} as CartItem
        return
      }
      this.items = this.items.filter(i => i.id !== id)
    },

    clear() {
      this.items = []
      this.isOpen = false
      this.packageSelected = {} as CartItem
      this.guestCount = 2
    },

    // setGuestCount(count: number) {
    //   this.guestCount = Math.max(1, Math.min(20, count)) // Min 1, Max 20
    // },

    toggleCart() {
      this.isOpen = !this.isOpen
    },

    async placeOrder() {
      
      try {

        const payload = {
          guest_count: this.guestCount,
          subtotal: this.subtotal,
          tax: this.vat,
          discount: this.discount,
          total_amount: this.total,
          items: this.cartItems.map((item) => ({
            menu_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
            tax: (item.tax_amount * item.quantity),
            discount: 0,
          })),
        }

        const response = await useMainApiAuth('/api/devices/create-order', {
          method: 'POST',
          body: payload,
        })

        const order = useOrderStore()

        const { current, currentOrderId } = storeToRefs(order)
        current.value = response.order
        currentOrderId.value = response.order.order_id

        console.log('Order placed successfully:', response) 

        // order.setOrder(response.order) 
        // reset
      } catch (error: any) {
        console.error('❌ Order failed:', error.response?.data || error.message)

        if (error.response?.status === 401) {
            console.warn('⚠️ Token expired. Attempting refresh...')
            // await useDeviceStore().authenticate()
         
          // return navigateTo('/login')
        }

        // alert('❌ Failed to place order. Please try again.')
      }
    },
  },

  persist: {
    key: 'cart-store',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['packageSelected', 'guestCount', 'items', 'isOpen'],
  }

})