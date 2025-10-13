<script setup lang="ts">
import { useDeviceStore } from '~/stores/Device'
</script>

<template>
    <div class="p-6 border-b flex flex-col items-center">
        <!-- <p>Device Name:</p> -->
        <h2 class="text-xl font-bold">{{ useDeviceStore().table.name }}</h2>
    </div>
</template>