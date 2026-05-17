/**
 * Error classifier composable
 * Classifies errors and returns only customer-safe messages.
 * Raw technical details always logged; never returned to caller.
 */

import type { AxiosError } from "axios"
import { logger } from "~/utils/logger"
import { ERROR_MESSAGES } from "~/constants/errorMessages"

export type ErrorCategory =
  | "CONNECTIVITY"
  | "SERVER_BLOCKING"
  | "RECOVERABLE"
  | "TRANSIENT"
  | "UNKNOWN"

export interface ClassifiedError {
  category: ErrorCategory
  title: string
  message: string
  surface: boolean // Whether this should trigger UI (vs. silent/retry)
  statusCode?: number
  raw?: unknown // For logging only
}

/**
 * Check if error response contains sensitive data
 */
const hasSensitiveData = (data: any): boolean => {
    if (!data || typeof data !== "object") { return false }

    const sensitivePatterns = ["exception", "trace", "stack", "file", "line", "SQLSTATE", "laravel.log", "storage/logs"]
    const dataStr = JSON.stringify(data)

    return sensitivePatterns.some(pattern => dataStr.includes(pattern))
}

/**
 * Classify an error and return customer-safe message
 */
export function classifyError (error: unknown): ClassifiedError {
    const axiosError = error as AxiosError
    const status = axiosError?.response?.status
    const data = axiosError?.response?.data as any

    // Always log raw error
    logger.error("[classifyError] Raw error details:", {
        status,
        message: (error as any)?.message,
        data,
        code: (error as any)?.code,
    })

    // Network connectivity errors
    if (!navigator.onLine || (error as any)?.code === "ERR_NETWORK" || (error as any)?.message?.includes("network")) {
        return {
            category: "CONNECTIVITY",
            title: ERROR_MESSAGES.CONNECTIVITY_LOST_TITLE,
            message: ERROR_MESSAGES.CONNECTIVITY_LOST_MESSAGE,
            surface: true,
            raw: error,
        }
    }

    // Timeout (transient)
    if ((error as any)?.code === "ECONNABORTED" || (error as any)?.message?.includes("timeout")) {
        return {
            category: "TRANSIENT",
            title: "Request Timeout",
            message: "Request timed out. Retrying…",
            surface: false,
            raw: error,
        }
    }

    // HTTP status codes
    if (status === 401) {
        return {
            category: "RECOVERABLE",
            title: "Session Expired",
            message: ERROR_MESSAGES.SESSION_EXPIRED,
            surface: true,
            statusCode: 401,
            raw: error,
        }
    }

    if (status === 403) {
        return {
            category: "SERVER_BLOCKING",
            title: "Access Denied",
            message: ERROR_MESSAGES.ASK_STAFF_ASSISTANCE,
            surface: true,
            statusCode: 403,
            raw: error,
        }
    }

    if (status === 404) {
        return {
            category: "RECOVERABLE",
            title: "Not Found",
            message: "Resource not found. Please try again.",
            surface: false,
            statusCode: 404,
            raw: error,
        }
    }

    // Conflict - order already exists (resumable)
    if (status === 409) {
        return {
            category: "RECOVERABLE",
            title: "Order Conflict",
            message: ERROR_MESSAGES.ACTIVE_ORDER_EXISTS,
            surface: false, // Caller handles 409 specially (resume flow)
            statusCode: 409,
            raw: error,
        }
    }

    // Rate limit (transient)
    if (status === 429) {
        return {
            category: "TRANSIENT",
            title: "Rate Limited",
            message: "Too many requests. Please wait a moment.",
            surface: false,
            statusCode: 429,
            raw: error,
        }
    }

    // Validation errors (422)
    if (status === 422) {
        const code = data?.code

        // Menu item unavailable
        if (code === "MENU_ITEM_UNAVAILABLE") {
            return {
                category: "RECOVERABLE",
                title: "Menu Update",
                message: ERROR_MESSAGES.MENU_ITEM_UNAVAILABLE,
                surface: true,
                statusCode: 422,
                raw: error,
            }
        }

        // Generic validation — never pass data?.message directly
        return {
            category: "RECOVERABLE",
            title: "Validation Error",
            message: ERROR_MESSAGES.VALIDATION_FAILED,
            surface: true,
            statusCode: 422,
            raw: error,
        }
    }

    // Service unavailable (503)
    if (status === 503) {
        const code = data?.code
        if (code === "SESSION_NOT_FOUND") {
            return {
                category: "RECOVERABLE",
                title: "POS Session Required",
                message: ERROR_MESSAGES.SESSION_NOT_FOUND,
                surface: true,
                statusCode: 503,
                raw: error,
            }
        }

        return {
            category: "TRANSIENT",
            title: "Service Unavailable",
            message: ERROR_MESSAGES.SERVER_UNAVAILABLE,
            surface: true,
            statusCode: 503,
            raw: error,
        }
    }

    // 5xx errors - always blocking
    if (status && status >= 500) {
        return {
            category: "SERVER_BLOCKING",
            title: ERROR_MESSAGES.SERVER_ERROR_TITLE,
            message: ERROR_MESSAGES.SERVER_ERROR_MESSAGE,
            surface: true,
            statusCode: status,
            raw: error,
        }
    }

    // Check for sensitive data leaks in any response
    if (hasSensitiveData(data)) {
        logger.error("[classifyError] Sensitive data detected in response:", { data })
        return {
            category: "SERVER_BLOCKING",
            title: ERROR_MESSAGES.SERVER_ERROR_TITLE,
            message: ERROR_MESSAGES.SERVER_ERROR_MESSAGE,
            surface: true,
            raw: error,
        }
    }

    // Unknown error
    return {
        category: "UNKNOWN",
        title: "Unknown Error",
        message: ERROR_MESSAGES.GENERIC_FALLBACK,
        surface: true,
        raw: error,
    }
}
