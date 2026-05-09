<script setup lang="ts">
import {
    User,
    House,
    ShoppingCart
} from "@element-plus/icons-vue"
import { useMenuStore } from "../../stores/Menu"
import { logger } from "../../utils/logger"

const menuStore = useMenuStore()
logger.debug(menuStore.packages)

const props = defineProps({
    pkg: Object,
    selected: Boolean,
})

const emit = defineEmits(["packageConfirmed"])

// Reactive state
const guestCount = ref(4)
const selectedPackageId = ref("premium") // Default selection for demonstration

// Methods
const selectPackage = (packageId: string) => {
    selectedPackageId.value = packageId
}

const confirmAndProceed = () => {
    if (!selectedPackageId.value) {
        return
    }

    const packageDetails = {
        guestCount: guestCount.value,
        packageId: selectedPackageId.value,
    }

    emit("packageConfirmed", packageDetails)
}
</script>

<template>
    <div class="flex flex-col items-center justify-center">
        <!--
    <section>
      <h2 class="font-raleway text-3xl text-white font-semibold mb-4">Choose Your Package</h2>
      <p class="font-kanit text-primary">Some Text</p>

      <div class="flex flex-row gap-6">
        <OrderingPackageCard />
      </div>

    </section> -->

        <!-- PackageCard removed — use pages/order/packageSelection.vue -->
        <!-- <QuickButtons /> -->

        <!-- Bottom Navigation -->
        <div class="bg-white border-t  px-6 w-full py-4">
            <div class="flex justify-between items-center w-100">
                <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
                    <el-icon class="mr-2">
                        <House />
                    </el-icon>
                    Home
                </el-button>
                <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
                    <el-icon class="mr-2">
                        <ShoppingCart />
                    </el-icon>
                    Cart
                </el-button>
                <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
                    <el-icon class="mr-2">
                        <User />
                    </el-icon>
                    Profile
                </el-button>
            </div>
        </div>
    </div>

    <!-- <div class="p-4 rounded-lg transition-all duration-200"
    :class="[props.selected ? 'border-4 border-orange-500 bg-gray-700 shadow-xl' : 'border border-gray-700 bg-gray-700 hover:bg-gray-600']">

    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-xl font-bold mb-1" :class="props.selected ? 'text-orange-500' : 'text-white'">
          <span v-if="true" class="text-sm font-normal text-gray-300">P599 / </span>
          <span v-if="false" class="text-sm font-normal text-gray-300">P899 / person</span>
          Noble Selection
        </h3>
        <p class="text-xs text-gray-400"> meats </p>
      </div>
      <el-icon v-if="props.selected" :size="24" class="text-orange-500">
        <Check />
      </el-icon>
    </div>
  </div> -->
</template>

<style scoped>
/* Ensure custom styling for large, circular buttons */

/* Element Plus customizations */
:deep(.el-card) {
  border-radius: 16px;
}

:deep(.el-card__body) {
  padding: 0;
}

:deep(.el-button) {
  border-radius: 12px;
}

/* Ensure the outer container styling for the background image */
</style>
