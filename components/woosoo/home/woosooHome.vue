<template>
    <div class="min-h-screen min-w-screen">
        <!-- Main content -->
        <div class="relative z-10 flex flex-col items-center justify-center px-4">
            <!-- Logo -->
            <div>
                <CommonImage
                    src="/logo/logo1.png"
                    alt="logo"
                    :class="{'w-24 h-24': packageView, 'w-48 h-48': !packageView}"
                />
            </div>
            <WoosooHomeHeadline v-show="!guestCountView && !packageView" @change-guest-count-view="changeGuestCountView"/>
            <WoosooHomeGuestCounter v-show="guestCountView && !packageView" @change-package-view="changePackageView"/>
            <WoosooHomePackage v-show="packageView && !guestCountView" @change-include-items-modal-status="changeIncludeItemsModalStatus"/>
        </div>
    </div>
    <el-dialog
        v-model="isModalShow"
        align-center
        width="800"
    >
        <WoosooHomeCartPreview/>
    </el-dialog>
</template>

<script setup>
const guestCountView = ref(false)
const packageView = ref(false)
const isModalShow = ref(false)
const changeGuestCountView = () => {
    guestCountView.value = !guestCountView.value
    packageView.value = false
    isModalShow.value = false
}
const changePackageView = () => {
    packageView.value = !packageView.value
    guestCountView.value = false
    isModalShow.value = false
}
const changeIncludeItemsModalStatus = () => {
    isModalShow.value = !isModalShow.value
}
</script>
