<template>
  <div>
    <el-segmented v-model="value" :options="options">
      <template #default="scope">
        <div class="flex flex-col items-center gap-2 p-2">
          <el-icon size="20">
            <component :is="scope.item.icon" />
          </el-icon>
          <div>{{ scope.item.label }}</div>
        </div>
      </template>
    </el-segmented>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import {
  Apple,
  Cherry,
  Grape,
  Orange,
  Pear,
  Watermelon,
} from '@element-plus/icons-vue'

const value = ref('Apple')

const options = [
  {
    label: 'Call Support',
    value: 'Apple',
    icon: Apple,
  },
  {
    label: 'Service Water',
    value: 'Cherry',
    icon: Cherry,
  },
  {
    label: 'Bill Out',
    value: 'Grape',
    icon: Grape,
  },
]
</script>