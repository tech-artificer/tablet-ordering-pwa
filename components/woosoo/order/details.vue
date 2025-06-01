<template>
    <div class="flex-1 p-2">
        <div class="space-y-2">
            <template v-for="detail in data" :key="detail.id">
                <WoosooOrderCard
                    :name="detail.name"
                    :description="detail.description"
                    :image="detail.image"
                    :price="detail.price"
                    :quantity="detail.quantity"
                />
            </template>
        </div>
    </div>
</template>

<script setup>
defineProps({
    data: {
        type: Array,
        default: () => []
    }
})
</script>
