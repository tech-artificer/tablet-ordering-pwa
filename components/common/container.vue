<template>
    <el-container class="py-2 rounded-md bg-surface border border-border" :style="{ 'boxShadow': 'var(--el-box-shadow)' }">
        <el-header class="text-lg font-bold border-b border-border">
            <div class="mt-2">
                <p class="text-lg font-bold text-text-primary">{{ title }}
                    <span class="text-text-secondary text-sm font-normal">{{ description }}</span>
                </p>
            </div>
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
