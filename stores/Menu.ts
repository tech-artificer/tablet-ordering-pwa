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
        menus: [] as Array<Menu>,
        isLoading: false as boolean,
    }),
    getters: {
        hasMenus: (state) => {
            return state.menus && state.menus.length > 0
        }
    },
    actions: {
        async getAllMenus() {
            this.isLoading = true
            try {
                const response = await useMainApiO('/api/pos/menus', {
                    method: 'GET',
                })
                this.menus = Array.isArray(response) ? response : response.data || []
                console.log('Menus fetched successfully:', this.menus)
            } catch (error) {
                console.error('Error fetching menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
    },
    persist: {
        key: 'menu-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['menus'],
    }
})
