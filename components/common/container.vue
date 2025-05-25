<template>
    <div class="p-2">
        <el-container class="py-2 rounded-sm">
            <el-header class="text-lg font-bold border-b border-border ">{{ title }} <span class="text-text-secondary text-sm font-normal">{{ description }}</span></el-header>
            <el-main>
                <slot name="main"/>
            </el-main>
            <el-footer v-if="footer" class="border-t border-border">
                <slot name="footer"/>
            </el-footer>
        </el-container>
    </div>
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
