<template>
    <el-container class="py-2 rounded-md bg-surface border border-border">
        <el-header class="text-lg font-bold ">{{ title }}
            <span class="text-gray-400 text-sm font-normal">{{ description }}</span>
        </el-header>
        <el-main>
            <slot name="main"/>
        </el-main>
        <el-footer v-if="footer" class="border-t border-border">
            <slot name="footer"/>
        </el-footer>
    </el-container>
</template>
<script setup>
defineProps({
    title: {
        type: String,
        default: 'Container Title'
    },
    description: {
        type: String,
        default: 'Container Description'
    },
    footer: {
        type: Boolean,
        default: false
    }
})
</script>
