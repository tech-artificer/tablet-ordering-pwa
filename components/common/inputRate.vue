<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-rate
        v-model="vModel"
        :colors="colors"
    />
</template>
<script setup>
defineProps({
    label: {
        type: String,
        default: null
    },
    colors: {
        type: Array,
        default: () => ['#99A9BF', '#F7BA2A', '#FF9900']
    }
})
const vModel = defineModel('vModel', {
    type: Number,
    default: null,
})
</script>
