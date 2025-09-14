<script setup lang="ts">
import { Minus, Plus, CircleChevronLeft } from 'lucide-vue-next'
import { useOrderStore } from '@/stores/Order'

const packageView = ref(false)

const orderStore = useOrderStore()

const guestStore = useGuestStore()
const { count } = storeToRefs(guestStore)
const setGuest = guestStore.setGuest
const defaultCount = ref(1)


const navigateBack = () => {
    navigateTo('/')
}

onMounted(() => {
    count.value = defaultCount.value
})

</script>
<template>
    <div class="flex justify-center items-center min-h-screen min-w-screen">
        <div class="flex flex-col justify-center items-center h-full relative z-10">
            <div>
                <h2 class="text-center text-white text-4xl md:text-5xl leading-tight">
                    How Many People are <br>
                    in your group ?
                </h2>
            </div>
            <div class="flex items-center justify-center mt-16">
                <button
                    class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                    :disabled="count <= 1"
                    @click="count--"
                >
                    <Minus />
                </button>
                <span class="text-4xl font-bold w-32 text-center text-white ">{{ count }}</span>
                <button
                    class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                    :disabled="count >= 20"
                    @click="count++"
                >
                    <Plus />
                </button>
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
