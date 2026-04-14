/**
 * Canonical API error codes.
 *
 * These values MUST stay in sync with App\Enums\ApiErrorCode in woosoo-nexus.
 * Source of truth: docs/api/ERROR_CODES.md
 */

// ── HTTP / generic ─────────────────────────────────────────────────────────
export const ERROR_VALIDATION_ERROR     = 'VALIDATION_ERROR' as const
export const ERROR_UNAUTHENTICATED      = 'UNAUTHENTICATED' as const
export const ERROR_FORBIDDEN            = 'FORBIDDEN' as const
export const ERROR_NOT_FOUND            = 'NOT_FOUND' as const
export const ERROR_METHOD_NOT_ALLOWED   = 'METHOD_NOT_ALLOWED' as const
export const ERROR_RATE_LIMITED         = 'RATE_LIMITED' as const
export const ERROR_CONFLICT             = 'CONFLICT' as const
export const ERROR_SERVER_ERROR         = 'SERVER_ERROR' as const
export const ERROR_UNPROCESSABLE        = 'UNPROCESSABLE' as const
export const ERROR_BAD_REQUEST          = 'BAD_REQUEST' as const
export const ERROR_REQUEST_FAILED       = 'REQUEST_FAILED' as const

// ── Domain-specific ────────────────────────────────────────────────────────
export const ERROR_ORDER_ALREADY_EXISTS  = 'ORDER_ALREADY_EXISTS' as const
export const ERROR_SESSION_EXPIRED       = 'SESSION_EXPIRED' as const
export const ERROR_DEVICE_NOT_ASSIGNED   = 'DEVICE_NOT_ASSIGNED' as const
export const ERROR_SESSION_NOT_FOUND     = 'SESSION_NOT_FOUND' as const
export const ERROR_PRINT_EVENT_NOT_FOUND = 'PRINT_EVENT_NOT_FOUND' as const
export const ERROR_DEVICE_INACTIVE       = 'DEVICE_INACTIVE' as const

// ── Union type ─────────────────────────────────────────────────────────────
export type ApiErrorCode =
  | typeof ERROR_VALIDATION_ERROR
  | typeof ERROR_UNAUTHENTICATED
  | typeof ERROR_FORBIDDEN
  | typeof ERROR_NOT_FOUND
  | typeof ERROR_METHOD_NOT_ALLOWED
  | typeof ERROR_RATE_LIMITED
  | typeof ERROR_CONFLICT
  | typeof ERROR_SERVER_ERROR
  | typeof ERROR_UNPROCESSABLE
  | typeof ERROR_BAD_REQUEST
  | typeof ERROR_REQUEST_FAILED
  | typeof ERROR_ORDER_ALREADY_EXISTS
  | typeof ERROR_SESSION_EXPIRED
  | typeof ERROR_DEVICE_NOT_ASSIGNED
  | typeof ERROR_SESSION_NOT_FOUND
  | typeof ERROR_PRINT_EVENT_NOT_FOUND
  | typeof ERROR_DEVICE_INACTIVE
