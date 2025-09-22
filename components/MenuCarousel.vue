<script setup lang="ts">

const { featuredItems} = useMenuStore()


</script>

<template>
  <el-carousel height="200px" arrow="hover" indicator-position="outside">
    <el-carousel-item
      v-for="item in featuredItems"
      :key="item.title"
      class="relative rounded-xl overflow-hidden"
    >
      <img :src="item.image" class="w-full h-52 object-cover" />

      <div class="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
        <span v-if="item.tag" class="text-sm bg-orange-500 text-white px-2 py-1 rounded mb-2 self-start">
          {{ item.tag }}
        </span>
        <h3 class="text-xl font-bold text-white">{{ item.title }}</h3>
        <p class="text-lg font-semibold text-orange-300">₱{{ item.price }}</p>
      </div>
    </el-carousel-item>
  </el-carousel>
</template>
