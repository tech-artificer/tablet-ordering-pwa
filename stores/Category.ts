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
                {id: 1, name: CategoryFilter.PROMOS},
                {id: 2, name: CategoryFilter.MEATS},
                {id: 3, name: CategoryFilter.SIDES_BANCHAN},
                {id: 4, name: CategoryFilter.A_LA_CARTE},
                {id: 5, name: CategoryFilter.DESSERT},
                {id: 6, name: CategoryFilter.BEVERAGE},
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
            } catch (error: any) {
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
            } catch (error: any) {
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
                const response = await useMainApiAuth('/api/menus/group', {
                    method: 'GET',
                })
                this.menuGroups = response
                this.isLoading = false
            } catch (error: any) {
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
