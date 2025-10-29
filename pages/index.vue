<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMenuStore } from '~/stores/Menu'
import { useDeviceStore } from '~/stores/Device'
import { CustomLogo } from '~/composables/default'
import { useSessionStore } from '~/stores/Session'
const sessionStore = useSessionStore()
const { canProceed } = storeToRefs(sessionStore)
// const { refresh } = useDeviceStore();
const menu = useMenuStore()
// initialize menu
await menu.init()

const changeGuestCountView = () => {
  // sessionStore.startSession()
  navigateTo('guest')
  // emit('changeGuestCountView')CustomLogo
}

definePageMeta({
  middleware: [
    function (to, from) {
      // Custom inline middleware
    },
    'order',
  ],
})

</script>

<template>
 
  <div class="flex flex-col justify-center items-center h-full relative z-10">
    <!-- Animated background flames -->
    <div class="min-h-screen min-w-screen flex flex-col justify-center items-center">
      <div>
        <CommonImage v-if="CustomLogo.LOGO_1" :src="CustomLogo.LOGO_1" alt="logo" class="w-32 h-32" />
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
             
              <button :disabled="!canProceed"
                class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                :class="{ 'opacity-50 cursor-not-allowed pointer-events-none transform-none hover:scale-100': !canProceed }"
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

  </div>
</template>
