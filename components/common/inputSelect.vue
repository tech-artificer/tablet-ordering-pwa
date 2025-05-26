<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-select-v2
        v-model="vModel"
        :options="items"
        :placeholder="placeholder"
        :size="size"
        :multiple="multiple"
        :collapse-tags="collapseTags"
        :collapse-tags-tooltip="collapseTagsTooltip"
        :max-collapse-tags="maxCollapseTags"
    />
</template>
<script setup>
defineProps({
    items: {
        type: Array,
        default: () => []
    },
    placeholder: {
        type: String,
        default: 'Please select'
    },
    label: {
        type: String,
        default: null
    },
    size: {
        // large, small, default
        type: String,
        default: 'default'
    },
    multiple: {
        type: Boolean,
        default: false
    },
    collapseTags: {
        type: Boolean,
        default: false
    },
    collapseTagsTooltip: {
        type: Boolean,
        default: false
    },
    maxCollapseTags: {
        type: Number,
        default: 3
    }
})
const vModel = defineModel('vModel', {
    type: String,
    default: null,
})
</script>
