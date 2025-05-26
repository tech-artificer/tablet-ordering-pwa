<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-input-tag
        v-model="vModel"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :disabled="disabled"
        :trigger="trigger"
        :max="max"
        :clearable="clearable"
        :tag-type="tagType"
        :tag-effect="tagEffect"
    />
</template>
<script setup>
defineProps({
    placeholder: {
        type: String,
        default: 'Please input'
    },
    label: {
        type: String,
        default: null
    },
    ariaLabel: {
        type: String,
        default: 'Please click the Enter key after input'
    },
    disabled: {
        type: Boolean,
        default: false
    },
    trigger: {
        type: String,
        default: 'Space'
    },
    max: {
        type: Number,
        default: 10
    },
    clearable: {
        type: Boolean,
        default: false
    },
    tagType: {
        type: String,
        default: 'success'
    },
    tagEffect: {
        type: String,
        default: 'dark'
    }
})
const vModel = defineModel('vModel', {
    type: Array,
    default: [],
})
</script>
