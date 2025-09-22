// import type Menu from "~/pages/woosoo/menu.vue"
import type { MenuItem } from '@/types/menu'
import { OrderStatus } from '@/types/enums'
export interface Menu {
    id: number,
    menu_id: number,
    category: string,
    name: string,
    barcode: string,
    is_taxable: boolean,
    is_discountable: boolean,
    tax: Tax,
    tax_amount: number,
    price: number,
    receipt_name: string,
    description: string,
    image: string,
    img_url: string,
    is_available: boolean,
    category_id: number,
    restaurant_id: number,
    rating: number,
    modifiers: Array<Menu>,
    items?: Array<Menu>
}


export interface Tax {
    name: string,
    percentage: number
    rounding: number
}

export interface Package extends MenuItem {
    // id: number,
    // name: string,
    // group: string,
    // is_available: boolean,
    // group: string,
    // category: string,
    // subtitle: string,
    // is_taxable: boolean,
    // is_discountable: boolean,
    // tax: Tax,
    // tax_amount: number,
    // price: number,
    // receipt_name: string,
    // modifiers: Menu[],
    // img_url: string,
    // badge: string,
    // bgColor: string,
    // textColor: string,
    // images: string[],
    // items: Menu[],
    // modifiers: Menu[],
    // tax: Tax,
}

export interface DeviceOrder {
    items: OrderedMenu[] | [];
    id: number;
    guest_count: number;
    name: string;
    device_id: number;
    order_id: number | string | null;
    order_number: string;
    status: OrderStatus | string | null;
    device?: Device | null;
    order?: Order | null;
    table?: Table | null;
    meta: any | null;
    deleted_at?: string;
    service_requests: ServiceRequest[] | []
}

export interface Branch {
    id: number,
    name: string,
}

export interface DeviceInformation {
    name: string,
    branch_id: number,
    table_id: number | null,
    device_uuid: string,
    updated_at: string,
    created_at: string,
    id: number
}
export interface DeviceParams {
    name: string,
    code: string,
    app_version: string,
    last_ip_address: string,
}
export interface Device {
    id: number,
    name: string,
    branch:Branch,
    table: Table,
    token?: string,
    device?: DeviceInformation,
    isLoading?: boolean,
}
export interface DeviceLoginParams {
    device_uuid: string,
}

export interface DeviceOrder {
    items: OrderedMenu[];
    id: number;
    name: string;
    device_id: number;
    order_id: any;
    order_number: string;
    status: OrderStatus;
    device?: Device;
    order?: Order;
    meta: any;
    service_requests: ServiceRequest[];
}

// export interface Order {
//     id: number;
//     order_id: number;
//     order_number: string;
//     orderedPackage?: Menu;
//     date_time_opened: date;
//     transaction_no: number;
//     guest_count: number;
//     reprint_count: number;
//     orderCheck?: OrderCheck;
//     orderedMenus?: OrderedMenu[];
//     device?: Device;
//     deviceOrder?: DeviceOrder;
//     note?: string;
//     subTotal: number;
//     total: number;
//     tax: number;
//     discount: number;
//     tax_amount: number;
//     discount_amount: number;
//     status: OrderStatus;
// }
export interface OrderedMenu {
    menu_id: number;
    quantity: number;
    price_level_id: number;
    menu?: Menu;
}


// export interface CartItem {
//     id: number
//     quantity: number
//     price: number
//     name: string
//     description: string
//     img_url: string
// }

export interface CartItem extends MenuItem {
    // id: number
    quantity: number
    // price: number
    // name: string
    // description: string
    // img_url: string
}

export interface Order {
  id: number
  order_id: number
  order_number: string
  items: CartItem[]
  subTotal: number
  total: number
  tax: number
  discount: number
  created_at: string
  status: OrderStatus
}

export interface Cart {
  id: number
  menu_id: number
  name: string
  description?: string | null
  price: number
  quantity: number
  image?: string | null
  tax_amount?: number | 0
}

export interface OrderParams {
  guest_count?: number | null
  note?: string | null
  total_amount?: number | null
  items: Cart[]
}

export interface Table {
    id: number;
    name: string,
    status: string;
    is_available: boolean;
    is_locked: boolean;
    tableOrder?: TableOrder;
}