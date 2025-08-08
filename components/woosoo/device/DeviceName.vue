<template>
    <div class="p-6 border-b flex flex-col items-center">
        <p>Device Name:</p>
        <h2 class="text-xl font-bold">{{ device.device.name }}</h2>
    </div>
</template>

<script setup>
const myDeviceStore = useMyDeviceStore()
const { device } = storeToRefs(myDeviceStore)
</script>
