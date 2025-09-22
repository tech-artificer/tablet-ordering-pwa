<script setup lang="ts">
import { useCartStore } from '~/stores/Cart'
import { useMenuStore } from '~/stores/Menu'
import { useOrderStore } from '~/stores/Order'

const cart = useCartStore()
const menu = useMenuStore()
const order = useOrderStore()
const deviceStore = useMyDeviceStore()

console.log('device', deviceStore.hasDevice)
// const guestStore = useGuestStore()

// initialize menu
await menu.init()

cart.$reset()
cart.clear()
order.$reset()

const changeGuestCountView = () => {
    navigateTo('guest')
    // emit('changeGuestCountView')
}

definePageMeta({
  middleware: [
    function (to, from) {
      // Custom inline middleware
    },
    'order',
  ],
});

</script>

<template>
  <div class="flex flex-col justify-center items-center h-full relative z-10">
    <!-- Animated background flames -->
    <div class="min-h-screen min-w-screen flex flex-col justify-center items-center">
      <div>
        <CommonImage :src="CustomLogo.LOGO_1" alt="logo" class="w-32 h-32" />
      </div>
      <!-- Main content -->
      <div class="relative z-10 flex flex-col items-center justify-center px-4">
        <!-- Logo -->
        <div>
          <!-- <NuxtLink to="/guestCount" class="text-white ">
          Go to blog post
        </NuxtLink> -->
          <!-- <WoosooHomeHeadline /> -->
          <div>
            <!-- Main headline -->
            <div class="text-center mb-12">
              <h2 class="text-white text-4xl md:text-5xl leading-tight">
                The grill is hot.
              </h2>
              <h2 class="text-white text-4xl md:text-5xl leading-tight">
                The meat is marinated.
              </h2>
              <h2 class="text-white text-4xl md:text-5xl leading-tight">
                Let's get started.
              </h2>
            </div>
            <!-- Input and button -->
            <div class="w-full max-w-md space-y-2">
              <button
                class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                @click="changeGuestCountView()">
                Let's WooSoo This!
              </button>
              <p class="text-gray-400 text-sm text-center">
                Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- <WoosooHome /> -->
  </div>
</template>
