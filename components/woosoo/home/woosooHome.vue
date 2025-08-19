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
            <template v-if="!myDeviceStore.showDeviceRegistration">
                <WoosooHomeHeadline v-show="!guestCountView && !packageView" @change-guest-count-view="changeGuestCountView"/>
                <WoosooHomeGuestCounter v-show="guestCountView && !packageView" @change-package-view="changePackageView"/>
                <WoosooHomePackage v-show="packageView && !guestCountView" @change-include-items-modal-status="changeIncludeItemsModalStatus"/>
            </template>
            <template v-else>
                <WoosooDeviceRegister />
            </template>
        </div>
    </div>
</template>

<script setup>
const guestCountView = ref(false)
const packageView = ref(false)
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

</script>
