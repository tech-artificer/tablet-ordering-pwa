<template>
    <CommonContainer title="<CommonImage/>">
        <template #main>
            <div class="flex justify-center">
                <div>
                    <CommonImage :src="src" />
                </div>
                <div>
                    <CommonImage :src="src" placeholder="Loading Please wait..." error="Error" fit="fill" />
                </div>
            </div>
        </template>
    </CommonContainer>
</template>
<script setup>
const src = 'https://cube.elemecdn.com/6/94/4d3ea53c084bad6931a56d5158a48jpeg.jpeg'
</script>

