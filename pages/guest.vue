<script setup lang="ts">
import GuestCounter from '~/components/GuestCounter.vue'

// definePageMeta({
//   middleware: [
//     function (to, from) {
//       // Custom inline middleware
//     },
//     'order',
//   ],
//   layout: 'default',
// });

</script>

<template layout="default">
    <div class="flex justify-center items-center min-h-screen min-w-screen">

  
        <div class="flex flex-col justify-center items-center h-full relative z-10">
            <div>
        <CommonImage :src="CustomLogo.LOGO_1" alt="logo" class="w-32 h-32" />
      </div>
            <div>
                <h2 class="text-center text-white text-4xl md:text-5xl leading-tight">
                    How Many People are <br>
                    in your group ?
                </h2>
            </div>

            <div>
                <GuestCounter />
            </div>
            
            <div class="w-full max-w-md space-y-2 mt-16">
                <button
                    class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                    @click="navigateTo('setmeal')"
                  
                >
                    Ready To Grill together?
                </button>
                <p class="text-gray-400 text-sm text-center">
                    Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
                </p>
            </div>
        </div>
    </div>
</template>
