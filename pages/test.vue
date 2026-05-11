<script setup lang="ts">
import { Info, Plus } from "lucide-vue-next"
import { useMenuStore } from "../stores/Menu"
import type { Menu } from "../types"

const menuStore = useMenuStore()

const activeCategory = ref("All Meals")

const categories = [
    "Meats",
    "Sides",
    "Combo Sets",
    "Drinks",
    "Desserts",
]

const menus = ref<Menu[]>([
    {
        id: "meats",
        category: "Meats",
        is_refillable: true,
        is_active: true,
        items: [] as any
    }, {
        id: "sides",
        category: "Sides",
        is_refillable: true,
        is_active: false,
        items: menuStore.sides as any
    },
    {
        id: "alacarte",
        category: "A La Carte",
        is_refillable: true,
        is_active: false,
        items: []
    }, {
        id: "beverages",
        category: "Beverages",
        is_refillable: true,
        is_active: false,
        items: menuStore.beverages as any
    }
])

const meals = [
    {
        name: "Spicy Beef Brisket",
        price: "₱599.00",
        description: "Perfectly Grilled Steak",
        image:
      "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Beef Short Ribs",
        price: "₱699.00",
        description: "Korean Style Short Ribs",
        image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Spicy Beef Brisket",
        price: "₱599.00",
        description: "Marinated Korean Style",
        image:
      "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Spicy Beef Brisket",
        price: "₱899.00",
        description: "With Mashed Potato",
        image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Prime Ribeye Steak",
        price: "₱1,299.00",
        description: "Premium Ribeye Cut",
        image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Buffalo Drumsticks",
        price: "₱499.00",
        description: "Spicy Chicken Wings",
        image:
      "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Spicy Pork Burger",
        price: "₱799.00",
        description: "Juicy Pork Patties",
        image:
      "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Garlic Butter Prawns",
        price: "₱999.00",
        description: "Fresh Grilled Prawns",
        image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Garlic Butter Prawns",
        price: "₱899.00",
        description: "With Lemon Butter",
        image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop",
        badge: null,
    },
    {
        name: "Lite Honey Ribs",
        price: "₱649.00",
        description: "Sweet & Tender",
        image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
        badge: null,
    },
]

const heroImages = [
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=800&h=400&fit=crop",
]
</script>

<template>
    <div class="flex h-screen w-screen justify-center bg-white rounded-xl shadow-2xl">
        <el-row class="w-screen h-screen">
            <!-- <el-col :span="2">
        <div class="h-screen flex flex-col justify-center gap-5 items-center p-2 ">
          <div
            class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-white flex items-center justify-center text-black font-bold">
            12
          </div>

          <button
            class="w-12 h-12 bg-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all">
            <ShoppingCart :size="21" />
          </button>
            <button
            class="w-12 h-12 bg-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all">
            <ShoppingCart :size="21" />
          </button>
            <button
            class="w-12 h-12 bg-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all">
            <ShoppingCart :size="21" />
          </button>
            <button
            class="w-12 h-12 bg-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all">
            <ShoppingCart :size="21" />
          </button>

        </div>
      </el-col> -->
            <el-col :span="17" class="flex-auto w-full h-full" style="overflow: hidden;">
                <!-- Hero Carousel -->
                <div class="flex-1 min-w-0 p-0">
                    <div class="relative">
                        <UiHeader />
                        <!-- <el-carousel :interval="3000" arrow="always" indicator-position="none" class="h-[200px]">

              <el-carousel-item v-for="(img, idx) in heroImages" :key="idx" class="rounded-2xl h-[200px]">
                <img :src="img" :alt="`Feast ${idx + 1}`" class="w-full h-[200px] object-cover rounded-2xl" />
              </el-carousel-item>
            </el-carousel> -->
                    </div>
                </div>

                <!-- Category Tabs -->
                <div class="flex flex-col gap-2 overflow-x-auto scrollbar-hide ml-1 py-2">
                    <div class="flex gap-2 mb-2">
                        <button
                            v-for="(cat, idx) in categories"
                            :key="idx"
                            class="px-4 py-1 rounded-full font-kanit whitespace-nowrap transition"
                            :class="activeCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            "
                            @click="activeCategory = cat"
                        >
                            {{ cat }}
                        </button>
                    </div>
                    <h2 class="text-l font-raleway font-extrabold ml-2">
                        {{ activeCategory }}
                    </h2>
                </div>

                <!-- Category Title -->

                <!-- Meals Grid -->
                <!-- <div class="flex-1 h-full min-h-0 overflow-y-scroll"> -->
                <!-- <el-scrollbar always class="flex-1 "> -->
                <div class="scroll-container menu-scroll bg-secondary">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-2">
                        <div
                            v-for="(meal, idx) in meals"
                            :key="idx"
                            class="bg-white text-black transition group rounded"
                        >
                            <div class="relative">
                                <img :src="meal.image" :alt="meal.name" class="w-full h-28 md:h-32 object-cover duration-300 rounded shadow-lg">

                                <button
                                    class="absolute top-2 right-2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Info :size="16" />
                                </button>
                            </div>

                            <div class="p-3">
                                <h3 class="font-semibold text-sm text-black font-raleway mb-1 line-clamp-1">
                                    {{ meal.name }}
                                </h3>
                                <p class="text-xs text-secondary mb-2 line-clamp-1 font-kanit">
                                    {{ meal.description }}
                                </p>

                                <div class="flex items-center justify-between">
                                    <span class="text-primary font-kanit font-bold text-sm">{{
                                        meal.price
                                    }}</span>

                                    <button
                                        class="w-7 h-7 self-end bg-primary text-secondary rounded-lg p-1 flex items-center hover:bg-orange-400 justify-center"
                                    >
                                        <Plus />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- </el-scrollbar> -->
                <!-- </div> -->

                <!-- Floating Cart -->
            </el-col>

            <el-col :span="7" class="bg-secondary border-l border-secondary">
                <OrderingPreOrderSelection />
                <!-- <button
          class="fixed bottom-8 right-8 w-14 h-14 bg-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all">
          <ShoppingCart :size="24" />

          <span
            class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
            3
          </span>
        </button> -->
            </el-col>
        </el-row>
    </div>
</template>

<style scoped>
.scroll-container {
  /* 1. Set a fixed height for the scrollable area */
  max-height: 500px; /* Adjust this value as needed, e.g., to '100vh' minus header height */

  /* 2. Enable vertical scrolling only when content overflows */
  overflow-y: auto;

  /* Optional: For some modern browsers (like Chrome/Edge/Safari),
     this helps hide the scrollbar track until scrolling starts.
     However, the standard 'overflow-y: auto' *already* ensures
     the scrollbar only appears when needed. */
  /* This is non-standard and might not be cross-browser safe: */
  scrollbar-width: thin;
  padding-bottom: 100px;
  /* scrollbar-color: transparent transparent; */
}
/* Custom scrollbar for middle column */
.menu-scroll::-webkit-scrollbar {
  width: 8px;
}

.menu-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.menu-scroll::-webkit-scrollbar-thumb {
  background: #c7d2fe;
  border-radius: 4px;
}

.menu-scroll::-webkit-scrollbar-thumb:hover {
  background: #a5b4fc;
}
</style>
