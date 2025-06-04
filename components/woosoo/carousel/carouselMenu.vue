<template>
    <el-carousel type="card" :interval="interval" height="200px" :show-arrows="false" indicator-position="none" arrow="never">
        <el-carousel-item v-for="item in data" :key="item.id">
            <WoosooCarouselCard
                :name="item.name"
                :price="item.price"
                :category="item.category"
                :image="item.image"
            />
        </el-carousel-item>
    </el-carousel>
</template>

<script setup>
defineProps({
    interval: {
        type: Number,
        default: 5000
    },
    data: {
        type: Array,
        default: () => []
    }
})
</script>
<style scoped>
.el-carousel__item h3 {
    color: #475669;
    opacity: 0.75;
    margin: 0;
    text-align: center;
}
</style>
