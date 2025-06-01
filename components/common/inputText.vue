<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-input
        :id="label"
        v-model="vModel"
        type="text"
        :placeholder="placeholder"
        :clearable="clearable"
        :disabled="disabled"
        :formatter="formatter"
        :parser="parser"
        :suffix-icon="suffixIcon"
        :size="size"
    >
        <template
            v-if="prepend"
            #prepend
        >
            {{ prepend }}
        </template>
        <template
            v-if="append"
            #append
        >
            {{ append }}
        </template>
    </el-input>
</template>
<script setup>
defineProps({
    placeholder: {
        type: String,
        default: ''
    },
    clearable: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    formatter: {
        type: Function,
        default: null
    },
    parser: {
        type: Function,
        default: null
    },
    suffixIcon: {
        type: String,
        default: ''
    },
    prepend: {
        type: String,
        default: null
    },
    append: {
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
    type: String,
    default: null,
})
</script>
