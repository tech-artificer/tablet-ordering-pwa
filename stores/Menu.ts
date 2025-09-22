import { defineStore } from 'pinia'
import type { MenuItem } from '~/types/menu'


export interface CarouselItem {
  title: string
  price: number
  image: string
  tag?: string
}


export const useMenuStore = defineStore('menu', {
    state: () => ({
        desserts: [] as MenuItem[],
        sides: [] as MenuItem[],
        beverage: [] as MenuItem[],
        sets: [] as MenuItem[],
        modifiers: [] as MenuItem[],
        featuredItems: {} as CarouselItem[],
        tiers: {
            classic: 'Basic',
            noble: 'Best',
            royal: 'Premium'
        },
        loading: false,
        error: null as string | null,
    }),

    actions: {
        async fetchCourses() {
            const data = await useMainApiAuth('api/menus/course', {
                method: 'GET',
                params: {
                    course: CategoryFilter.DESSERT
                }
            })

            this.desserts = Array.isArray(data) ? data : data.data
        },

        async fetchGroups() {
            const data = await useMainApiAuth('api/menus/group', {
                method: 'GET',
                params: {
                    group: CategoryFilter.SIDES
                }
            })

            this.sides = Array.isArray(data) ? data : data.data
        },

        async fetchCategories() {
            const data = await useMainApiAuth('api/menus/category', {
                method: 'GET',
                params: {
                    category: CategoryFilter.BEVERAGE
                }
            })

            this.beverage = Array.isArray(data) ? data : data.data
        },
        async fetchModifiers() {
            const data = await useMainApiAuth('api/menus/modifiers')
        },

        async fetchSets() {
            const data = await useMainApiAuth('api/menus/with-modifiers')
            console.log('Sets', data)
            this.sets = Array.isArray(data) ? data : data.data
            console.log('Sets', this.sets)
            // each set has modifiers. seet[0].modifiers
          this.modifiers = this.sets.reduce<MenuItem[]>((accumulator, currentSet) => {
            return [...accumulator, ...currentSet.modifiers];
            }, []);
        },

        async getFeaturedItems() {
            this.featuredItems = [
                { title: 'Sushi Platter', price: 999, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1000&h=1000&fit=crop', tag: 'Chef’s Pick' },
                { title: 'Breakfast Special', price: 499, image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1000&h=1000&fit=crop', tag: 'Best Seller' },
                { title: 'Samgyupsal Set', price: 799, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1000&h=1000&fit=crop', tag: 'Limited' },
            ]
        },


        reset() {
            // this.items = []
            this.sets = [],
                this.modifiers = [],
                this.desserts = [],
                this.sides = [],
                this.beverage = [],
                this.loading = false
            this.error = null
        },

        async init() {
            this.loading = true
            try {
                await Promise.all([
                    this.fetchCourses(),
                    this.fetchGroups(),
                    this.fetchCategories(),
                    this.fetchModifiers(),
                    this.fetchSets(),
                    this.getFeaturedItems
                ])
            } catch (err) {
                console.error(err)
                this.error = 'Failed to load menu data'
            } finally {
                this.loading = false
            }
        },
    },

    getters: {
        // Items grouped by course → group → category
        menuSets: (state) => state.sets,
        menuSides: (state) => state.sides,
        menuDesserts: (state) => state.desserts,
        menuBeverage: (state) => state.beverage,
        menuModifiers: (state) => {
            const cartStore = useCartStore()
            if (cartStore.packageSelected.modifiers.length > 0) {
                return cartStore.packageSelected.modifiers    
            }

            return state.modifiers
        },
    },

    persist: {
        key: 'menu-store',
        storage: localStorage,
        pick: ['sides', 'desserts', 'beverage', 'sets', 'modifiers', 'featuredItems'],
    },
})

