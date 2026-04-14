/**
 * API Configuration and Constants
 * Centralized configuration for API client and server endpoints
 */

// API timeout configuration (milliseconds)
export const API_TIMEOUT = 15000;

// API endpoints
export const API_ENDPOINTS = {
  // Menu endpoints
  MENUS: '/api/menus',
  MENU_GROUPS: '/api/menu/groups',
  MENU_PACKAGES: '/api/menu/packages',
  MENU_MODIFIERS: '/api/menu/modifiers',

  // Order endpoints
  ORDERS: '/api/orders',
  ORDER_ITEMS: '/api/orders/items',
  ORDER_CHECK: '/api/orders/check',

  // Device endpoints
  DEVICE_LOGIN: '/api/device/login',
  DEVICE_SESSION: '/api/device/session',
  DEVICE_STATUS: '/api/device/status',
  DEVICE_CREATE_ORDER: '/api/devices/create-order',
  DEVICE_ORDERS: '/api/device-orders',

  // Table endpoints
  TABLES: '/api/tables',
  TABLE_STATUS: '/api/tables/status',

  // Payment endpoints
  PAYMENTS: '/api/payments',
  PAYMENT_METHODS: '/api/payment-methods',

  // Dynamic order endpoints
  ORDER_REFILL: (orderId: number | string) => `/api/order/${orderId}/refill`,
  DEVICE_ORDER_BY_EXTERNAL_ID: (orderId: number | string) => `/api/device-order/by-order-id/${orderId}`,
} as const;

// HTTP Headers configuration
export const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
} as const;

// Request/Response configuration
export const REQUEST_CONFIG = {
  timeout: API_TIMEOUT,
  retries: 3,
  retryDelay: 1000, // milliseconds
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Order created successfully.',
  ORDER_UPDATED: 'Order updated successfully.',
  ORDER_SUBMITTED: 'Order submitted successfully.',
  PAYMENT_PROCESSED: 'Payment processed successfully.',
} as const;
