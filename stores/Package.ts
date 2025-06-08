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
    rating: number,
}
interface Package {
    id: string,
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
        selectedPackage: null as string | null,
        selectedPackageName: null as string | null,
        isLoading: false as boolean,
    }),

    getters: {
        getPackageById: (state) => (id: string) => state.packageList.find((pkg) => pkg.id === id)
    },

    actions: {
        async exampleData () {
            this.isLoading = true
            const packageList = [
                {
                    id: 1,
                    name: 'Classic Feast',
                    price: 899.99,
                    badge: 'STAFF FAVORITE',
                    items: [
                        {
                            id: 2,
                            name: 'Sushi Platter1',
                            description: 'Other information, ingredients',
                            price: 899.99,
                            rating: 4.8,
                            category: 'Fish',
                            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
                        },
                        {
                            id: 3,
                            name: 'Breakfast Special1',
                            description: 'Other information, ingredients',
                            price: 299.99,
                            rating: 4.7,
                            category: 'Most popular',
                            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara1',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara1',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara1',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara1',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara1',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                    ]
                },
                {
                    id: 2,
                    name: 'Noble Selection',
                    price: 499.99,
                    badge: 'STAFF FAVORITE',
                    items: [
                        {
                            id: 2,
                            name: 'Sushi Platter2',
                            description: 'Other information, ingredients',
                            price: 899.99,
                            rating: 4.8,
                            category: 'Fish',
                            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
                        },
                        {
                            id: 3,
                            name: 'Breakfast Special2',
                            description: 'Other information, ingredients',
                            price: 299.99,
                            rating: 4.7,
                            category: 'Most popular',
                            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara2',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                    ]
                },
                {
                    id: 3,
                    name: 'Royal Banquet',
                    price: 599.99,
                    badge: 'BEST',
                    items: [
                        {
                            id: 2,
                            name: 'Sushi Platter4',
                            description: 'Other information, ingredients',
                            price: 899.99,
                            rating: 4.8,
                            category: 'Fish',
                            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=300&fit=crop'
                        },
                        {
                            id: 3,
                            name: 'Breakfast Special3',
                            description: 'Other information, ingredients',
                            price: 299.99,
                            rating: 4.7,
                            category: 'Most popular',
                            image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop'
                        },
                        {
                            id: 4,
                            name: 'Pasta Carbonara4',
                            description: 'Other information, ingredients',
                            price: 389.99,
                            rating: 4.6,
                            category: 'Pasta',
                            image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&h=300&fit=crop'
                        },
                    ]
                },
            ]
            this.packageList = packageList
            this.isLoading = false
            console.log('Packages fetched successfully:', this.packageList)
        }
    },

    persist: {
        key: 'package-store',
        storage: import.meta.client ? localStorage : undefined,
        paths: ['packageList', 'selectedPackage'   ],
    }
})
