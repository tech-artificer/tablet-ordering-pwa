<template>
    <div class="p-2">
        <el-image :src="src" :fit="fit" :height="height" :width="width" class="w-full">
            <template #placeholder>
                <div class="image-slot"> {{ placeholder }} </div>
            </template>
            <template #error>
                <CommonImage
                    src="/logo/logo2.png"
                    alt="logo"
                    class="w-full h-full"
                />
            </template>
        </el-image>
    </div>
</template>
<script setup>
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
    },
    height: {
        type: String,
        default: ""
    },
    width: {
        type: String,
        default: ""
    }
})
</script>
