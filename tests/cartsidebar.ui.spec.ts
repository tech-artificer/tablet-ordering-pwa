import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CartSidebar from '../components/order/CartSidebar.vue'
import { useOrderStore } from '../stores/Order'
// device store not required for this test; avoid importing to prevent helper type errors
import { useDeviceStore } from '../stores/Device'
import { useSessionStore } from '../stores/Session'

// Minimal stubs for child components used in CartSidebar
const globalStubs = {
  'cart-item-card': true,
  'el-badge': true,
  'el-empty': true,
  'RefreshCw': true,
  'Clock': true,
  'ChefHat': true,
  'CheckCircle': true,
  'AlertCircle': true
}

describe('CartSidebar UI', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    // Ensure session store minimally populated
    const ss = useSessionStore()
    ss.orderId = null
  })    

  it('hides Place Order button after initial order is placed', async () => {
    const order = useOrderStore()
    // Set up order state to simulate an already-placed order
    order.hasPlacedOrder = true
    order.isRefillMode = false

    const wrapper = mount(CartSidebar, {
      global: {
        plugins: [pinia],
        stubs: globalStubs
      },
      props: {
        selectedPackage: { id: 1, name: 'Test' } as any,
        guestCount: 2,
        cartItems: [],
        packageTotal: 100,
            addOnsTotal: 0,
        taxAmount: 0,
        grandTotal: 100,
        isRefillMode: false,
        hasPlacedOrder: true
      }
    })

    // Ensure no button contains the 'Place Order' label
    const buttons = wrapper.findAll('button')
    const hasPlaceOrder = buttons.some(b => b.text().toLowerCase().includes('place order'))
    expect(hasPlaceOrder).toBe(false)

    // Instead, an 'Order Refill' button (or similar) should be present when placed
    const hasRefill = buttons.some(b => b.text().toLowerCase().includes('refill'))
    expect(hasRefill).toBe(true)
  })
})
