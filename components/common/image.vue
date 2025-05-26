<template>
    <div class="p-2">
        <el-image :src="src" :fit="fit">
            <template #placeholder>
                <div class="image-slot"> {{ placeholder }} </div>
            </template>
            <template #error>
                <CommonIcon>
                    <IconPicture />
                </CommonIcon>
            </template>
        </el-image>
    </div>
</template>
<script setup>
import { Picture as IconPicture } from '@element-plus/icons-vue'
defineProps({
    src: {
        type: String,
        default: null
    },
    placeholder: {
        type: String,
        default: "Loading..."
    },
    error: {
        type: String,
        default: "Error"
    },
    fit: {
        type: String,
        default: "fill"
    }
})
</script>
