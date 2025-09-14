import type { Menu } from '~/types/index';

export const useMenuStore = defineStore('menu', {
    state: () => ({
        menuItems: [] as Array<Menu>,
        isLoading: false as boolean,
        featureItems: [] as Array<Menu>,
        currentFilter: null as string | null,
        currentSearchQuery: null as string | null,
    }),

    getters: {
        hasMenus: (state) => {
            return state.menuItems && state.menuItems.length > 0
        }
    },

    actions: {
        async exampleData() {
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
            ]
            this.featureItems = menuItemExample as Array<Menu>
            this.isLoading = false
            console.log('Example menus loaded:', this.featureItems)
        },

        async getAllMenus() {
            if (this.currentFilter === 'all' && !this.currentSearchQuery) {
                return
            }

            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus', {
                    method: 'GET',
                })

                this.menuItems = Array.isArray(response) ? response : response.data || []
                this.currentFilter = 'all'
                this.currentSearchQuery = null

                console.log('All menus fetched successfully:', this.menuItems.length, 'items')
            } catch (error) {
                console.error('Error fetching all menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async getMenuByCategory(category: string) {
            if (this.currentFilter === category && !this.currentSearchQuery) {
                return
            }

            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/category', {
                    method: 'GET',
                    params: {
                        category: category
                    }
                } as object)

                this.menuItems = Array.isArray(response) ? response : response.data || []
                this.currentFilter = category
                this.currentSearchQuery = null

                console.log(`Category '${category}' menus fetched successfully:`, this.menuItems.length, 'items')
            } catch (error) {
                console.error('Error fetching category menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async searchMenus(query: string) {
            if (this.currentSearchQuery === query) {
                return
            }

            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/search', {
                    method: 'GET',
                    params: {
                        q: query
                    }
                } as object)

                this.menuItems = Array.isArray(response) ? response : response.data || []
                this.currentFilter = null
                this.currentSearchQuery = query

                console.log(`Search results for '${query}':`, this.menuItems.length, 'items')
            } catch (error) {
                console.error('Error searching menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        async getMenuByCourse(course: string) {
            if (this.currentFilter === `course_${course}` && !this.currentSearchQuery) {
                return
            }

            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/course', {
                    method: 'GET',
                    params: {
                        course: course
                    }
                } as object)

                this.menuItems = Array.isArray(response) ? response : response.data || []
                this.currentFilter = `course_${course}`
                this.currentSearchQuery = null

                console.log(`Course '${course}' menus fetched successfully:`, this.menuItems.length, 'items')
            } catch (error) {
                console.error('Error fetching course menus:', error)
                throw error
            } finally {
                this.isLoading = false
            }
        },

        resetFilterState() {
            this.currentFilter = null
            this.currentSearchQuery = null
        },

        clearMenuItems() {
            this.menuItems = []
            this.currentFilter = null
            this.currentSearchQuery = null
        }
    },

    persist: {
        key: 'menu-store',
        storage: import.meta.client ? localStorage : undefined,
        pick: ['featureItems'],
    }
})
