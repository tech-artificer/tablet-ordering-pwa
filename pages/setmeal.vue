<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Minus, Plus } from 'lucide-vue-next'
import { useMenuStore } from '@/stores/Menu'
import { useCartStore } from '@/stores/Cart'
import { CircleCheckBig } from 'lucide-vue-next'
import Crown from '~/components/woosoo/package/packageCrown.vue'
import ModifierImagePreview from '~/components/ModifierImagePreview.vue'

const cart = useCartStore()

const { packageSelected } = storeToRefs(cart)

const isSelecting = ref(false)

const menuStore = useMenuStore()
const selectedPackage = ref(null)

const handleSelectedSet = (pkg: any) => {
    isSelecting.value = true

    packageSelected.value = pkg // set
    selectedPackage.value = pkg.id

    navigateTo('/menu')
}


const setTier = (set: any) => {
    let tier = 'Basic'
    // Find the key that matches a word in set.name
    if (set.name.toLowerCase().includes('noble')) {
        tier = 'Best'
    } else if (set.name.toLowerCase().includes('royal')) {
        tier = 'Premium'
    }

    return tier
}

definePageMeta({
    middleware: [
        function (to, from) {
            // Custom inline middleware
        },
        'order',
    ],
});

</script>


<template>
    <div class="flex flex-col gap-3 justify-center min-h-screen min-w-screen p-6">

        <!-- <div class="flex flex-row items-center gap-4 justify-center ">   
            <CommonImage :src="CustomLogo.LOGO_1" alt="logo" class="w-16 h-16" />
        </div> -->

        <div class="flex flex-row justify-center items-center gap-5 flex-wrap">

            <div v-for="(set, index) in menuStore.sets" 
                :key="set.id" 
                :class="[ 'min-w-[200px] max-w-[250px] min-h-[300px] relative rounded-2xl py-2 transform transition-all duration-500 hover:scale-105 hover:shadow-2xl',
                index === 0 ? 'bg-gray-400' : index === 1 ? 'bg-primary' : 'bg-gray-600',
            ]">
                <!-- Badge -->
                <div class="flex justify-center items-baseline mb-2">
                    <div class="bg-black px-2 py-1 rounded-full relative">
                        <span class="text-white flex flex-column text-center text-xs font-bold tracking-wide uppercase">
                            <Crown v-show="index == 1" />

                            <!-- <ElBadge type="primary" size="small">{{ menuStore.tiers[set.name[]] }}</ElBadge>  -->
                            <ElBadge type="primary" size="small" v-if="set.name.includes('Noble')"></ElBadge>
                            <ElBadge type="primary" size="small">{{ setTier(set) }}</ElBadge>
                        </span>

                        <div v-if="selectedPackage === set.id"
                            class="absolute top-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
                            <span class="text-white text-sm font-bold">
                                <CircleCheckBig />
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Package Name and Price -->
                <div class="text-center mb-4">
                    <h3 :class="[
                        'text-1xl font-semibold leading-tight',
                        index === 0 ? 'text-gray-300' : index === 2 ? 'text-primary' : 'text-black',
                    ]">
                        {{ set.name || 'Unnamed Package' }}
                    </h3>
                    <p class="text-2xl font-normal text-white package-price">
                        <span class="price-currency text-white">&#x20B1;</span> {{ set.price || 0 }}
                    </p>
                </div>

                <div v-if="set.modifiers && set.modifiers.length > 0"
                    class="flex flex-wrap justify-evenly gap-2 mb-2 px-2 pb-2">
                   
                       <!-- {{ set.modifiers.map((modifier) => modifier.img_url) }} -->
                        <el-scrollbar height="300px" class="w-full ml-3 p-3" >
                            <ModifierImagePreview :modifiers="set.modifiers" />
                        </el-scrollbar>

                        <!-- <div :class="[
                            modifierIndex === 0 ? 'w-24 h-24' : modifierIndex === 1 ? 'w-16 h-16' : modifierIndex === 2 ? 'w-28 h-28' : 'w-24 h-24',
                            ' bg-black bg-opacity-40 rounded-full border-2 border-orange-400/30 flex items-center justify-center overflow-hidden'
                        ]"> -->
                            <!-- <div class="w-full h-full bg-gradient-to-br rounded-full flex items-center justify-center">
                                <CommonImage :src="modifier.img_url || '/default-food.png'"
                                    :alt="modifier.name || 'Food item'" :style-class="'w-full h-full object-cover'" />
                            </div> -->
                        <!-- </div> -->
                
                </div>

                <!-- Food Images -->
                <!-- <div v-if="set.modifiers && set.modifiers.length > 0"
                    class="flex flex-wrap justify-start gap-6 mb-8 p-6">
                    sdsd

                     <div class="flex flex-wrap justify-evenly gap-6 mb-8 px-4">
                        <div v-for="(modifier, modifierIndex) in set.modifiers.slice(0, 2)" :key="modifierIndex"
                            class="relative">
                            <div :class="[
                                modifierIndex === 0 ? 'w-24 h-24' : modifierIndex === 1 ? 'w-16 h-16' : modifierIndex === 2 ? 'w-28 h-28' : 'w-24 h-24',
                                ' bg-black bg-opacity-40 rounded-full border-2 border-orange-400/30 objet-cover flex items-center justify-center overflow-hidden'
                            ]">
                                <div
                                    class="w-full h-full bg-gradient-to-br rounded-full flex items-center justify-center">
                                    <CommonImage :src="modifier.img_url || '/default-food.png'"
                                        :alt="modifier.name || 'Food item'"
                                        :style-class="'w-full h-full object-cover'" />
                                </div>
                            </div>
                        </div>
                    </div> 


                </div>
                <div v-else class="flex justify-center mb-8 px-2">
                    <p class="text-white text-sm opacity-70">No items available</p>
                </div> -->

                <div class="absolute bottom-6 left-6 right-6">
                    <button :disabled="isSelecting && selectedPackage === set.id" :class="[
                        'w-full py-3 rounded-lg font-normal transition-all duration-300 border border-orange-400/30',
                        (isSelecting && selectedPackage === set.id)
                            ? 'bg-orange-600 text-white cursor-not-allowed'
                            : 'bg-black bg-opacity-80 text-white hover:bg-opacity-90'
                    ]" @click="handleSelectedSet(set)">

                        <div v-if="isSelecting && selectedPackage === set.id" class="flex items-center justify-center">
                            <div
                                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Selecting...
                        </div>

                        <span v-else>Select Package</span>
                    </button>
                </div>

                <!-- <div class="absolute bottom-6 left-6 right-6">
                <button -->

                <!-- > -->
                <!-- Loading spinner for the specific package being selected -->
                <!-- <div class="flex items-center justify-center">
                            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Selecting...
                        </div> -->
                <!-- Default button text -->

                <!-- </button>
                </div> -->

                <!-- Highlight effect for selected -->
                <!-- <div v-if="selectedPackage === set.id"
                    class="absolute inset-0 rounded-2xl bg-gradient-to-t from-orange-400/20 to-transparent pointer-events-none" /> -->
            </div>



        </div>


    </div>
</template>



<style scoped>
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.5s ease-out;
}

.package-price {
    font-size: 1.75rem;
    font-weight: 900;
    margin-top: 0.5rem;
}

.price-currency {
    font-size: 1rem;
    vertical-align: top;
    margin-right: 0.25rem;
}
</style>
