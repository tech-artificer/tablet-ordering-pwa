<script lang="ts" setup>
const errorHandler = () => true


defineProps<{
  src: string;
  alt: string;
}>();

</script>


<template>
  <div class="demo-type">
    <el-avatar :size="60" src="https://empty" @error="errorHandler">
      <img
        :src="src"
        :alt="alt"
      />
    </el-avatar>
  </div>
</template>

