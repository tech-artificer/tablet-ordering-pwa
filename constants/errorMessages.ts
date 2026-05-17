/**
 * Customer-safe error messages catalog
 * All messages are hardcoded and whitelisted for customer-facing UI.
 * Raw technical details always go to logs only.
 */

export const ERROR_MESSAGES = {
    // Connectivity
    NO_INTERNET_CONNECTION: "No internet connection",
    RECONNECTING_TO_SYSTEM: "Reconnecting to the restaurant system…",
    ASK_STAFF_ASSISTANCE: "Please ask a staff member for assistance",

    // Offline handling
    CONNECTIVITY_LOST_TITLE: "Connection Lost",
    CONNECTIVITY_LOST_MESSAGE: "Trying to reconnect to the restaurant system. Please wait…",
    CONNECTIVITY_LOST_ESCALATED: "Unable to reconnect. Please ask a staff member for assistance.",
    SYSTEM_RECONNECTING: "Reconnecting to the restaurant system…",

    // Server errors
    SERVER_ERROR_TITLE: "System Error",
    SERVER_ERROR_MESSAGE: "Something went wrong. Please ask a staff member for assistance.",
    SERVER_UNAVAILABLE: "The restaurant system is currently unavailable. Please try again or ask a staff member.",

    // Order submission
    ORDER_SUBMISSION_FAILED: "Could not submit order. Please try again or ask a staff member.",
    ORDER_SUBMISSION_FAILED_TITLE: "Order Submission Failed",

    // Authentication
    SESSION_EXPIRED: "Your session has expired. Please re-register this device in Settings.",
    AUTH_FAILED: "Authentication failed. Please re-register this device in Settings.",

    // Validation
    VALIDATION_FAILED: "Order validation failed. Please check your selection and try again.",
    MENU_ITEM_UNAVAILABLE: "A menu item is no longer available. Please update your selection.",
    CART_EMPTY: "Your cart is empty. Please add items before submitting.",

    // Session
    SESSION_NOT_FOUND: "No active POS terminal session found. Please ask staff to open a session.",
    SESSION_ENDED: "Your session has ended. Returning to welcome screen.",
    ACTIVE_ORDER_EXISTS: "An active order already exists for this device. Please continue the existing session.",

    // Recovery
    PLEASE_RELOAD: "Please reload the page to reconnect.",
    SYSTEM_RECOVERING: "System recovering…",

    // Generic fallback
    GENERIC_FALLBACK: "Something went wrong. Please ask a staff member for assistance.",
}
