<template>
    <CommonContainer title="<CommonInputRate/>">
        <template #main>
            <div>
                <CommonInputRate
                    v-model:v-model="example"
                    label="Example Rates"
                />
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
const example = ref(0)
</script>
