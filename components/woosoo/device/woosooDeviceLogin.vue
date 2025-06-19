<template>
    <div>
        <CommonImage
            src="/logo/logo2.png"
            alt="Logo"
            class="w-24 h-24 mx-auto rounded-full bg-gray-200"
        />
    </div>
    <p class="text-red-500">{{ errorMessage }}</p>
    <div>
        <CommonInputText
            v-model:v-model="myDeviceStore.deviceLoginParams.device_uuid"
            label="Device UUID"
        />
        <p class="text-red-500">{{ errorMessage?.device_uuid }}</p>
    </div>
    <div class="flex justify-end mt-2 gap-2">
        <div class="flex justify-end mt-2">
            <CommonButton
                name="Login"
                @click="loginDevice"
            />
        </div>
    </div>
</template>
<script setup>
import { useMyDeviceStore } from '@/stores/Device'
const myDeviceStore = useMyDeviceStore()

const loginDevice = async () => {
    await myDeviceStore.loginDevice()
    closeDeviceLogin()
    window.location.reload()
}
const emit = defineEmits(['closeDeviceLogin'])
const closeDeviceLogin = () => {
    emit('closeDeviceLogin')
}

</script>
