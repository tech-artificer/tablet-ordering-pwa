<template>
    <CommonContainer title="<CommonInputTag/>">
        <template #main>
            <div>
                <CommonInputTag
                    v-model:v-model="example"
                    placeholder="Please input"
                    label="example"
                />
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
defineProps({
    placeholder: {
        type: String,
        default: 'Please input'
    }
})
const example = ref([])
</script>
