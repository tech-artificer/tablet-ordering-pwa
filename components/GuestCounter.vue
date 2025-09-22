<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Minus, Plus } from 'lucide-vue-next'

const cart = useCartStore()
const { guestCount } = storeToRefs(cart); 

const incrementGuests = () => {
  if (guestCount.value < 15) {
    guestCount.value++
  }
}

const decrementGuests = () => {
  if (guestCount.value > 1) {
    guestCount.value--
  }
}


</script>
<template >
  <div class="flex items-center justify-center mt-16">
                <button
                    class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                    :disabled="guestCount <= 1"
                    @click="decrementGuests()"
                >
                    <Minus />
                </button>
                <span class="text-4xl font-bold w-32 text-center text-white ">{{ guestCount }}</span>
                <button
                    class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                    :disabled="guestCount >= 20"
                    @click="incrementGuests"
                >
                    <Plus />
                </button>
            </div>
</template>
