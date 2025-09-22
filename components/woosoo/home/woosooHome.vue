<template>
    <div class="min-h-screen min-w-screen flex justify-center items-center">
        <!-- Main content -->
        <div class="relative z-10 flex flex-col items-center justify-center px-4">
            <!-- Logo -->
            <div>
                <CommonImage
                    :src="CustomLogo.LOGO_1"
                    alt="logo"
                    :class="{'w-24 h-24': packageView, 'w-48 h-48': !packageView}"
                />
            </div>
            <template v-if="!deviceStore.showDeviceRegistration">
                <!-- <WoosooHomeHeadline v-show="!guestCountView && !packageView" @change-guest-count-view="changeGuestCountView"/> -->
                 <WoosooHomeHeadline v-show="!guestCountView && !packageView"/>
                <WoosooHomeGuestCounter v-show="guestCountView && !packageView" @change-package-view="changePackageView"/>
                <WoosooHomePackage v-show="packageView && !guestCountView" @change-include-items-modal-status="changeIncludeItemsModalStatus"/>
            </template>
            <template v-else>
                <!-- <WoosooDeviceRegister /> -->
            </template>
        </div>
    </div>
</template>

<script setup>
const guestCountView = ref(false)
const packageView = ref(false)
const deviceStore = useDeviceStore()
const { hasDevice } = storeToRefs(deviceStore)
const cartStore = useCartStore()
onMounted(async () => { 
    // console.log(deviceStore)
    // await deviceStore.checkDevice()
    // if (!hasDevice.value) {
    //     deviceStore.showDeviceRegistration = true
    // }
    // if(cartStore.isLocked){
    //     navigateTo('woosoo/menu')
    // }
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

</script>
