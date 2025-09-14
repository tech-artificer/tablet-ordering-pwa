<template>
    <div class="p-6 border-b flex flex-col items-center">
        <!-- <p>Device Name:</p> -->
        <h2 class="text-xl font-bold">{{ tableName }}</h2>
    </div>
</template>

<script setup>
const myDeviceStore = useMyDeviceStore()
const { device } = storeToRefs(myDeviceStore)
const tableName = computed(() => {
    if(device.value.table){
        return device.value.table[0].name
    }
    return 'No Table Assigned'
})
</script>
