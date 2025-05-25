<template>
    <CommonContainer title="<CommonInputPassword/>">
        <template #main>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <CommonInputPassword
                        v-model:v-model="example"
                        placeholder="Enter password"
                        label="example"
                    />
                    <p>Example Value : {{ example }}</p>
                </div>
                <div>
                    <CommonInputPassword
                        v-model:v-model="example2"
                        placeholder="Enter password"
                        label="show_password_example"
                        suffix-icon="el-icon-edit"
                        :show-password="true"
                    />
                </div>
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
    const example = ref('')
    const example2 = ref('')
</script>
