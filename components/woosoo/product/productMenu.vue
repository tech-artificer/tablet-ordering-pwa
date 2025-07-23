<template>
    <div class="grid grid-cols-4 gap-2">
        <WoosooProductCard
            v-for="item, index in data"
            :key="index"
            :item="item"
            @add-to-cart="addToCart"
        />
    </div>
</template>
<script setup>
defineProps({
    data: {
        type: Array,
        default: () => []
    },
})

const emit = defineEmits(['add-to-cart'])

const addToCart = (item) => {
    emit('add-to-cart', item)
}
</script>
