<script setup lang="ts">

const guestCountView = ref(false)
const packageView = ref(false)
const myDeviceStore = useMyDeviceStore()
const { hasDevice, device } = storeToRefs(myDeviceStore)
const cartStore = useCartStore()

onMounted(async () => {
    await myDeviceStore.checkDevice()
    if (!hasDevice.value) {
      navigateTo('register')
      myDeviceStore.showDeviceRegistration = true
    }

    console.log('Device', device.value)
})

</script>

<template>
    <div class="flex flex-col justify-center items-center h-full relative z-10">
        <!-- Animated background flames -->
         <div class="min-h-screen min-w-screen flex justify-center items-center">
        <!-- Main content -->
        <div class="relative z-10 flex flex-col items-center justify-center px-4">
            <!-- Logo -->
            <div>
                <CommonImage
                    :src="CustomLogo.LOGO_1"
                    alt="logo"
                    class="w-24 h-24"
                />
            </div>
            <div>
               <!-- <NuxtLink to="/guestCount" class="text-white ">
          Go to blog post
        </NuxtLink> -->
              <WoosooHomeHeadline />
            </div>
            
        </div>
    </div>
       
        <!-- <WoosooHome /> -->
    </div>
</template>
