<template>
    <div
        v-for="(pkg, index) in packageList"
        :key="pkg.id"
        :class="[
            'w-[260px] min-h-[460px] relative rounded-2xl p-6 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-2xl',
            selectedPackage === pkg.id
                ? 'ring-2 ring-orange-300 shadow-2xl shadow-orange-500/30 scale-105'
                : 'hover:ring-2 hover:ring-orange-300',
            index === 0 ? 'bg-gray-400' : index === 1 ? 'bg-primary' : 'bg-gray-600',
        ]"
        @click="handlePackageSelect(pkg.id, pkg.items, pkg.name, pkg.price)"
    >
        <!-- Badge -->
        <div class="flex justify-center mb-4">
            <div class="bg-black px-4 py-1 rounded-full relative">
                <span class="text-white text-xs font-bold tracking-wide uppercase">
                    <WoosooPackageCrown
                        v-show="pkg.badge.toLowerCase() === CategoryFilter.BEST"
                    />

                    {{ pkg.badge }}
                </span>
                <!-- Selection Indicator -->
                <div
                    v-if="selectedPackage === pkg.id"
                    class="absolute top-0 -left-9 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center shadow-lg"
                >
                    <span class="text-white text-sm font-bold">✓</span>
                </div>
            </div>
        </div>

        <!-- Package Name and Price -->
        <div class="text-center mb-4">
            <h3
                :class="[
                    'text-2xl font-semibold leading-tight',
                    index === 0 ? 'text-gray-300' : index === 2 ? 'text-primary' : 'text-black',
                ]"
            >
                {{ pkg.name }}
            </h3>
            <p
                class="text-2xl font-normal text-white"
            >
                &#x20B1; {{ pkg.price }}
            </p>
        </div>

        <!-- Food Images -->
        <div class="flex flex-wrap justify-evenly gap-6 mb-8 px-2">
            <div
                v-for="(item, itemIndex) in pkg.items.slice(0, 3)"
                :key="itemIndex"
                class="relative"
            >
                <div
                    :class="[
                    itemIndex === 0 ? 'w-24 h-24': itemIndex === 1 ? 'w-16 h-16': itemIndex === 2 ? 'w-28 h-28': 'w-24 h-24',
                    ' bg-black bg-opacity-40 rounded-full border-2 border-orange-400/30 flex items-center justify-center overflow-hidden'
                    ]"
                >
                    <div class="w-full h-full bg-gradient-to-br rounded-full flex items-center justify-center">
                        <img :src="item.image" :alt="item.name" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>
        </div>

        <!-- What's Included Button -->
        <div class="absolute bottom-6 left-6 right-6">
            <button
                class="w-full bg-black bg-opacity-80 text-white py-3 rounded-lg font-normal hover:bg-opacity-90 transition-all duration-300 border border-orange-400/30"
                @click="handleIncludeItemsModal">
                What's included?
            </button>
        </div>

        <!-- Highlight effect for selected -->
        <div
            v-if="selectedPackage === pkg.id"
            class="absolute inset-0 rounded-2xl bg-gradient-to-t from-orange-400/20 to-transparent pointer-events-none"
        />
    </div>
</template>
<script setup>
const packageStore = usePackageStore()
const cartStore = useCartStore()
const guestStore = useGuestStore()
const { selectedPackage, selectedPackageName  } = storeToRefs(packageStore)
const { cartItems } = storeToRefs(cartStore)
const { count } = storeToRefs(guestStore)

selectedPackage.value = packageStore.packageList[1].id
cartItems.value = packageStore.packageList[1].items.map(item => ({ ...item, quantity: count.value }))

const handlePackageSelect = (packageId, packageItems, packageName, price) => {
    selectedPackage.value = packageId
    selectedPackageName.value = packageName
    cartItems.value = []
    cartItems.value.push({
        id: packageId,
        name: packageName,
        quantity: count.value,
        price: price,
        image:'/logo/logo2.png'
    })
    cartItems.value = cartItems.value.concat(packageItems)
    cartItems.value.forEach((item, index) => {
        if (index !== 0) item.price = 0
        item.quantity = count.value
    })

}
defineProps({
    packageList: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['changeIncludeItemsModalStatus'])

const handleIncludeItemsModal = () => {
    emit('changeIncludeItemsModalStatus')
}
</script>
