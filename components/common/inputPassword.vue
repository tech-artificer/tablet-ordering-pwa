<template>
    <CommonLabel v-if="label" :for="label">
        {{ label.charAt(0).toUpperCase() + label.slice(1) }}
    </CommonLabel>
    <el-input
        :id="label"
        v-model="vModel"
        type="password"
        :placeholder="placeholder"
        :show-password="showPassword"
        :suffix-icon="suffixIcon"
    >
        <!-- example <template #prepend>Http://</template> -->
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
    showPassword: {
        type: Boolean,
        default: false
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
    }
})
const vModel = defineModel('vModel', {
    type: String,
    default: null,
})
</script>
