// import type Menu from "~/pages/woosoo/menu.vue"
// import type { MenuItem } from '@/types/menu'
// import { OrderStatus } from '@/types/enums'

// export interface Order {
//     id: number;
//     branch_id: number;
//     device_id: number;
//     order_id: number | string | null;
//     order_number: string;
//     guest_count: number;
//     session_id: number;
//     status: OrderStatus | string | null;
//     deleted_at?: string;
//     created_at?: any;
//     is_printed?: boolean;
//     package: Package;
//     order_items: OrderItems[]
//     total: number;
// }

// export interface OrderItem {
//     id : number;
//     order_id: number; // device order id
//     ordered_menu_id: number;
//     menu_id: number;
//     price: number;
//     quantity: number;
//     tax: number;
//     subtotal: number;
//     discount: number;
//     notes: string;
// }

// export interface Table {
//     id: number;
//     name: string,
//     status: string;
//     is_available: boolean;
//     is_locked: boolean;
// }

// export interface Menu {
//     category: string;
//     is_refillable: boolean;
//     items: MenuItem[];
// }

// export interface Session {
//     session_id: number;
//     table: Table;
//     order: Order;
//     package: Package;

// }

// export interface Package {
//     id: number;
//     name: string;
//     description: string;
//     price: number;
//     img_url: string;
//     modifier: Modifier[];
// }

// export interface Meats {
//     id: number;
//     group: string | null;
//     course: string | null;
//     category: string | null;
//     name: string;
//     price: number;
//     receipt_name: string;
//     description: string;
//     image: string;
//     img_url: string;
// }

// export interface Modifier {
//     id: number;
//     group: string | null;
//     course: string | null;
//     category: string | null;
//     name: string;
//     price: number;
//     receipt_name: string;
//     description: string;
//     image: string;
//     img_url: string;
// }

// export interface Device {
//     id: number,
//     name: string,
//     token?: string,
//     code?: string,
//     app_version?: string,
//     last_ip_address?: string,
// }


// export interface Branch {
//     id: number,
//     name: string,
// }

// export interface MenuItem {
//     id: number,
//     group: string | null;
//     course: string | null;
//     category: string | null;
//     name: string,
//     description: string;
//     receipt_name: string;
//     price: number;
//     img_url: string;
//     is_available: boolean;
//     is_taxable: boolean;
//     is_discountable: boolean;
//     tax: Tax;
//     tax_amount: number;
// }

// export interface Tax {
//     name: string,
//     percentage: number
//     rounding: number
// }

// export interface RefillableItem {
//   order_item_id: number;
//   menu_id: number;
//   modifier_id: number;
//   modifier_name: string;
//   modifier_category: string;
//   refill_price: number;
//   refills_used: number;
//   max_refills?: number; // Optional limit
// }

// export interface CartItem extends OrderItem {
//   menu_item: MenuItem;
// }

// // API Response types
// export interface ApiResponse<T> {
//   success: boolean;
//   data: T;
//   message?: string;
//   errors?: any;
// }

// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   page: number;
//   per_page: number;
//   last_page: number;
// }

// types/index.ts

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: number;
  branch_id: number;
  device_id: number;
  order_id: number | string | null;
  order_number: string;
  guest_count: number;
  session_id: number;
  status: OrderStatus | string | null;
  deleted_at?: string;
  created_at?: any;
  is_printed?: boolean;
  package: Package;
  order_items: OrderItem[];
  total: number;
}

export interface OrderItem {
  id: number;
  menu_id: number;
  ordered_menu_id?: number | null;
  name: string;
  quantity: number;
  price: string | number;
  note?: string;
  subtotal: number;
  tax?: number;
  discount?: number;
  isUnlimited: boolean;
  img_url?: string;
  category?: string;
  // id: number;
  // order_id: number; // device order id
  // ordered_menu_id: number;
  // menu_id: number;
  // price: number;
  // quantity: number;
  // tax: number;
  // subtotal: number;
  // discount: number;
  // notes: string;
  // item_type?: 'package' | 'refill' | 'alacarte';
  // parent_item_id?: number; // For refills
  // modifier_selections?: ModifierSelection[];
  // menu_item?: MenuItem;
}

export interface ModifierSelection {
  modifier_id: number;
  modifier_name: string;
  modifier_category: string;
  quantity: number;
  price: number;
  refill_price?: number;
  refills_used?: number;
  is_refillable: boolean;
}

export interface Table {
  id: number;
  name: string;
  status: string;
  is_available: boolean;
  is_locked: boolean;
}

export interface Menu {
  id: string,
  category: string;
  is_refillable: boolean;
  items: MenuItem[];
  is_active: boolean;
}

export interface Session {
  id: string | null;
  orderId: number | null;
  package: Package;
  table: Table;
  guestCount: number;
  startedAt: number;
  isActive: boolean;
  // session_id: number;
  // table: Table;
  // order: Order;
  // package: Package;
}

export interface Package extends MenuItem {
  modifiers: Modifier[];
  accent: string;
  color: string;
  is_popular: boolean;
  // modifiers: Modifier[];
  // modifier_groups?: ModifierGroup[];
}

export interface ModifierGroup {
  group: string;
  modifiers: Modifier[];
}

// export interface Meats extends MenuItem {
//   id: number;
//   group: string | null;
//   course: string | null;
//   category: string | null;
//   name: string;
//   price: number;
//   receipt_name: string;
//   description: string;
//   img_url: string;
// }

export interface Modifier {
  id: number;
  group: string | null;
  category: string | null;
  name: string;
  price: number;
  receipt_name: string;
  description: string;
  img_url: string;
  is_refillable?: true;
}

export interface Device {
  id: number;
  name: string;
  token?: string;
  code?: string;
  app_version?: string;
  last_ip_address?: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  group: string | null;
  course: string | null;
  category: string | null;
  name: string;
  description: string;
  receipt_name: string;
  kitchen_name: string;
  price: number;
  img_url: string;
  is_available: boolean;
  is_taxable: boolean;
  is_discountable: boolean;
  tax: Tax;
  tax_amount: number;
}

export interface Tax {
  name: string;
  percentage: number;
  rounding: number;
}

export interface RefillableItem {
  order_item_id: number;
  menu_id: number;
  modifier_id: number;
  modifier_name: string;
  modifier_category: string;
  refill_price: number;
  refills_used: number;
  max_refills?: number; // Optional limit
}

export interface CartItem extends MenuItem {
  ordered_menu_id: number ;
  quantity: number;
  isUnlimited: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

// New types for Tablet API integration
export interface MeatCategory {
  code: string;  // PORK, BEEF, CHICKEN
  name: string;  // Display name
  icon: string;  // Icon (emoji or URL)
  color: string; // Hex color code
  sort_order: number;
}

export interface TabletCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  color?: string;
  menu_count: number;
}

export interface AllowedMenu {
  id: number;
  description: string;
  receipt_name: string;
  price: number;
  extra_price: number;
  total_price: number;
  is_default: boolean;
  is_free: boolean;
  meat_category?: MeatCategory;
  image?: {
    url: string;
    alt_text?: string;
  };
}

export interface PackageDetails {
  package: {
    id: number;
    name: string;
    description: string;
    base_price: number;
    limits: {
      meat: { min: number; max: number };
      side: { min: number; max: number };
      dessert: { min: number; max: number };
      beverage: { min: number; max: number };
    };
    has_limits: boolean;
  };
  allowed_menus: {
    meat: AllowedMenu[];
    side: AllowedMenu[];
    dessert: AllowedMenu[];
    beverage: AllowedMenu[];
  };
  default_selections: Array<{
    menu_id: number;
    type: string;
  }>;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
  pricing: {
    base_price: number;
    extra_charges: number;
    total_price: number;
  };
}