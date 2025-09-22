<script setup lang="ts">
import { Users } from 'lucide-vue-next'

const cartStore = useCartStore()
const router = useRouter()

// Redirect if cart is empty
if (cartStore.items.length === 0) {
    // await navigateTo('/menu')
}

const isSubmitting = ref(false)


const setActiveMenu = (event: Event) => {
    // The event.currentTarget is the element that the event listener is attached to.
    const element = event.currentTarget as HTMLElement;

    // Now you can safely use `element`
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
};


const getFinalTotal = () => {
    return cartStore.total
}

const submitOrder = async () => {
    isSubmitting.value = true

    try {
        const orderData = {
            items: cartStore.items,
            guestCount: cartStore.guestCount,
            total: getFinalTotal()
        }

        // const { data } = await $fetch('/api/orders', {
        //   method: 'POST',
        //   body: orderData
        // })

        // Clear cart and redirect to order confirmation
        //     cartStore.clearCart()
        //     await navigateTo(`/orders/${data.order.id}`)
    } catch (error) {
        //     console.error('Order submission failed:', error)
        //     // Handle error (show notification, etc.)
    } finally {
        //     isSubmitting.value = false
    }
}

</script>


<template>

    <div class="floating-menu">
        <div class="menu-item active" @click="setActiveMenu($event)">
            <!-- <div class="menu-icon">🏠</div> -->
            <div class="menu-label">Call Support</div>
        </div>
        <div class="menu-item" @click.prevent="setActiveMenu($event)">
            <div class="menu-icon">📊</div>
            <div class="menu-label">Stats</div>
        </div>
        <div class="menu-item" @click.prevent="setActiveMenu($event)">
            <div class="menu-icon">📁</div>
            <div class="menu-label">Files</div>
        </div>
        <div class="menu-item" @click.prevent="setActiveMenu($event)">
            <div class="menu-icon">⚙️</div>
            <div class="menu-label">Settings</div>
        </div>
    </div>
</template>



<style scoped>
.floating-menu {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: black;
    border-radius: 30px;
    padding: 8px;
    display: flex;
    gap: 8px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    z-index: 200;
}

.menu-item {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

/* .menu-item:active {
    transform: scale(0.9);
} */

.menu-item.active {
    background: #F6B56D;
}

.menu-item.active .menu-icon,
.menu-item.active .menu-label {
    color: white;
}

.menu-icon {
    font-size: 24px;
    margin-bottom: 4px;
    color: #4a5568;
}

.menu-label {
    font-size: 10px;
    color: #718096;
}
</style>