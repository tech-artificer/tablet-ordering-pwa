<template>
    <CommonContainer title="<CommonInputTextArea/>">
        <template #main>
            <div class="grid grid-cols-1">
                <div>
                    <CommonInputTextArea
                        v-model:v-model="example"
                        placeholder="Enter example"
                        label="example"
                        :clearable="true"
                    />
                    <p>Example Value : {{ example }}</p>
                </div>
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
    const example = ref('')
</script>
