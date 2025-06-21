<template>
    <div class="min-w-[25vw] max-w-[400px]">
        <template v-if="showDeviceLogin">
            <WoosooDeviceLogin @login-device="loginDevice"/>
        </template>
        <template v-else>
            <div class="w-full">
                <h1 class="text-white text-center mb-4">Register a new device</h1>
                <div>
                    <input
                        v-model="deviceParams.name"
                        class="w-full bg-transparent text-white border-white border-2 rounded-lg p-2 mb-4"
                        placeholder="Device Name"
                    >
                    <input
                        v-model="deviceParams.code"
                        class="w-full bg-transparent text-white border-white border-2 rounded-lg p-2 "
                        placeholder="Device Code"
                    >
                </div>
                <div class="w-full max-w-md space-y-2 mt-4">
                    <button
                        class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                        @click="registerDevice()"
                    >
                        Register
                    </button>
                    <p class="text-sm text-center cursor-pointer text-primary" @click="loginDevice()">
                        Login <span class="text-white">instead</span>
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
<script setup>
import { useMyDeviceStore } from '@/stores/Device'
import { useRuntimeConfig } from '#app'
import { storeToRefs } from 'pinia'
const runtimeConfig = useRuntimeConfig()
const myDeviceStore = useMyDeviceStore()
const { deviceParams } = storeToRefs(myDeviceStore)
onMounted(async () => {
    myDeviceStore.clearData()
    deviceParams.value.app_version = runtimeConfig.public.appVersion
    deviceParams.value.last_ip_address = await myDeviceStore.getIPAddress()
})
const registerDevice = () => {
    myDeviceStore.registerDevice()
}
const loginDevice = () => {
    showDeviceLogin.value = !showDeviceLogin.value
}
const showDeviceLogin = ref(false)
</script>
