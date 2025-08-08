<template>
    <div
        class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
        <div class="aspect-square relative">
            <CommonImage
                :src="item.img_url"
                :alt="item.name"
                :width="'100%'"
                :style-class="'w-full h-full object-cover'"
            />
            <div v-show="item.rating" class="absolute top-3 right-3 bg-white rounded-full px-2 py-1">
                <WoosooProductRating :rating="item.rating" />
            </div>
        </div>

        <!-- Regular Product Layout -->
        <div v-show="!item.is_modifier" class="p-4">
            <h3 class="font-semibold text-responsive mb-1">{{ item.name }}</h3>
            <p class="text-gray-500 text-sm mb-3">{{ item.description }}</p>

            <div class="flex justify-between items-center mb-4">
                <span v-show="item.price || item.price === 0" class="font-semibold text-lg">₱{{ item.price || 0.00 }}</span>
                <span class="text-gray-400 text-sm">{{ item.group }}</span>
            </div>

            <div v-show="showQuantity" class="space-y-3">
                <div class="flex justify-center">
                    <div class="flex items-center space-x-3">
                        <button
                            class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="quantity <= 1"
                            @click="decreaseQuantity"
                        >
                            -
                        </button>
                        <span class="text-sm font-medium min-w-8 text-center">{{ quantity }}</span>
                        <button
                            class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="quantity >= 20"
                            @click="increaseQuantity"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button
                        class="flex-1 py-2 bg-lightGreen text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                        @click="confirmAddToCart"
                    >
                        Add
                    </button>
                    <button
                        class="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                        @click="cancelQuantitySelection"
                    >
                        Cancel
                    </button>
                </div>
            </div>
            <div v-show="!showQuantity">
                <button
                    class="w-full py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                    @click="showQuantitySelector"
                >
                    Add to cart
                </button>
            </div>
        </div>
        <div v-show="item.is_modifier" class="p-4">
            <h3 class="font-semibold text-responsive mb-3">{{ item.name }}</h3>
            <div>
                <span v-show="item.price || item.price === 0" class="font-semibold text-lg">₱{{ item.price || 0.00 }}</span>

                <div class="flex justify-between gap-3">
                    <div class="flex items-center ">
                        <button
                            class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="quantity <= 1"
                            @click="decreaseQuantity"
                        >
                            -
                        </button>
                        <span class="text-sm font-medium min-w-8 text-center">{{ quantity }}</span>
                        <button
                            class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="quantity >= 20"
                            @click="increaseQuantity"
                        >
                            +
                        </button>
                    </div>

                    <button
                        class="flex items-center justify-center gap-2 p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors font-medium min-w-[80px]"
                        @click="confirmAddToCart"
                    >
                        Add To Cart
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>

const showQuantity = ref(false)
const quantity = ref(1)

const props = defineProps({
    item: {
        type: Object,
        default: () => ({})
    }
})

const emit = defineEmits(['add-to-cart'])

const showQuantitySelector = () => {
    showQuantity.value = true
}

const cancelQuantitySelection = () => {
    showQuantity.value = false
    quantity.value = 1
}

const increaseQuantity = () => {
    if (quantity.value < 20) {
        quantity.value++
    }
}

const decreaseQuantity = () => {
    if (quantity.value > 1) {
        quantity.value--
    }
}

const confirmAddToCart = () => {
    const itemToAdd = {
        ...props.item,
        ordered_menu_id: props.item.id,
        menu_id: props.item.id,
        tax_amount: parseFloat(props.item.tax_amount || 0),
        tax: parseFloat(props.item.tax_amount || 0),
        discount: 0,
        subtotal: props.item.price || 0,
        quantity: quantity.value
    }
    console.log('Adding to cart:', itemToAdd)
    emit('add-to-cart', itemToAdd)

    showQuantity.value = false
    quantity.value = 1
}
</script>
