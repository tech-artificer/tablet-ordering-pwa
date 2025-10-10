<script setup lang="ts">
import { useDeviceStore } from '~/stores/Device'
import { useRuntimeConfig } from '#app'
const runtimeConfig = useRuntimeConfig()
const deviceStore = useDeviceStore()

const form = reactive({
    name: '',
    code: '',
    app_version: runtimeConfig.public.appVersion
})

deviceStore.authenticate()

const registerDevice = async() => {
    await deviceStore.register(form)

    if (deviceStore.getDeviceToken) {
       alert('Device Registered')
    }
}

</script>

<template>
    <div class="min-w-[25vw] max-w-[400px]">
        <div>
            <div class="w-full">
                <h1 class="text-white text-center mb-4">Register a new device</h1>
                <div>
                    <input
                        v-model="form.name"
                        class="w-full bg-transparent text-white border-white border-2 rounded-lg p-2 mb-4"
                        placeholder="Device Name"
                    >
                    <input
                        v-model="form.code"
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
                </div>
            </div>
        </div>
    </div>
</template>
