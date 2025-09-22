<template>
    <div v-if="isValidPackageList" class="flex flex-row gap-4 max-w-7xl mx-auto mb-12 justify-center items">
        <div
            v-for="(pkg, index) in validPackages"
            :key="pkg.id"
            :class="[
                'w-[240px] min-h-[400px] relative rounded-2xl py-4 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-2xl',
                selectedPackage === pkg.id
                    ? 'ring-2 ring-orange-300 shadow-2xl shadow-orange-500/30 scale-105'
                    : 'hover:ring-2 hover:ring-orange-300',
                index === 0 ? 'bg-gray-400' : index === 1 ? 'bg-primary' : 'bg-gray-600',
            ]"
            @click="handlePackageSelect(pkg)"
        >
            <!-- Badge -->
            <div class="flex justify-center mb-4">
                <div class="bg-black px-4 py-1 rounded-full relative">
                    <span class="text-white text-xs font-bold tracking-wide uppercase">
                        <WoosooPackageCrown
                            v-show="pkg.badge && pkg.badge.toLowerCase() === CategoryFilter.BEST"
                        />

                        {{ pkg.badge || 'Package' }}
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
                    {{ pkg.name || 'Unnamed Package' }}
                </h3>
                <p class="text-2xl font-normal text-white">
                    &#x20B1; {{ pkg.price || 0 }}
                </p>
            </div>

            <!-- Food Images -->
            <div v-if="pkg.items && pkg.items.length > 0" class="flex flex-wrap justify-evenly gap-6 mb-8 px-2">
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
                            <CommonImage
                                :src="item.img_url || '/default-food.png'"
                                :alt="item.name || 'Food item'"
                                :style-class="'w-full h-full object-cover'"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="flex justify-center mb-8 px-2">
                <p class="text-white text-sm opacity-70">No items available</p>
            </div>

            <!-- What's Included Button -->
            <div class="absolute bottom-6 left-6 right-6">
                <button
                    :disabled="isSelecting && selectingPackageId === pkg.id"
                    :class="[
                        'w-full py-3 rounded-lg font-normal transition-all duration-300 border border-orange-400/30',
                        (isSelecting && selectingPackageId === pkg.id)
                            ? 'bg-orange-600 text-white cursor-not-allowed'
                            : 'bg-black bg-opacity-80 text-white hover:bg-opacity-90'
                    ]"
                    @click="handleSelectPackage(pkg)"
                >
                    <!-- Loading spinner for the specific package being selected -->
                    <div v-if="isSelecting && selectingPackageId === pkg.id" class="flex items-center justify-center">
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Selecting...
                    </div>
                    <!-- Default button text -->
                    <span v-else>Select Package</span>
                </button>
            </div>

            <!-- Highlight effect for selected -->
            <div
                v-if="selectedPackage === pkg.id"
                class="absolute inset-0 rounded-2xl bg-gradient-to-t from-orange-400/20 to-transparent pointer-events-none"
            />
        </div>
    </div>
    <div v-else-if="isLoading" class="flex flex-col items-center justify-center p-8">
        <div class="text-center">
            <div class="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
            <h3 class="text-lg font-medium text-white mb-2">Loading packages...</h3>
            <p class="text-gray-400">Please wait while we fetch the latest packages.</p>
        </div>
    </div>
    <div v-else class="flex flex-col items-center justify-center p-8">
        <div class="text-center">
            <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.5"/>
                </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">No packages available</h3>
            <p class="text-gray-400">Please check back later or contact support.</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useOrderStore } from '~/stores/Order'
const orderStore = useOrderStore()

// read entire order
const order = computed(() => orderStore.order)

const packageStore = usePackageStore()
const cartStore = useCartStore()
const guestStore = useGuestStore()
const menuStore = useMenuStore()

const { selectedPackage, selectedPackageName, packageList, isLoading } = storeToRefs(packageStore)
const { cartItems } = storeToRefs(cartStore)
const { count } = storeToRefs(guestStore)
const { menuItems } = storeToRefs(menuStore)

function setOrderPackage(selectedPackage) {
    console.log('Package was set', selectedPackage)
//   orderStore.updateOrder({ orderedPackage: selectedPackage })
    const subtotal = (Number(selectedPackage.price) * Number(order.value.guest_count))  + Number(selectedPackage.tax_amount)
    orderStore.updateOrder({
        orderedPackage: selectedPackage,
        total: subtotal,
        tax: selectedPackage.tax,
        subTotal: subtotal,
        discount: selectedPackage.discount,
        tax_amount: selectedPackage.tax_amount,
        discount_amount: selectedPackage.discount,
    })
}

// function updateOrderDetails(item: any) {
//   orderStore.updateOrder({ orderedMenus: [...current, item] })
// }

// Loading state for package selection
const isSelecting = ref(false)
const selectingPackageId = ref(null)

const validPackages = computed(() => {
    if (!packageList.value || !Array.isArray(packageList.value)) {
        return []
    }

    return packageList.value.map((pkg, index) => ({
        id: pkg.id,
        ordered_menu_id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        subtotal: pkg.price,
        receipt_name: pkg.receipt_name,
        badge: index === 1 ? 'BEST' : index === 0 ? 'BASIC' : 'PREMIUM',
        items: pkg.modifiers || [],
        img_url: pkg.img_url,
        tax: pkg.tax,
        discount: pkg.discount,
        tax_amount: pkg.tax_amount,
    })).filter(pkg =>
        pkg &&
        pkg.id !== null &&
        pkg.id !== undefined &&
        pkg.id !== ''
    )
})

const isValidPackageList = computed(() => {
    return validPackages.value.length > 0
})

const initializeSelectedPackage = () => {
    try {
        if (validPackages.value.length > 0) {
            const defaultPackage = selectedPackage.value || validPackages.value[0]

            if (defaultPackage && defaultPackage.id) {
                selectedPackage.value = defaultPackage.id
                selectedPackageName.value = defaultPackage.name

                if (defaultPackage.items && Array.isArray(defaultPackage.items)) {
                    console.log('defaultPackage.items', defaultPackage.items)
                    cartItems.value = [
                        {
                            id: defaultPackage.id,
                            ordered_menu_id: defaultPackage.id,
                            menu_id: defaultPackage.id,
                            name: defaultPackage.name || 'Unnamed Package',
                            receipt_name: defaultPackage.receipt_name || 'Unnamed Package',
                            quantity: count.value || 1,
                            discount: 0,
                            tax_amount: 0,
                            tax: 0,
                            price: defaultPackage.price || 0,
                            subtotal: defaultPackage.price || 0,
                            img_url: defaultPackage.img_url ?? CustomLogo.LOGO_2
                        },
                        ...defaultPackage.items.map(item => ({
                            ...item,
                            menu_id: item.id,
                            ordered_menu_id: item.id,
                            price: 0,
                            subtotal: 0,
                            tax_amount: 0,
                            tax: 0,
                            quantity: count.value || 1,
                            discount: 0,
                            img_url: defaultPackage.img_url ?? CustomLogo.LOGO_2
                        })),
                    ]
                }
            }
        }
    } catch (error) {
        console.error('Error initializing selected package:', error)
        selectedPackage.value = null
        cartItems.value = []
    }
}

const handlePackageSelect = (packageSelected) => {
    // if (isSelecting.value) return // Prevent multiple clicks

    isSelecting.value = true
    setOrderPackage(packageSelected)


    // orderStore.order.orderedPackage = packageSelected
    // orderStore.order.tax = packageSelected.tax
    // orderStore.order.subTotal = packageSelected.subTotal
    // orderStore.order.total = packageSelected.total
    // orderStore.order.tax_amount = packageSelected.tax_amount
    // orderStore.order.discount = packageSelected.discount
    try {
        if (!packageSelected.id) {
            console.error('Package ID is required')
            return
        }

        selectedPackage.value = packageSelected.id
        selectedPackageName.value =  packageSelected.name || 'Unnamed Package'
        cartItems.value = []

        cartItems.value.push({
            id: packageSelected.id,
            ordered_menu_id: packageSelected.id,
            menu_id: packageSelected.id,
            name: packageSelected.name || 'Unnamed Package',
            receipt_name: packageSelected.receipt_name || 'Unnamed Package',
            subtotal: packageSelected.price || 0,
            quantity: count.value || 1,
            discount: 0,
            tax_amount: packageSelected.tax_amount || 0,
            tax: 0,
            price: packageSelected.price || 0,
            img_url: packageSelected.img_url ?? CustomLogo.LOGO_2,
            modifiers: packageSelected.items
        })

        if (packageSelected.items && Array.isArray(packageSelected.items)) {
            menuItems.value = packageSelected.items.filter(item => item && item.id)

            cartItems.value.forEach((item, index) => {
                if (index !== 0) item.price = 0
                item.quantity = count.value || 1
                item.menu_id = item.id
                item.ordered_menu_id = item.id
                item.subtotal = item.price || 0
                item.discount = 0
                item.tax_amount = item.tax_amount || 0
                item.tax = 0
                item.img_url = item.img_url ?? CustomLogo.LOGO_2
            })
        }
    } catch (error) {
        console.error('Error selecting package:', error)
    }
}

// New function to handle the button click with loading
const handleSelectPackage = async (packageSelected) => {
    if (isSelecting.value) return // Prevent multiple clicks

    try {
        // Set loading state for the specific package
        isSelecting.value = true
        selectingPackageId.value = packageSelected.id

        // Simulate API call or processing time (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Call the original package selection logic
        handlePackageSelect(packageSelected)

        // Emit the modal change event
        handleIncludeItemsModal()

    } catch (error) {
        console.error('Error during package selection:', error)
    } finally {
        // Reset loading state
        isSelecting.value = false
        selectingPackageId.value = null
    }
}

const emit = defineEmits(['changeIncludeItemsModalStatus'])

const handleIncludeItemsModal = () => {
    emit('changeIncludeItemsModalStatus')
}

watch(() => packageList.value, () => {
    if (packageList.value.length > 0) {
        initializeSelectedPackage()
    }
}, { deep: true })
</script>
