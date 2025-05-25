<template>
    <el-button :type="type" :plain="plain" :round="round">
        {{ name }}
    </el-button>
</template>

<script setup>
    defineProps({
        name: {
            type: String,
            default: 'Your Button Name / Please change'
        },
        type: {
            type: String,
            default: 'primary'
        },
        plain: {
            type: Boolean,
            default: false
        },
        round: {
            type: Boolean,
            default: false
        }
    })
</script>
