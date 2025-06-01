import { defineStore } from 'pinia'

interface Menu {
    id: number,
    name: string,
    barcode: string,
    price: number,
    description: string,
    image: string,
    category_id: number,
    restaurant_id: number,
}

export const useMenuStore = defineStore('menu', {
    state: () => ({
        menuItems: [] as Array<Menu>,
        isLoading: false as boolean,
        featureItems: [] as Array<Menu>,
    }),
    getters: {
        hasMenus: (state) => {
            return state.menuItems && state.menuItems.length > 0
        }
    },
    actions: {
        async getAllMenus() {
            this.isLoading = true
            try {
                const response = await useMainApiO('/api/pos/menus', {
                    method: 'GET',
                })
                this.menuItems = Array.isArray(response) ? response : response.data || []
                console.log('Menus fetched successfully:', this.menuItems)
            } catch (error) {
                console.error('Error fetching menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
        async exampleData () {
            this.isLoading = true
            const menuItemExample = [
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
                    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                },
                {
                    id: 5,
                    name: 'Korean BBQ',
                    description: 'Other information, ingredients',
                    price: 699.99,
                    rating: 4.9,
                    category: 'Pork',
                    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                },
                {
                    id: 6,
                    name: 'Spring Rolls',
                    description: 'Other information, ingredients',
                    price: 199.99,
                    rating: 4.5,
                    category: 'Most popular',
                    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                },
                {
                    id: 7,
                    name: 'Vegan Burger',
                    description: 'Other information, ingredients',
                    price: 249.99,
                    rating: 4.3,
                    category: 'Fish',
                    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
                },
                {
                    id: 8,
                    name: 'Chicken Wings',
                    description: 'Other information, ingredients',
                    price: 399.99,
                    rating: 4.4,
                    category: 'Chicken',
                    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
                },
            ]
            this.featureItems = menuItemExample
            this.menuItems = menuItemExample
            this.isLoading = false
            console.log('Menus fetched successfully:', this.menuItems)
        }
    },
    persist: {
        key: 'menu-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['menuItems', 'featureItems'],
    }
})
