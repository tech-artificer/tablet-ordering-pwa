<template>
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
                @click="changeGuestCountView()"
            >
                Let's WooSoo This!
            </button>
            <p class="text-gray-400 text-sm text-center">
                Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
            </p>
        </div>
    </div>
</template>
<script setup>
import { usePackageStore } from '@/stores/Package'
const packageStore = usePackageStore()
const emit = defineEmits(['changeGuestCountView'])

const changeGuestCountView = () => {
    emit('changeGuestCountView')
}
onMounted(async () => {
    await packageStore.getSetMeals()
    if (packageStore.sideList) {
        await packageStore.getSides()
    }
    if (packageStore.desertList) {
        await packageStore.getDesserts()
    }
    if (packageStore.beverageList) {
        await packageStore.getBeverage()
    }
})
</script>
