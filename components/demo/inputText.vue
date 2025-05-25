<template>
    <CommonContainer title="<CommonInputText/>">
        <template #main>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <CommonInputText
                        v-model:v-model="example"
                        placeholder="Enter example"
                        label="example"
                        append="@"
                        prepend="example.com"
                        :clearable="true"
                    />
                    <p>Example Value : {{ example }}</p>
                </div>
                <div>
                    <CommonInputText
                        v-model:v-model="example2"
                        placeholder="Enter example"
                        label="formatted_example"
                        suffix-icon="el-icon-edit"
                        :formatter="formatter"
                        :parser="parser"
                        :clearable="true"
                    />
                </div>
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
    const example = ref('')
    const example2 = ref('')
    const formatter = (value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const parser = (value) => value.replace(/\$\s?|(,*)/g, '')
</script>
