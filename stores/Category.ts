import { defineStore } from 'pinia'

interface Category {
    id: number,
    name: string,
}
interface CourseType {
    id: number,
    name: string,
}
interface MenuGroup {
    id: number,
    name: string,
}

export const useCategoryStore = defineStore('category', {
    state: () => ({
        categories: [] as Array<Category>,
        courseTypes: [] as Array<CourseType>,
        menuGroups: [] as Array<MenuGroup>,
        isLoading: false as boolean,
        errorMessage: null as string | null,
    }),

    getters: {},

    actions: {
        async getStaticCategories ()
        {
            this.categories = [
                {
                    id: 1,
                    name: 'Starter',
                },
                {
                    id: 2,
                    name: 'Main Course',
                },
                {
                    id: 3,
                    name: 'Salad and Soup',
                },
                {
                    id: 4,
                    name: 'Dessert',
                },
                {
                    id: 5,
                    name: 'Beverage',
                },
            ]
        },
        async getAllCategories() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/categories', {
                    method: 'GET',
                })
                this.categories = response
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error
                if (error.response) {
                    if (error.response._data.errors) {
                        this.errorMessage = error.response._data.errors
                    } else {
                        this.errorMessage = error.response._data.message
                    }
                }
            }
        },
        async getAllCourseTypes() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/course-types', {
                    method: 'GET',
                })
                this.courseTypes = response
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error
                if (error.response) {
                    if (error.response._data.errors) {
                        this.errorMessage = error.response._data.errors
                    } else {
                        this.errorMessage = error.response._data.message
                    }
                }
            }
        },
        async getAllMenuGroups() {
            this.isLoading = true
            try {
                const response = await useMainApiAuth('/api/menus/menu-groups', {
                    method: 'GET',
                })
                this.menuGroups = response
                this.isLoading = false
            } catch (error) {
                this.isLoading = false
                this.errorMessage = error
                if (error.response) {
                    if (error.response._data.errors) {
                        this.errorMessage = error.response._data.errors
                    } else {
                        this.errorMessage = error.response._data.message
                    }
                }
            }
        },
    },
    persist: {
        key: 'category-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['categories', 'courseTypes', 'menuGroups', 'isLoading', 'errorMessage'],
    }
})
