<script setup lang="ts">
definePageMeta({
    layout: "default"
})
// Navigation after successful registration is handled internally by DeviceRegistration.
// Non-inline mode: the component calls router.replace('/') once table is assigned.
</script>

<template>
    <DeviceRegistration />
</template>
