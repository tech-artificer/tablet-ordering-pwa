<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-input-number
        v-model="vModel"
        :min="min"
        :max="max"
        :disabled="disabled"
        :placeholder="placeholder"
        :step-strictly="stepStrictly"
        :step="step"
        :size="size"
        class="w-full"
    >
    <template v-if="prefix" #prefix>
        <span>{{ prefix }}</span>
    </template>
    <template v-if="suffix" #suffix>
        <span>{{ suffix }}</span>
    </template>
    </el-input-number>
</template>
<script setup>
defineProps({
    num: {
        type: Number,
        default: 1
    },
    min: {
        type: Number,
        default: 1
    },
    max: {
        type: Number,
        default: 10
    },
    disabled: {
        type: Boolean,
        default: false
    },
    stepStrictly: {
        type: Boolean,
        default: false
    },
    step: {
        type: Number,
        default: 1
    },
    prefix: {
        type: String,
        default: null
    },
    suffix: {
        type: String,
        default: null
    },
    placeholder: {
        type: String,
        default: null
    },
    label: {
        type: String,
        default: null
    },
    size: {
        type: String,
        default: 'default'
    }
})
const vModel = defineModel('vModel', {
    type: Number,
    default: null,
})
</script>
