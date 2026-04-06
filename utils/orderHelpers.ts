/**
 * Order ID Resolution Utilities
 * 
 * Centralizes logic for extracting order IDs from various response shapes
 * across different backend API endpoints that return inconsistent formats.
 */

/**
 * Extracts order_id from any API response format
 * 
 * Handles multiple response shapes:
 * - { order_id: 123 }
 * - { order: { order_id: 123 } }
 * - { data: { order_id: 123 } }
 * - { data: { order: { order_id: 123 } } }
 * - Plain number/string: 123
 * 
 * @param response - API response object, plain number, or string
 * @returns Extracted order ID as string/number, or null if not found
 */
export function extractOrderId(response: any): string | number | null {
  if (!response) return null
  
  // Already a primitive (number or string)
  if (typeof response === 'number' || typeof response === 'string') {
    return response
  }
  
  // Check common nested paths in order of likelihood
  return (
    response.order_id ??
    response.order?.order_id ??
    response.data?.order_id ??
    response.data?.order?.order_id ??
    response.order?.id ??
    response.id ??
    null
  )
}

/**
 * Gets the current active order ID from order store state
 * 
 * Handles both new orders and refill mode by checking:
 * 1. currentOrder.order.order_id (most specific)
 * 2. currentOrder.order.id (fallback)
 * 3. currentOrder.order_id (flat structure)
 * 4. currentOrder.id (last resort)
 * 
 * @param currentOrder - Order store's currentOrder state object
 * @returns Extracted order ID as string/number, or null if not found
 */
export function getCurrentOrderId(currentOrder: any): string | number | null {
  if (!currentOrder) return null
  
  return (
    currentOrder.order?.order_id ??
    currentOrder.order?.id ??
    currentOrder.order_id ??
    currentOrder.id ??
    null
  )
}

/**
 * Extracts order_number from API response (display purposes)
 * 
 * @param response - API response object
 * @returns Order number as string/number, or null if not found
 */
export function extractOrderNumber(response: any): string | number | null {
  if (!response) return null
  
  return (
    response.order_number ??
    response.order?.order_number ??
    response.data?.order_number ??
    response.data?.order?.order_number ??
    null
  )
}
