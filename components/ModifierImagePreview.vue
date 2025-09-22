<script setup lang="ts">
import { ref } from 'vue'
import type { MenuItem } from '~/types/menu'
import { Picture as IconPicture } from '@element-plus/icons-vue'

const showPreview = ref(false)

const props = defineProps<{
  modifiers: MenuItem[]
}>()

const srcList = [
  'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg',
  'https://errorSrc',
]
const url =
  'https://fuss10.elemecdn.com/a/3f/3302e58f9a181d2509f3dc0fa68b0jpeg.jpeg'



</script>

<template>
  <div class="flex flex-row flex-wrap justify-center items-center gap-2">
    <div v-for="modifier in modifiers" class="flex flex-col items-center gap-2">
      <el-image style="width: 50px; height: 50px" :src="modifier.img_url" :zoom-rate="1.2" :max-scale="7"
        :min-scale="0.2" :preview-src-list="[modifier.img_url]" show-progress :initial-index="4" fit="contain" class="w-full h-full border border-white bg-white rounded-full flex items-center justify-center" />
      <span class="text-xs">{{ modifier.receipt_name }}</span>
    </div>
  </div>
</template>

<style scoped>
.demo-image__error .image-slot {
  font-size: 30px;
}

.demo-image__error .image-slot .el-icon {
  font-size: 30px;
}

.demo-image__error .el-image {
  width: 100%;
  height: 200px;
}
</style>
