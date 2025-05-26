<template>
    <CommonContainer title="<CommonInputSelect/>">
        <template #main>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <CommonInputSelect
                        v-model:v-model="example"
                        :items="items.map(item => { return { label: item.label + ' default', value: item.value } })"
                        placeholder="Please select"
                        size="default"
                        label="example default"
                    />
                </div>
                <div>
                    <CommonInputSelect
                        v-model:v-model="example2"
                        :items="items.map(item => { return { label: item.label + ' large', value: item.value } })"
                        size="large"
                        label="example large"
                    />
                </div>
                <div>
                    <CommonInputSelect
                        v-model:v-model="example3"
                        :items="items.map(item => { return { label: item.label + ' small', value: item.value } })"
                        size="small"
                        label="example small"
                    />
                </div>
                <div>
                    <CommonInputSelect
                        v-model:v-model="example4"
                        :items="items.map(item => { return { label: item.label + ' multiple', value: item.value } })"
                        label="example multiple"
                        :multiple="true"
                    />
                </div>
                <div>
                    <CommonInputSelect
                        v-model:v-model="example5"
                        :items="items.map(item => { return { label: item.label + ' collapse tag', value: item.value } })"
                        label="collapse tag tooltips"
                        :collapse-tags-tooltip="true"
                        :multiple="true"
                        :max-collapse-tags="2"
                    />
                </div>
                <div>
                    <CommonInputSelect
                        v-model:v-model="example6"
                        :items="items.map(item => { return { label: item.label + ' max collapse tag', value: item.value } })"
                        label="max collapse tag example"
                        :collapse-tags="true"
                        :multiple="true"
                        :max-collapse-tags="3"
                    />
                </div>

            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
defineProps({
    items: {
        type: Array,
        default: () => [
            { label: 'Item 1', value: 'item_1' },
            { label: 'Item 2', value: 'item_2' },
            { label: 'Item 3', value: 'item_3' },
            { label: 'Item 4', value: 'item_4' },
            { label: 'Item 5', value: 'item_5' },
        ]
    }
})
const example = ref('')
const example2 = ref('')
const example3 = ref('')
const example4 = ref('')
const example5 = ref('')
const example6 = ref('')

</script>
