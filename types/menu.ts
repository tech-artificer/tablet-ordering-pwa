export interface MenuItem {
    id: number
    name: string
    description: string
    price: number
    category?: string | ''
    group?: string | ''
    course?: string | ''
    img_url: string
    is_taxable: boolean
    is_discountable: boolean
    tax: Tax
    kitchen_name: string
    receipt_name: string,
    menu_category_id: number
    menu_group_id: number
    menu_tax_type_id: number
    menu_course_type_id: number
    is_modifier: boolean
    is_modifier_only: boolean
    quantity: number
    tax_amount: number
    modifiers: MenuItem[]
}

export interface Tax {
    name: string,
    percentage: number,
    rounding: number
}

// export interface Package {
//     id: number,
//     name: string,
//     group: string,
//     is_available: boolean,
//     category: string,
//     subtitle: string,
//     is_taxable: boolean,
//     is_discountable: boolean,
//     tax: Tax,
//     tax_amount: number,
//     price: number,
//     receipt_name: string,
//     img_url: string,
//     images: string[],
//     items: MenuItem[],
//     modifiers: MenuItem[],
// }

// export interface MenuCategory {
//     menu_category_id: number
//     id: number,
//     name: string,
//     description?: string | null
//     items?: MenuItem[] | null
// }

// export interface MenuGroup {
//     id: number,
//     menu_group_id: number
//     name: string,
//     description?: string | null
//     items?: MenuItem[] | null
// }

// export interface MenuCourse {
//     menu_course_type_id: number
//     name: string,
//     id: number,
//     description?: string | null
//     items?: MenuItem[] | null
// }


// export interface MenuSet {
//     id: number
//     name: string,
//     description?: string | null
//     items?: MenuItem[] | null
// }


