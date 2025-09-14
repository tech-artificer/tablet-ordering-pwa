<script setup lang="ts">

// import Wrapper from '~/components/cards/wrapper.vue'

const guestCountView = ref(false)
const packageView = ref(false)
const { count } = useGuestStore()
const myDeviceStore = useMyDeviceStore()
const { hasDevice } = storeToRefs(myDeviceStore)
const cartStore = useCartStore()
onMounted(async () => {
    await myDeviceStore.checkDevice()

    if (!hasDevice.value) {
        myDeviceStore.showDeviceRegistration = true
    }
    if(cartStore.isLocked){
        navigateTo('woosoo/menu')
    }
})

const changeGuestCountView = () => {
    guestCountView.value = !guestCountView.value
    packageView.value = false
}
const changePackageView = () => {
    packageView.value = !packageView.value
    guestCountView.value = false
}
const changeIncludeItemsModalStatus = () => {
    navigateTo('woosoo/menu')
}

onMounted(() => {
    console.log('count', count)
})
</script>


<template>
    <div class="flex justify-center min-h-screen min-w-screen">
        <div class="relative flex flex-col items-center justify-center">
            <!-- <WoosooHomePackage v-show="packageView && !guestCountView" @change-include-items-modal-status="changeIncludeItemsModalStatus"/> -->
            <!-- <Wrapper /> -->
            <!-- Package Cards -->
            <WoosooPackageCard class="flex justify-center items-center"
                @change-include-items-modal-status="changeIncludeItemsModalStatus"
            />
        </div>
        
    </div>
</template>



<style scoped>
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.5s ease-out;
}
</style>
