<template>
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Sidebar -->
      <div class="w-64 bg-white shadow-lg flex flex-col">
        <!-- Logo -->
        <div class="p-6 border-b">
          <div class="flex items-center space-x-2">
            <div class="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">WOO</span>
            </div>
            <span class="font-bold text-xl">SOO</span>
          </div>
        </div>

        <!-- Orders -->
        <div class="p-4 border-b">
          <div class="space-y-2">
            <div class="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
              <span class="font-medium">Order#123</span>
            </div>
            <div class="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <span class="font-medium">Order#123</span>
            </div>
          </div>
        </div>

        <!-- Food Categories -->
        <div class="flex-1 p-4">
          <div class="space-y-2">
            <div v-for="category in categories" :key="category.name"
                 class="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <span class="text-gray-600">{{ category.name }}</span>
              <span class="text-gray-400 text-sm">{{ category.count }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="p-4 border-t space-y-2">
          <button class="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span class="text-gray-600">Clean</span>
          </button>
          <button class="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-gray-600">Support</span>
          </button>
          <button class="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="text-gray-600">Bill</span>
          </button>
          <button class="w-full flex items-center space-x-3 p-3 text-white bg-green-500 rounded-lg hover:bg-green-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
            <span>Water</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex">
        <!-- Menu Section -->
        <div class="flex-1 p-6">
          <!-- Search Bar -->
          <div class="relative mb-6">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search"
              class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
            <svg class="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- Featured Item -->
          <div class="mb-8">
            <div class="relative bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl overflow-hidden">
              <div class="flex">
                <div class="flex-1 p-8 text-white">
                  <p class="text-sm opacity-90 mb-2">Dish of the day</p>
                  <h1 class="text-4xl font-bold mb-4">Beef<br>Bulgogi</h1>
                  <p class="text-2xl font-bold">₱459.99</p>
                </div>
                <div class="w-80 relative">
                  <img
                    src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop"
                    alt="Beef Bulgogi"
                    class="w-full h-full object-cover"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="flex space-x-4 mb-6">
            <button
              v-for="filter in filters"
              :key="filter"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-colors',
                activeFilter === filter
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
              @click="activeFilter = filter"
            >
              {{ filter }}
            </button>
          </div>

          <!-- Menu Grid -->
          <div class="grid grid-cols-3 gap-6">
            <div
              v-for="item in filteredMenuItems"
              :key="item.id"
              class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div class="aspect-square relative">
                <img
                  :src="item.image"
                  :alt="item.name"
                  class="w-full h-full object-cover"
                >
                <div class="absolute top-3 right-3 bg-white rounded-full px-2 py-1">
                  <div class="flex items-center space-x-1">
                    <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                    <span class="text-sm font-medium">{{ item.rating }}</span>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <h3 class="font-semibold text-lg mb-1">{{ item.name }}</h3>
                <p class="text-gray-500 text-sm mb-3">{{ item.description }}</p>
                <div class="flex justify-between items-center">
                  <span class="font-bold text-lg">₱{{ item.price }}</span>
                  <span class="text-gray-400 text-sm">{{ item.category }}</span>
                </div>
                <button
                  class="w-full mt-3 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                  @click="addToCart(item)"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="w-80 bg-white shadow-lg p-6">
          <h2 class="text-xl font-bold mb-6">Order summary</h2>

          <!-- Cart Items -->
          <div class="space-y-4 mb-6">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="flex items-center space-x-3"
            >
              <img
                :src="item.image"
                :alt="item.name"
                class="w-16 h-16 rounded-lg object-cover"
              >
              <div class="flex-1">
                <h4 class="font-medium">{{ item.name }}</h4>
                <p class="text-sm text-gray-500">{{ item.description }}</p>
                <div class="flex items-center space-x-2 mt-1">
                  <div class="flex items-center space-x-1">
                    <button
                      class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                      @click="updateQuantity(item.id, item.quantity - 1)"
                    >
                      -
                    </button>
                    <span class="text-sm font-medium w-8 text-center">{{ item.quantity }}</span>
                    <button
                      class="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                      @click="updateQuantity(item.id, item.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <span class="font-medium">₱{{ (item.price * item.quantity).toFixed(2) }}</span>
                <p class="text-xs text-gray-500">{{ item.quantity }}x</p>
              </div>
            </div>
          </div>

          <!-- Order Total -->
          <div class="border-t pt-4 space-y-2">
            <div class="flex justify-between text-gray-600">
              <span>Sub Total</span>
              <span>₱{{ subTotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>₱{{ tax.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between font-bold text-lg border-t pt-2">
              <span>Sub Total</span>
              <span>₱{{ total.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Place Order Button -->
          <button class="w-full mt-6 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-lg">
            Place order
          </button>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  const searchQuery = ref('')
  const activeFilter = ref('All dishes')

  const filters = ['All dishes', 'Most popular', 'Pork', 'Fish', 'Beef']

  const categories = [
    { name: 'Pizza', count: '2x' },
    { name: 'Pasta', count: '3x' },
    { name: 'Rice', count: '5x' },
    { name: 'Pasta', count: '2x' }
  ]

  const menuItems = [
    {
      id: 1,
      name: 'Beef Bulgogi',
      description: 'Other information, ingredients',
      price: 459.99,
      rating: 4.9,
      category: 'Beef',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Sushi Platter',
      description: 'Other information, ingredients',
      price: 899.99,
      rating: 4.8,
      category: 'Fish',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Breakfast Special',
      description: 'Other information, ingredients',
      price: 299.99,
      rating: 4.7,
      category: 'Most popular',
      image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
    },
    {
      id: 4,
      name: 'Pasta Carbonara',
      description: 'Other information, ingredients',
      price: 389.99,
      rating: 4.6,
      category: 'Pasta',
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300&h=300&fit=crop'
    },
    {
      id: 5,
      name: 'Korean BBQ',
      description: 'Other information, ingredients',
      price: 699.99,
      rating: 4.9,
      category: 'Pork',
      image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=300&h=300&fit=crop'
    },
    {
      id: 6,
      name: 'Spring Rolls',
      description: 'Other information, ingredients',
      price: 199.99,
      rating: 4.5,
      category: 'Most popular',
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
    }
  ]

  const cartItems = ref([
    {
      id: 1,
      name: 'Food name',
      description: 'Other information, ingredients',
      price: 459.99,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Food name',
      description: 'Other information, ingredients',
      price: 459.99,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Food name',
      description: 'Other information, ingredients',
      price: 459.99,
      quantity: 3,
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
    }
  ])

  const filteredMenuItems = computed(() => {
    let items = menuItems

    if (activeFilter.value !== 'All dishes') {
      items = items.filter(item => item.category === activeFilter.value)
    }

    if (searchQuery.value) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }

    return items
  })

  const subTotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  })

  const tax = computed(() => {
    return subTotal.value * 0.12 // 12% tax
  })

  const total = computed(() => {
    return subTotal.value + tax.value
  })

  const addToCart = (item) => {
    const existingItem = cartItems.value.find(cartItem => cartItem.id === item.id)

    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cartItems.value.push({
        ...item,
        quantity: 1
      })
    }
  }

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      cartItems.value = cartItems.value.filter(item => item.id !== itemId)
    } else {
      const item = cartItems.value.find(item => item.id === itemId)
      if (item) {
        item.quantity = newQuantity
      }
    }
  }
</script>
