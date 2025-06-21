<template>
    <div class="min-w-[25vw] max-w-[400px] ">
        <h1 class="text-white text-center mb-4">Login</h1>
        <div class="w-full">
            <input
                v-model="myDeviceStore.deviceLoginParams.device_uuid"
                class="w-full bg-transparent text-white border-white border-2 rounded-lg p-2 mb-2"
                placeholder="Device Name"
            >
        </div>
        <div class="w-full max-w-md space-y-2 mt-4">
            <button
                class="w-full py-4 px-8 bg-primary text-black text-xl font-bold rounded-md hover:opacity-90 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white"
                @click="loginDevice()"
            >
                Login
            </button>
            <p class="text-sm text-center cursor-pointer text-primary" @click="changeDeviceLogin()">
                Register <span class="text-white">instead</span>
            </p>
        </div>
    </div>
</template>
<script setup>
import { useMyDeviceStore } from '@/stores/Device'
const emit = defineEmits(['loginDevice'])
const myDeviceStore = useMyDeviceStore()

const loginDevice = async () => {
    await myDeviceStore.loginDevice()
    window.location.reload()
}
const changeDeviceLogin = () => {
    emit('loginDevice')
}
</script>
