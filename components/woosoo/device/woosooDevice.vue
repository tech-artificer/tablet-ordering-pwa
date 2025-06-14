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
            v-model:v-model="deviceParams.name"
            label="Device Name"
        />
        <p class="text-red-500">{{ errorMessage?.name }}</p>
        <CommonInputText
            v-model:v-model="deviceParams.code"
            label="Device Code"
        />
        <p class="text-red-500">{{ errorMessage?.code }}</p>
    </div>
    <div class="flex justify-end mt-2">
        <CommonButton
            name="Register"
            @click="registerDevice"
        />
    </div>
</template>
<script setup>
import { useMyDeviceStore } from '@/stores/Device'
import { useRuntimeConfig } from '#app'
import { storeToRefs } from 'pinia'
const runtimeConfig = useRuntimeConfig()
const myDeviceStore = useMyDeviceStore()
const { deviceParams, errorMessage } = storeToRefs(myDeviceStore)
onMounted(async () => {
    myDeviceStore.clearData()
    deviceParams.value.app_version = runtimeConfig.public.appVersion
    deviceParams.value.last_ip_address = await myDeviceStore.getIPAddress()
})
const registerDevice = () => {
    myDeviceStore.registerDevice()
}
</script>
