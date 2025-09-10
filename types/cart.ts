// types/cart.ts
export interface Cart {
  id: number
  menu_id: number
  name: string
  description?: string | null
  price: number
  quantity: number
  image?: string | null
  tax_amount?: number | null
}

export interface OrderParams {
  guest_count?: number | null
  note?: string | null
  total_amount?: number | null
  items: Cart[]
}