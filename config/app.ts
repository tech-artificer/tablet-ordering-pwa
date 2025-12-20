/**
 * Application Constants
 * Global constants for the tablet ordering PWA
 */

// App metadata
export const APP_NAME = 'Wooserve KBBQ Ordering';
export const APP_SHORT_NAME = 'Wooserve';
export const APP_VERSION = '1.0.0';

// Broadcast/Real-time configuration
export const BROADCAST_CONFIG = {
  CONNECTION: 'reverb',
  DEFAULT_HOST: '192.168.100.85',
  DEFAULT_PORT: 6001,
  DEFAULT_SCHEME: 'http',
} as const;

// UI configuration
export const UI_CONFIG = {
  // Animation durations (milliseconds)
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  MODAL_DURATION: 200,

  // Pagination
  ITEMS_PER_PAGE: 20,
  MAX_PAGES: 100,

  // Responsive breakpoints (pixels)
  BREAKPOINTS: {
    MOBILE: 320,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1280,
  },
} as const;

// Storage configuration
export const STORAGE_CONFIG = {
  // LocalStorage keys
  DEVICE_TOKEN: 'device_token',
  DEVICE_ID: 'device_id',
  DEVICE_NAME: 'device_name',
  TABLE_ID: 'table_id',
  TABLE_NAME: 'table_name',
  SESSION_ID: 'session_id',
  ORDER_QUEUE: 'order_queue',
  CACHE_MENUS: 'cache_menus',
  CACHE_TIMESTAMP: 'cache_timestamp',

  // Cache duration (milliseconds)
  CACHE_DURATION: 3600000, // 1 hour
} as const;

// Order status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COOKING: 'cooking',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

// Device types
export const DEVICE_TYPES = {
  TABLET: 'tablet',
  KIOSK: 'kiosk',
  TERMINAL: 'terminal',
  DISPLAY: 'display',
} as const;
