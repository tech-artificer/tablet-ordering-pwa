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
}

export interface Tax {
    name: string,
    percentage: number
    rounding: number
}

export interface Package {
    id: number,
    name: string,
    group: string,
    is_available: boolean,
    category: string,
    subtitle: string,
    is_taxable: boolean,
    is_discountable: boolean,
    tax: Tax,
    tax_amount: number,
    price: string,
    receipt_name: string,
    modifiers: Menu[],
    img_url: string,
    badge: string,
    bgColor: string,
    textColor: string,
    images: string[],
    items: Menu[]
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
    token: string,
    device: DeviceInformation,
    isLoading: boolean,
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
export interface Order {
    id: number;
    date_time_opened: date;
    transaction_no: number;
    guest_count: number;
    reprint_count: number;
    orderCheck?: OrderCheck;
    orderedMenus?: OrderedMenu[];
    device?: Device;
    deviceOrder?: DeviceOrder;
}
export interface OrderedMenu {
    menu_id: number;
    quantity: number;
    price_level_id: number;
    menu?: Menu;
}