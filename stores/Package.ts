import { defineStore } from 'pinia'
interface Menu {
    id: number,
    menu_id: number,
    name: string,
    barcode: string,
    price: number,
    description: string,
    image: string,
    category_id: number,
    restaurant_id: number,
    rating: number,
}
interface Package {
    id: number,
    name: string,
    subtitle: string,
    price: string,
    badge: string,
    bgColor: string,
    textColor: string,
    images: string[],
    items: Array<Menu>
}

export const usePackageStore = defineStore('package', {
    state: () => ({
        packageList: [] as Array<Package>,
        sideList: [] as Array<Menu>,
        desertList: [] as Array<Menu>,
        beverageList: [] as Array<Menu>,
        selectedPackage: null as number | null,
        selectedPackageName: null as string | null,
        isLoading: false as boolean,
    }),

    getters: {
        getPackageById: (state) => (id: number) => state.packageList.find((pkg) => pkg.id === id)
    },

    actions: {
        async getSetMeals () {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/with-modifiers', {
                    method: 'GET',
                })
                this.packageList = Array.isArray(response) ? response : response.data || []
                console.log('Packages fetched successfully:', this.packageList)
            } catch (error) {
                console.error('Error fetching packages:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
        async getSides () {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/group', {
                    method: 'GET',
                    params: {
                        group: CategoryFilter.SIDES
                    }
                } as object)
                this.sideList = Array.isArray(response) ? response : response.data || []
                console.log('Sides fetched successfully:', this.sideList)
            } catch (error) {
                console.error('Error fetching sides:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
        async getDesserts () {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/group', {
                    method: 'GET',
                    params: {
                        group: CategoryFilter.DESSERT
                    }
                } as object)
                this.desertList = Array.isArray(response) ? response : response.data || []
                console.log('Deserts fetched successfully:', this.desertList)
            } catch (error) {
                console.error('Error fetching deserts:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },
        async getBeverage() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/category', {
                    method: 'GET',
                    params: {
                        category: CategoryFilter.BEVERAGE
                    }
                } as object)
                this.beverageList = Array.isArray(response) ? response : response.data || []
                console.log('Beverage fetched successfully:', this.beverageList)
            } catch (error) {
                console.error('Error fetching beverage:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        }
    },

    persist: {
        key: 'package-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['packageList', 'sideList', 'desertList', 'beverageList', 'selectedPackage', 'selectedPackageName'],
    }
})
