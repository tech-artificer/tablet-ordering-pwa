<template>
    <CommonContainer title="<CommonInputNumber/>">
        <template #main>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <div>
                    <CommonInputNumber
                        v-model:v-model="num"
                        :min="1"
                        :max="10"
                        label="Example small"
                        size="small"
                    />
                </div>
                <div>
                    <CommonInputNumber
                        v-model:v-model="num2"
                        :min="2"
                        :max="100"
                        :step-strictly="true"
                        :step="2"
                        label="Example default"
                    />
                </div>
                <div>
                    <CommonInputNumber
                        v-model:v-model="num3"
                        :min="2"
                        :max="100"
                        :step-strictly="true"
                        :step="2"
                        label="Example large"
                        size="large"
                    />
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <CommonInputNumber
                        v-model:v-model="num4"
                        :min="1"
                        :max="10"
                        label="example Normal Input Number"
                    />
                </div>
                <div>
                    <CommonInputNumber
                        v-model:v-model="num5"
                        :min="2"
                        :max="100"
                        :step-strictly="true"
                        :step="2"
                        label="example Step with step strictly"
                    />
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <CommonInputNumber
                        v-model:v-model="num6"
                        :min="1"
                        :max="10"
                        label="example prefix Input Number"
                        prefix="prefix"
                    />
                </div>
                <div>
                    <CommonInputNumber
                        v-model:v-model="num7"
                        :min="2"
                        :max="100"
                        :step-strictly="true"
                        :step="2"
                        label="example suffix Input Number"
                        suffix="suffix"
                    />
                </div>
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
const num = ref(1)
const num2 = ref(2)
const num3 = ref(3)
const num4 = ref(4)
const num5 = ref(5)
const num6 = ref(6)
const num7 = ref(7)
</script>
