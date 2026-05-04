import { defineStore } from "pinia"
import { reactive, computed, toRefs, onScopeDispose } from "vue"
import { useApi } from "../composables/useApi"
import { useOfflineOrderQueue } from "../composables/useOfflineOrderQueue"
import { logger } from "../utils/logger"
import { extractOrderId, extractOrderNumber } from "../utils/orderHelpers"
import { notifyBlockedAction } from "../composables/useNotifier"
import type { CartItem, Package, MenuItem, SubmittedItem, OrderApiResponse, OrderPayload, OrderPayloadItem } from "../types"
import { API_ENDPOINTS } from "../config/api"
import { useDeviceStore } from "./Device"
import { useSessionStore } from "./Session"

// Module-level constant — cap on how many unlimited items can be added.
const UNLIMITED_ITEM_CAP = 5

const toMoney = (value: unknown): number => {
    const numeric = Number(value || 0)
    if (!Number.isFinite(numeric)) { return 0 }
    return Math.round((numeric + Number.EPSILON) * 100) / 100
}

export const useOrderStore = defineStore("order", () => {
    const state = reactive({
        cartItems: [] as CartItem[],
        refillItems: [] as CartItem[], // Separate cart for refills
        submittedItems: [] as SubmittedItem[], // Items from the last submitted order (with names for display)
        package: null as Package | null,
        guestCount: 2 as number,
        currentOrder: null as OrderApiResponse | null,
        history: [] as Array<OrderApiResponse & { type?: string }>,
        isRefillMode: false as boolean, // Track if we're in refill mode
        hasPlacedOrder: false as boolean, // Track if initial order was placed
        isSubmitting: false as boolean, // Centralized submission flag
        // Polling fallback state (5s interval)
        isPolling: false as boolean,
        pollInflight: false as boolean,
        pollingOrderId: null as string | null,
        error: null as string | null,
    })

    let pollIntervalId: ReturnType<typeof setInterval> | null = null
    let completionTimeoutId: number | null = null
    let pollStartTime: number | null = null
    const maxPollingRuntimeMs = 15 * 60 * 1000

    function handleOrderError (message: string): void {
        state.error = message
        state.isSubmitting = false
        logger.error("[Order Store Error]", message)
    }

    function clearCompletionTimeout () {
        if (!completionTimeoutId) { return }
        try {
            clearTimeout(completionTimeoutId)
        } catch (e) {
            logger.debug("clearCompletionTimeout failed", e)
        }
        completionTimeoutId = null
    }

    function resetTransactionalState (options?: { clearHistory?: boolean }) {
        stopPolling()
        state.cartItems = []
        state.refillItems = []
        state.submittedItems = []
        state.package = null
        state.guestCount = 2
        state.currentOrder = null
        state.isRefillMode = false
        state.hasPlacedOrder = false
        state.error = null
        if (options?.clearHistory) {
            state.history = []
        }
    }

    function extractResponseData<T = any> (response: any): T | null {
        return (response?.data ?? null) as T | null
    }

    function extractErrorResponse (error: any): any | null {
        return error?.response?.data ?? null
    }

    function extractFirstListItem (responseData: any): any | null {
        const candidates = [
            responseData?.data?.data,
            responseData?.data,
            responseData?.orders,
            responseData,
        ]

        for (const candidate of candidates) {
            if (Array.isArray(candidate) && candidate.length > 0) {
                return candidate[0]
            }
        }

        return null
    }

    const validateOrderState = (source: string) => {
        const issues: string[] = []

        if (state.isRefillMode && !state.hasPlacedOrder) {
            state.isRefillMode = false
            state.refillItems = []
            issues.push("refillModeWithoutOrder")
        }

        if (state.hasPlacedOrder && !state.currentOrder) {
            state.hasPlacedOrder = false
            state.submittedItems = []
            issues.push("hasPlacedOrderWithoutCurrentOrder")
        }

        if (state.isPolling && !pollIntervalId) {
            state.isPolling = false
            state.pollInflight = false
            state.pollingOrderId = null
            issues.push("pollingFlagWithoutTimer")
        }

        if (!state.isPolling && pollIntervalId) {
            stopPolling()
            issues.push("timerWithoutPollingFlag")
        }

        if (issues.length > 0) {
            logger.warn("[OrderStore] State recovery applied", { source, issues })
        }
    }

    const getCartItemQuantity = (id: number) => {
        const items = state.isRefillMode ? state.refillItems : state.cartItems
        return items.find(i => i.id === id)?.quantity ?? 0
    }

    const getPackage = computed(() => state.package)
    const getPackageModifiers = computed(() => state.package?.modifiers ?? [])

    // Refill-specific getters
    const refillTotal = computed(() =>
        state.refillItems.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0)
    )

    const activeCart = computed(() => state.isRefillMode ? state.refillItems : state.cartItems)

    const packageTotal = computed(() => toMoney(Number(state.package?.price || 0) * Number(state.guestCount || 1)))

    // Add-ons total excludes meat items — meats are modifiers nested under the package,
    // not standalone items, so their price must not appear in the add-ons subtotal.
    const addOnsTotal = computed(() =>
        toMoney(state.cartItems
            .filter(it => it.category !== "meats")
            .reduce((sum, it) => sum + toMoney(Number(it.price) * Number(it.quantity)), 0))
    )

    const taxAmount = computed(() => {
        if (!state.package?.is_taxable) { return 0 }
        const packageTotalVal = Number(state.package?.price || 0) * Number(state.guestCount || 1)
        const addOns = addOnsTotal.value
        const taxRate = Number(state.package?.tax?.percentage || 0)
        return toMoney(((packageTotalVal + addOns) * taxRate) / 100)
    })

    const grandTotal = computed(() => toMoney(packageTotal.value + addOnsTotal.value + taxAmount.value))

    function setPackage (pkg: Package) { state.package = pkg }

    function setGuestCount (count: number) {
        state.guestCount = Math.max(2, Math.min(20, Number(count)))
    }

    function addToCart (item: MenuItem, opts?: { isUnlimited?: boolean; category?: string }) {
        if (state.hasPlacedOrder && !state.isRefillMode) {
            logger.warn("addToCart blocked: initial order already placed; use refill mode to add items")
            notifyBlockedAction()
            return
        }

        if ((state.package as Package)?.id === item.id) {
            state.guestCount = Number(state.guestCount) + 1
            return
        }

        const targetCart = state.isRefillMode ? state.refillItems : state.cartItems
        const existing = targetCart.find(i => i.id === item.id)

        if (existing) {
            const isUnlimited = Boolean(existing.isUnlimited || opts?.isUnlimited)
            const max = isUnlimited ? UNLIMITED_ITEM_CAP : 99
            existing.quantity = Math.min(Number(existing.quantity) + 1, max)
        } else {
            const newItem: CartItem = {
                id: Number(item.id),
                name: item.name,
                img_url: item.img_url || "",
                price: Number(item.price || 0),
                quantity: 1,
                isUnlimited: Boolean(opts?.isUnlimited),
                category: opts?.category ?? null
            }

            if (state.isRefillMode) {
                state.refillItems.push(newItem)
            } else {
                state.cartItems.push(newItem)
            }
        }
    }

    function updateQuantity (id: number, quantity: number) {
        if (state.hasPlacedOrder && !state.isRefillMode) {
            logger.warn("updateQuantity blocked: initial order already placed; use refill mode to modify items")
            notifyBlockedAction()
            return
        }

        if (state.package?.id === id) {
            state.guestCount = Math.max(2, Number(quantity))
            return
        }

        const targetCart = state.isRefillMode ? state.refillItems : state.cartItems
        const existing = targetCart.find(i => i.id === id)
        if (!existing) { return }

        const max = existing.isUnlimited ? UNLIMITED_ITEM_CAP : 99
        const q = Math.min(Math.max(0, Number(quantity)), max)
        existing.quantity = q
        if (existing.quantity <= 0) { remove(id) }
    }

    function remove (id: number) {
        if (state.hasPlacedOrder && !state.isRefillMode) {
            logger.warn("remove blocked: initial order already placed; use refill mode to remove items")
            notifyBlockedAction()
            return
        }

        if (state.package?.id === id) {
            state.package = null
            return
        }

        if (state.isRefillMode) {
            state.refillItems = state.refillItems.filter(i => i.id !== id)
        } else {
            state.cartItems = state.cartItems.filter(i => i.id !== id)
        }
    }

    function clearRefillCart () {
        state.refillItems = []
    }

    function toggleRefillMode (enabled: boolean) {
    // Prevent entering refill mode if no initial order placed
        if (enabled && !state.hasPlacedOrder) {
            logger.warn("toggleRefillMode blocked: cannot enter refill mode before placing initial order")
            notifyBlockedAction("Cannot enter Refill mode until initial order is placed")
            return
        }

        state.isRefillMode = enabled
        if (enabled) {
            state.refillItems = []
        }
    }

    function buildPayload (): OrderPayload {
    // Separate package item with nested modifiers from add-ons
        const meatItems = state.cartItems.filter(i => i.category === "meats")
        const addOnItems = state.cartItems.filter(i => i.category !== "meats")

        const items: OrderPayloadItem[] = []

        // 1. Package item with meat modifiers (parent-child structure)
        if (state.package?.id) {
            const packageQuantity = Number(state.guestCount)
            const packageUnitPrice = Number(state.package.price || 0)
            const packageSubtotal = toMoney(packageUnitPrice * packageQuantity)

            items.push({
                menu_id: Number(state.package.id),
                name: String(state.package.name || "Package"),
                quantity: packageQuantity,
                price: toMoney(packageUnitPrice),
                subtotal: packageSubtotal,
                tax: 0,
                discount: 0,
                note: null,
                is_package: true,
                modifiers: meatItems.map(meat => ({
                    menu_id: Number(meat.id),
                    quantity: Number(meat.quantity)
                }))
            })
        }

        // 2. Add-on items (sides, drinks, desserts) as separate top-level items
        addOnItems.forEach((item) => {
            const quantity = Number(item.quantity)
            const unitPrice = Number(item.price || 0)
            const subtotal = toMoney(unitPrice * quantity)

            items.push({
                menu_id: Number(item.id),
                name: String(item.name || "Item"),
                quantity,
                price: toMoney(unitPrice),
                subtotal,
                tax: 0,
                discount: 0,
                note: item.note ?? null,
                is_package: false,
                modifiers: []
            })
        })

        const subtotal = toMoney(Number(packageTotal.value || 0) + Number(addOnsTotal.value || 0))
        const tax = toMoney(Number(taxAmount.value || 0))
        const discount = 0
        const totalAmount = toMoney(Number(grandTotal.value || 0))

        const payload = {
            table_id: null, // Will be populated from deviceStore in submitOrder
            guest_count: Number(state.guestCount),
            subtotal,
            tax,
            discount,
            total_amount: totalAmount,
            items
        }

        // Validate payload structure
        logger.debug("🔍 Validating payload structure...")

        if (!payload.guest_count || payload.guest_count < 1) {
            throw new Error("Invalid guest_count: must be at least 1")
        }

        if (!Array.isArray(payload.items) || payload.items.length === 0) {
            throw new Error("Invalid items: must be a non-empty array")
        }

        if (typeof payload.subtotal !== "number" || payload.subtotal < 0) {
            throw new Error("Invalid subtotal: must be a non-negative number")
        }

        if (typeof payload.tax !== "number" || payload.tax < 0) {
            throw new Error("Invalid tax: must be a non-negative number")
        }

        if (typeof payload.discount !== "number" || payload.discount < 0) {
            throw new Error("Invalid discount: must be a non-negative number")
        }

        if (typeof payload.total_amount !== "number" || payload.total_amount < 0) {
            throw new Error("Invalid total_amount: must be a non-negative number")
        }

        payload.items.forEach((item, index) => {
            if (!item.menu_id || typeof item.menu_id !== "number") {
                throw new Error(`Invalid item[${index}].menu_id: must be a number`)
            }
            if (!item.name || typeof item.name !== "string") {
                throw new Error(`Invalid item[${index}].name: must be a string`)
            }
            if (!item.quantity || item.quantity < 1) {
                throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
            }
            if (typeof item.price !== "number" || item.price < 0) {
                throw new Error(`Invalid item[${index}].price: must be a non-negative number`)
            }
            if (typeof item.subtotal !== "number" || item.subtotal < 0) {
                throw new Error(`Invalid item[${index}].subtotal: must be a non-negative number`)
            }
            if (typeof item.is_package !== "boolean") {
                throw new TypeError(`Invalid item[${index}].is_package: must be a boolean`)
            }
            if (item.is_package && (!Array.isArray(item.modifiers) || item.modifiers.length === 0)) {
                throw new Error(`Invalid item[${index}].modifiers: package items must have at least one modifier`)
            }
            if (item.is_package && item.modifiers) {
                item.modifiers.forEach((mod, modIndex: number) => {
                    if (!mod.menu_id || typeof mod.menu_id !== "number") {
                        throw new Error(`Invalid item[${index}].modifiers[${modIndex}].menu_id: must be a number`)
                    }
                    if (!mod.quantity || mod.quantity < 1) {
                        throw new Error(`Invalid item[${index}].modifiers[${modIndex}].quantity: must be at least 1`)
                    }
                })
            }
        })

        logger.debug("✅ Payload validation passed")
        return payload
    }

    function buildRefillPayload () {
        return {
            items: state.refillItems.map(item => ({
                menu_id: Number(item.id),
                name: String(item.name || ""),
                quantity: Number(item.quantity),
                note: item.note ?? "Refill",
            })),
        }
    }

    async function submitOrder (payload?: OrderPayload) {
        if (state.hasPlacedOrder && !state.isRefillMode) {
            throw new Error("An initial order has already been placed for this session. Use refill instead.")
        }
        if (state.isSubmitting) {
            throw new Error("Order submission already in progress. Please wait.")
        }
        state.isSubmitting = true
        try {
        // 🔒 VALIDATION: Ensure everything is set before submitting
            const deviceStore = useDeviceStore()

            logger.debug("🔍 Pre-submission validation:", {
                hasPackage: !!state.package?.id,
                packageId: state.package?.id,
                guestCount: state.guestCount,
                cartItemsCount: state.cartItems.length,
                isAuthenticated: deviceStore.isAuthenticated
            })

            // ❌ Validation checks
            if (!deviceStore.getToken()) {
                try {
                    await deviceStore.authenticate()
                } catch (e) {
                    logger.warn("Device authenticate retry failed before submitOrder", e)
                }
                if (!deviceStore.getToken()) {
                    state.isSubmitting = false
                    throw new Error("❌ Device not authenticated - missing token. Please register device first.")
                }
            }

            // Pinia stores auto-unwrap refs — deviceStore.table is always the plain object value.
            const tableId = deviceStore.getTableId()
            const tableName = deviceStore.getTableName()

            logger.debug("🔍 Table validation:", { tableId, tableName })

            if (tableId == null) {
                try {
                    await deviceStore.checkTableAssignment()
                } catch (e) {
                    logger.warn("Table assignment refresh failed before submitOrder", e)
                }
            }

            const refreshedTableId = deviceStore.getTableId()
            const refreshedTableName = deviceStore.getTableName()

            if (refreshedTableId == null) {
                logger.error("❌ Table validation failed - no table ID found", { tableName: refreshedTableName })
                state.isSubmitting = false
                throw new Error("❌ No table assigned to this device. Please contact staff.")
            }
            logger.debug("✅ Table validated:", refreshedTableName)

            if (!state.package?.id) {
                state.isSubmitting = false
                throw new Error("❌ No package selected. Please select a package first.")
            }

            if (state.guestCount < 1) {
                state.isSubmitting = false
                throw new Error("❌ Guest count must be at least 1.")
            }

            logger.debug("✅ All validations passed - proceeding with order submission")

            const api = useApi()
            let body = payload ?? buildPayload()

            // Inject table_id from deviceStore if not already set
            if (!body.table_id) {
                body = {
                    ...body,
                    table_id: refreshedTableId
                }
            }

            logger.debug("📦 Order Payload:", body)

            // ── Offline queue ────────────────────────────────────────────────────
            // If the device is offline, queue the order locally instead of failing.
            // The queue will be drained when connectivity is restored.
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                const { queueOrder } = useOfflineOrderQueue()
                // Generate / reuse the idempotency key even in the offline path so the
                // drain attempt sends the same key (avoids duplicates when both the queue
                // drain and a manual retry fire).
                const IDEM_KEY_STORAGE = "woosoo_order_idem_key"
                let offlineIdemKey = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(IDEM_KEY_STORAGE) : null)
                if (!offlineIdemKey) {
                    offlineIdemKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                    if (typeof sessionStorage !== "undefined") {
                        try { sessionStorage.setItem(IDEM_KEY_STORAGE, offlineIdemKey) } catch (e) { /* ignore */ }
                    }
                }
                queueOrder(body, offlineIdemKey)
                throw new Error("📶 No internet connection. Your order has been queued and will be sent automatically when you're back online.")
            }

            // ── Idempotency key: persist across retries ──────────────────────────
            // The header is always sent. The key is generated ONCE and stored in
            // sessionStorage so retries reuse the same key (preventing server-side
            // duplicates). The key is cleared on success; on failure it survives so
            // the next retry reuses it. Session.ts clear() also removes it.
            const IDEM_KEY_STORAGE = "woosoo_order_idem_key"
            let idempotencyKey = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(IDEM_KEY_STORAGE) : null)
            if (!idempotencyKey) {
                idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                if (typeof sessionStorage !== "undefined") {
                    try { sessionStorage.setItem(IDEM_KEY_STORAGE, idempotencyKey) } catch (e) { logger.debug("Failed to persist idempotency key", e) }
                }
            }

            try {
                const resp = await api.post(API_ENDPOINTS.DEVICE_CREATE_ORDER, body, { headers: { "X-Idempotency-Key": idempotencyKey } })
                const responseData = resp?.data ?? null
                logger.info("✅ Order submission SUCCESS")
                logger.debug("📥 Response:", responseData)

                if (!responseData) {
                    handleOrderError("Order creation response missing body")
                    throw new Error("Order creation response missing body")
                }

                // Update session with order ID from response
                const sessionStore = useSessionStore()

                // Check for success flag first
                if (!responseData.success) {
                    logger.error("❌ Server returned success=false:", responseData)
                    throw new Error(responseData.message || "Order processing failed on server")
                }

                // Only mark as placed if we get order_number or order_id from server
                const orderNumber = responseData.order?.order_number
                const orderId = responseData.order?.id

                logger.debug("🔍 Order created:", { orderNumber, orderId })

                if (orderNumber || orderId) {
                // Centralize marking order created
                    await setOrderCreated(responseData)
                    // Clear persisted idempotency key — next order gets a fresh key
                    if (typeof sessionStorage !== "undefined") {
                        try { sessionStorage.removeItem("woosoo_order_idem_key") } catch (e) { /* ignore */ }
                    }
                } else {
                    logger.error("❌ Missing order identifiers in response:", responseData)
                    throw new Error("Order confirmation failed: No order ID received from server")
                }

                return responseData
            } catch (error: any) {
                logger.error("❌ Order submission failed:", error.message)
                const errorResponse = extractErrorResponse(error)

                // Handle authentication errors specifically
                if (error.response?.status === 401 || errorResponse?.exception === "authentication") {
                    logger.error("🔐 Authentication error - token invalid or expired")
                    throw new Error("❌ Your session has expired. Please re-register this device in Settings.")
                }

                // Handle validation errors
                if (error.response?.status === 422) {
                    const validationErrors = errorResponse?.errors
                    logger.error("📋 Validation errors:", validationErrors)
                    const errorMessages = Object.values(validationErrors || {}).flat().join(", ")
                    throw new Error(`❌ Validation failed: ${errorMessages}`)
                }

                // Handle active-order conflicts by resuming the existing order
                if (error.response?.status === 409) {
                    const existingOrder = errorResponse?.order
                    if (existingOrder) {
                        logger.warn("↩️ Active order already exists for this device/session. Resuming existing order instead of creating a new one.", {
                            orderId: existingOrder?.order_id ?? existingOrder?.id,
                            status: existingOrder?.status,
                        })

                        const recoveredResponse = {
                            success: true,
                            resumed: true,
                            message: errorResponse?.message || "Existing active order found. Resuming current order.",
                            order: existingOrder,
                        }

                        await setOrderCreated(recoveredResponse)
                        return recoveredResponse
                    }

                    throw new Error(errorResponse?.message || "An active order already exists for this device. Please continue the existing session.")
                }

                if (error.response?.status === 503 && errorResponse?.code === "SESSION_NOT_FOUND") {
                    throw new Error("❌ No active POS terminal session found. Please ask staff to open a POS session, then try again.")
                }

                // Handle server errors with debugging guidance
                if (error.response?.status === 500) {
                    const serverMessage = errorResponse?.message || "Internal server error"
                    logger.error("🔴 SERVER ERROR (500) - Backend crashed")

                    throw new Error(
                        `❌ ${serverMessage}\n\n` +
          "🔧 Backend debugging needed:\n" +
          "1. Check Laravel logs (storage/logs/laravel.log)\n" +
          "2. Enable APP_DEBUG=true in .env\n" +
          "3. Verify database schema and OrderService\n\n" +
          "Use Settings > Backend Diagnostics to test directly."
                    )
                }

                if (error instanceof Error && /missing body|Cannot mark order created from empty response/.test(error.message)) {
                    throw error
                }

                // Handle network errors
                if (!error.response) {
                    throw new Error("❌ Network error: Cannot reach backend server. Check if Laravel is running.")
                }

                throw error
            }
        } finally {
            state.isSubmitting = false
        }
    }

    async function submitRefill (payload?: any) {
        if (!state.currentOrder && !state.hasPlacedOrder) {
            throw new Error("No existing order found — cannot submit a refill.")
        }
        if (state.isSubmitting) {
            throw new Error("Order submission already in progress. Please wait.")
        }
        state.isSubmitting = true
        try {
            const invalidRefillItem = state.refillItems.find((i) => {
                const cat = (i.category ?? "").toLowerCase()
                const isMeat = cat === "meats" || cat === "meat" || cat.includes("meat")
                const isSide = cat === "sides" || cat === "side" || cat.includes("side")
                return !isMeat && !isSide
            })
            if (invalidRefillItem) {
                throw new Error("Refill validation failed: only meats and sides are allowed")
            }

            const api = useApi()
            const sessionStore = useSessionStore()
            const terminalStatuses = new Set(["completed", "voided", "cancelled"])

            // Use order_id (business ID) - goes in URL path
            const currentOrderId = state.currentOrder?.order?.order_id ??
            state.currentOrder?.order?.id ??
            sessionStore.getOrderId()

            if (!currentOrderId) {
                throw new Error("Cannot submit refill: missing order ID")
            }

            // Safety gate: never submit refill against terminal orders.
            // We verify against the live backend status to handle stale local state after transient failures.
            const localStatus = String(state.currentOrder?.order?.status || state.currentOrder?.status || "").toLowerCase()
            if (terminalStatuses.has(localStatus)) {
                try { await Promise.resolve(sessionStore.end()) } catch (e) { logger.warn("[Refill] sessionStore.end() failed after local terminal status", e) }
                throw new Error("This order is already completed/cancelled. Session has ended.")
            }

            try {
                const statusResp = await api.get(`/api/device-order/by-order-id/${currentOrderId}`)
                const statusData = statusResp?.data ?? null
                const liveOrder = statusData?.order || statusData?.data || statusData

                if (!liveOrder) {
                    throw new Error("Unable to verify current order status. Please try again in a moment.")
                }

                const liveStatus = String(liveOrder?.status || "").toLowerCase()
                state.currentOrder = { order: liveOrder }
                if (terminalStatuses.has(liveStatus)) {
                    try { await Promise.resolve(sessionStore.end()) } catch (e) { logger.warn("[Refill] sessionStore.end() failed after live terminal status", e) }
                    throw new Error("This order is already completed/cancelled. Session has ended.")
                }
            } catch (error) {
                if (error instanceof Error && /completed\/cancelled|Unable to verify current order status/i.test(error.message)) {
                    throw error
                }
                throw new Error("Unable to verify current order status. Please try again in a moment.")
            }

            // Build payload matching POST /api/order/{orderId}/refill spec
            // RefillOrderRequest requires: items.*.name (required), items.*.menu_id, items.*.quantity
            const refillPayload = buildRefillPayload()

            logger.debug("[Refill] Submitting refill payload", {
                orderId: currentOrderId,
                refillPayload,
            })

            try {
                const idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                const resp = await api.post(API_ENDPOINTS.ORDER_REFILL(currentOrderId), payload ?? refillPayload, { headers: { "X-Idempotency-Key": idempotencyKey } })
                const responseData = extractResponseData(resp)
                if (!responseData) {
                    handleOrderError("Refill response missing body")
                    throw new Error("Refill response missing body")
                }
                // Update submittedItems to reflect the current refill round so the
                // in-session left column always shows the LAST submitted batch of items.
                state.submittedItems = state.refillItems.map(item => ({
                    id: item.id,
                    menu_id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    img_url: item.img_url || null,
                    category: item.category || null,
                    isUnlimited: item.isUnlimited,
                }))
                state.refillItems = []
                state.isRefillMode = false
                state.history = [...state.history, { ...responseData, type: "refill" }]
                logger.info("[Refill] Success")
                return responseData
            } catch (error: any) {
                logger.error("[Refill] Failed:", error?.response?.data || error)
                throw error
            }
        } finally {
            state.isSubmitting = false
        }
    }

    async function setOrderCreated (respData: OrderApiResponse) {
        if (!respData) {
            handleOrderError("Cannot mark order created from empty response")
            throw new Error("Cannot mark order created from empty response")
        }

        const sessionStore = useSessionStore()

        const orderNumber = respData?.order?.order_number || respData?.order_number || respData?.order?.id
        // Use order_id (business ID like 19583), not order_number or internal id
        const orderId = respData?.order?.order_id || respData?.order_id || respData?.order?.id || respData?.id

        // Store the numeric order_id in session for API lookups
        if (orderId !== null && orderId !== undefined) {
            sessionStore.setOrderId(Number(orderId))
        }
        state.hasPlacedOrder = true
        state.currentOrder = respData

        // Save submitted items with names before clearing cart (for display in sidebar)
        // Backend order_items may not include names, so we keep our local copy
        state.submittedItems = state.cartItems.map(item => ({
            id: item.id,
            menu_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            img_url: item.img_url || null,
            category: item.category || null,
            isUnlimited: item.isUnlimited
        }))

        state.cartItems = []
        state.history = [...state.history, respData]

        logger.info("✅ Order marked created:", { orderId: sessionStore.orderId, orderNumber, submittedItemsCount: state.submittedItems.length })
        // Start polling fallback by order_id (only triggered when order is created)
        try {
            // Use order_id (business ID like 19561), not the database id
            const resolvedOrderId = respData?.order?.order_id || respData?.order_id || respData?.order?.id || respData?.id || sessionStore.getOrderId()
            logger.debug("🔄 Starting polling with order_id:", resolvedOrderId)
            if (resolvedOrderId) {
                // Start a lightweight poller that fetches canonical order by order_id every 5s
                // This is used as a fallback in case realtime broadcasts are delayed/unavailable
                startPolling(resolvedOrderId)
            } else {
                logger.warn("setOrderCreated: could not resolve order_id to start polling")
            }
        } catch (err) {
            logger.warn("setOrderCreated: failed to start polling", err)
        }
    }

    // Polling: fixed 5s interval, only started when an order is created
    function stopPolling () {
        try {
            if (pollIntervalId) {
                clearInterval(pollIntervalId)
            }
        } catch (e) {
            logger.debug("stopPolling: clearInterval failed", e)
        }
        pollIntervalId = null
        state.isPolling = false
        state.pollInflight = false
        state.pollingOrderId = null
        pollStartTime = null
        clearCompletionTimeout()
        logger.debug("✅ Order polling stopped")
    }

    function startPolling (orderIdentifier: number | string) {
        const orderId = String(orderIdentifier)
        if (!orderId || orderId === "null" || orderId === "undefined") {
            logger.warn("startPolling: invalid order id", orderIdentifier)
            return
        }

        // If already polling same order, no-op
        if (state.isPolling && state.pollingOrderId === orderId) {
            logger.debug("startPolling: already polling order", orderId)
            return
        }

        // Clear any existing poll first
        stopPolling()

        // Only poll when online
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            logger.warn("startPolling: offline — skipping start")
            return
        }

        state.isPolling = true
        state.pollingOrderId = orderId
        pollStartTime = Date.now()

        const tick = async () => {
            if (state.pollInflight) { return }
            if (!state.isPolling || state.pollingOrderId !== orderId) { return }

            if (pollStartTime && (Date.now() - pollStartTime) > maxPollingRuntimeMs) {
                logger.warn("startPolling: max runtime exceeded, stopping polling", { orderId, maxPollingRuntimeMs })
                stopPolling()
                return
            }
            state.pollInflight = true
            const tickStart = performance.now()
            try {
                const api = useApi()
                if (!api || typeof api.get !== "function") {
                    logger.warn("startPolling: api client unavailable — stopping order polling")
                    stopPolling()
                    return
                }
                const url = `/api/device-order/by-order-id/${orderId}`
                const resp = await api.get(url)
                const responseData = resp?.data ?? null
                const tickMs = (performance.now() - tickStart).toFixed(1)

                if (!responseData) {
                    handleOrderError("Polling response missing body")
                    logger.warn("[Polling] Missing response body", { orderId, latencyMs: tickMs })
                    return
                }

                // Normalize returned order object
                const orderObj = responseData.order || responseData.data || responseData
                if (orderObj) {
                    const status = orderObj?.status
                    logger.debug("[Polling] Tick", {
                        orderId,
                        status,
                        latencyMs: tickMs,
                    })

                    // Update currentOrder to canonical server resource
                    state.currentOrder = { order: orderObj }
                    state.hasPlacedOrder = true
                    // Persist session order id if missing
                    try {
                        const sessionStore = useSessionStore()
                        const polledOrderId = extractOrderId(orderObj)
                        if (polledOrderId !== null && polledOrderId !== undefined) {
                            sessionStore.setOrderId(Number(polledOrderId))
                        }
                    } catch (e) {
                        // ignore
                    }

                    // Stop polling on any non-live status and end the session.
                    // Live statuses are pending and confirmed only; everything else
                    // (preparing, ready, served, completed, voided, cancelled, etc.) ends the guest session.
                    if (status !== "pending" && status !== "confirmed") {
                        logger.info("[Polling] Terminal status observed", { orderId, status })
                        stopPolling()

                        try {
                            // Small delay to allow any final UI updates. Await session end
                            // and clear order state immediately to avoid a refill UI loop.
                            clearCompletionTimeout()
                            completionTimeoutId = window.setTimeout(async () => {
                                try {
                                    // Load session store instance and call end
                                    const sessionStore = useSessionStore()

                                    try {
                                        if (sessionStore.end) {
                                            const res = sessionStore.end()
                                            if (res && typeof (res as any).then === "function") { await res }
                                        }
                                    } catch (e) {
                                        logger.warn("sessionStore.end() threw:", e)
                                    }

                                    // Immediately clear local order state to prevent UI flicker/loop
                                    try {
                                        state.cartItems = []
                                        state.refillItems = []
                                        state.submittedItems = []
                                        state.package = null
                                        state.currentOrder = null
                                        state.hasPlacedOrder = false
                                        state.isRefillMode = false
                                    } catch (e) {
                                        logger.warn("Failed to clear order state after terminal status:", e)
                                    }

                                    // Navigate to home page without reload to preserve fullscreen
                                    const nuxtApp = useNuxtApp()
                                    await nuxtApp.$router.replace("/")
                                } catch (e) {
                                    logger.warn("Failed to end session on terminal order status:", e)
                                } finally {
                                    completionTimeoutId = null
                                }
                            }, 2000)
                        } catch (e) {
                            logger.warn("Failed to end session on terminal order status:", e)
                        }
                    }
                }
            } catch (error) {
                const tickMs = (performance.now() - tickStart).toFixed(1)
                logger.error("[Polling] Error", {
                    orderId,
                    error: error instanceof Error ? error.message : String(error),
                    latencyMs: tickMs,
                })
                logger.warn("Order polling tick failed:", error)
            } finally {
                state.pollInflight = false
            }
        }

        // Run immediately, then every 5s
        logger.info("[Polling] Started", { orderId, intervalMs: 5000 })
        tick().catch(() => {})
        pollIntervalId = setInterval(() => tick().catch(() => {}), 5000)
        logger.info("✅ Order polling started for", orderId)
    }

    // Backward compatibility aliases for existing callers/tests.
    function stopOrderPolling () {
        stopPolling()
    }

    function startOrderPolling (orderIdentifier: number | string) {
        startPolling(orderIdentifier)
    }

    async function initializeFromSession () {
        const sessionStore = useSessionStore()
        const deviceStore = useDeviceStore()

        logger.debug("🔁 initializeFromSession called:", {
            sessionOrderId: sessionStore.getOrderId(),
            stateHasPlacedOrder: state.hasPlacedOrder,
            stateCurrentOrder: !!state.currentOrder,
            sessionIsActive: sessionStore.getIsActive()
        })

        // If no orderId in session, attempt server-side active-order recovery first.
        // This handles direct URL access / reloads where local storage lost orderId,
        // but backend still has a pending/confirmed order for this tablet.
        if (!sessionStore.getOrderId()) {
            const hasStaleTransactionalState = (
                state.hasPlacedOrder ||
                !!state.currentOrder ||
                state.isRefillMode ||
                !!state.package ||
                state.guestCount !== 2 ||
                state.cartItems.length > 0 ||
                state.refillItems.length > 0 ||
                state.submittedItems.length > 0
            )

            // Guard: If session is active (user is actively building an order) and no order placed yet,
            // DON'T reset transactional state. This prevents wiping guest count / package selection
            // during normal menu browsing. Only reset if session has expired/is inactive.
            const isActiveSession = sessionStore.getIsActive()
            const shouldSkipResetDueToActiveSession = isActiveSession && !state.hasPlacedOrder
            const shouldClearStaleState = hasStaleTransactionalState && !shouldSkipResetDueToActiveSession

            if (!deviceStore.getToken()) {
                if (shouldClearStaleState) {
                    logger.info("🔁 No token + no session.orderId: clearing stale transactional order state")
                    resetTransactionalState()
                } else if (shouldSkipResetDueToActiveSession) {
                    logger.debug("🔁 Session active & no order placed yet: preserving transactional state (menu browsing)")
                }
                logger.debug("🔁 Skipping active-order lookup until device token is available")
                return
            }

            try {
                const api = useApi()
                const activeResp = await api.get(API_ENDPOINTS.DEVICE_ORDERS, {
                    params: {
                        status: "pending,confirmed,ready",
                        per_page: 1,
                    },
                })

                const activeOrder = extractFirstListItem(extractResponseData(activeResp))
                const activeOrderId = activeOrder?.order_id || activeOrder?.id
                const activeStatus = String(activeOrder?.status || "").toLowerCase()

                if (activeOrderId && !["completed", "voided", "cancelled"].includes(activeStatus)) {
                    // Session-scope guard: skip orders that pre-date this session.
                    // Prevents a previous customer's unfinished order from being adopted
                    // by the next customer's fresh session.
                    const sessionStartedAt = (sessionStore.sessionStartedAt as unknown as number | null)
                    const orderCreatedAt = activeOrder?.created_at
                        ? new Date(activeOrder.created_at).getTime()
                        : null
                    if (sessionStartedAt && orderCreatedAt && orderCreatedAt < sessionStartedAt - 60_000) {
                        logger.info("🔁 Recovered order pre-dates current session — skipping to avoid cross-session contamination", {
                            orderId: activeOrderId,
                            orderCreatedAt: new Date(orderCreatedAt).toISOString(),
                            sessionStartedAt: new Date(sessionStartedAt).toISOString(),
                        })
                        return
                    }

                    sessionStore.setOrderId(Number(activeOrderId))
                    sessionStore.setIsActive(true)
                    if (typeof window !== "undefined" && window.localStorage) {
                        try { window.localStorage.setItem("session_active", "1") } catch (e) { /* ignore */ }
                    }

                    state.hasPlacedOrder = true
                    state.currentOrder = { order: activeOrder }
                    logger.info("🔁 Recovered active order from active order endpoint:", {
                        orderId: activeOrderId,
                        status: activeStatus,
                    })

                    startPolling(String(activeOrderId))
                    return
                }
            } catch (err) {
                logger.warn("🔁 Active order lookup failed; continuing local-state fallback", err)
            }

            // If still no orderId, reset stale hasPlacedOrder flag after a short grace
            if (shouldClearStaleState) {
                logger.info("🔁 No session.orderId found, resetting stale order state (with grace)")
                // Apply a short grace period to avoid clearing during quick transitions
                await new Promise(resolve => setTimeout(resolve, 1500))
                // Re-check the session store in case orderId was set during grace
                const refreshed = useSessionStore()
                if (!refreshed.getOrderId()) {
                    resetTransactionalState()
                } else {
                    logger.debug("initializeFromSession: session.orderId appeared during grace, skipping clear")
                }
            } else if (shouldSkipResetDueToActiveSession && hasStaleTransactionalState) {
                logger.debug("🔁 Grace period skipped: session active & no order placed yet (preserving transactional state)")
            }
            return
        }

        // Mark order as placed locally and attempt to fetch canonical order details
        state.hasPlacedOrder = true

        if (!deviceStore.getToken()) {
            state.currentOrder = { order: { order_id: sessionStore.getOrderId() } }
            logger.debug("🔁 Deferred canonical order fetch until device token is available")
            return
        }

        try {
            const api = useApi()
            const orderIdStr = String(sessionStore.getOrderId())
            if (orderIdStr && orderIdStr !== "null" && orderIdStr !== "undefined") {
                const resp = await api.get(`/api/device-order/by-order-id/${orderIdStr}`)
                const orderObj = resp.data?.order || resp.data
                if (orderObj) {
                    state.currentOrder = { order: orderObj }
                    logger.debug("🔁 Fetched order from server for session.orderId:", orderIdStr)

                    // Start polling for this order
                    startPolling(orderIdStr)
                } else {
                    state.currentOrder = { order: { order_id: sessionStore.getOrderId() } }
                    logger.warn("🔁 No order payload returned; initialized minimal order_id:", sessionStore.getOrderId())
                }
            } else {
                state.currentOrder = { order: { order_id: sessionStore.getOrderId() } }
                logger.warn("🔁 session.orderId is invalid; initialized minimal order_id:", sessionStore.getOrderId())
            }
        } catch (err) {
            state.currentOrder = { order: { order_id: sessionStore.getOrderId() } }
            logger.warn("🔁 Failed to fetch order during initializeFromSession:", err)
        }
        logger.debug("🔁 Initialized order state from session.orderId:", sessionStore.getOrderId())
    }

    // Broadcast event handlers
    function updateOrderStatus (status: string) {
        if (state.currentOrder?.order) {
            state.currentOrder.order.status = status
        }
    }

    function completeOrder () {
        if (state.currentOrder?.order) {
            state.currentOrder.order.status = "completed"
        }
    }

    function clearOrder () {
        stopPolling()
        state.currentOrder = null
        state.hasPlacedOrder = false
        state.submittedItems = []
    }

    // Typed cross-store mutation helpers — avoids TypeScript Ref<T> false-positives
    // when Pinia 3 + Vue 3.5 fails to unwrap setup store return types.
    function clearCart () { state.cartItems = [] }
    function clearRefillItems () { state.refillItems = [] }
    function clearSubmittedItems () { state.submittedItems = [] }
    function clearPackage () { state.package = null }
    function clearCurrentOrder () {
        stopPolling()
        state.currentOrder = null
    }
    function setHasPlacedOrder (val: boolean) { state.hasPlacedOrder = val }
    function setIsRefillMode (val: boolean) { state.isRefillMode = val }
    function clearHistory () { state.history = [] }
    function setCartItems (items: CartItem[]) { state.cartItems = items }
    function setRefillItems (items: CartItem[]) { state.refillItems = items }
    function setSubmittedItems (items: SubmittedItem[]) { state.submittedItems = items }
    function setCurrentOrder (order: OrderApiResponse | null) { state.currentOrder = order }

    // Typed read accessor — returns the nested order status without Ref<T> confusion
    function getCurrentOrderStatus (): string | undefined { return state.currentOrder?.order?.status }
    // Returns the current order response object (typed, no Ref<T> wrapper)
    function getCurrentOrder (): OrderApiResponse | null { return state.currentOrder }
    function getHistory (): Array<OrderApiResponse & { type?: string }> { return state.history }
    function getCartItems (): CartItem[] { return state.cartItems }
    function getRefillItems (): CartItem[] { return state.refillItems }
    function getSubmittedItems (): SubmittedItem[] { return state.submittedItems }
    function getIsPolling (): boolean { return state.isPolling }
    function getPollTimerId (): ReturnType<typeof setInterval> | null { return pollIntervalId }
    function getPollingOrderId (): string | null { return state.pollingOrderId }

    validateOrderState("init")

    onScopeDispose(() => {
        stopPolling()
        clearCompletionTimeout()
    })

    return {
        ...toRefs(state),
        getCartItemQuantity,
        getPackage,
        getPackageModifiers,
        packageTotal,
        addOnsTotal,
        taxAmount,
        grandTotal,
        refillTotal,
        activeCart,
        setPackage,
        setGuestCount,
        addToCart,
        updateQuantity,
        remove,
        clearRefillCart,
        toggleRefillMode,
        buildPayload,
        buildRefillPayload,
        submitOrder,
        submitRefill,
        setOrderCreated,
        initializeFromSession,
        updateOrderStatus,
        completeOrder,
        clearOrder,
        resetTransactionalState,
        clearCart,
        clearRefillItems,
        clearSubmittedItems,
        clearPackage,
        clearCurrentOrder,
        setHasPlacedOrder,
        setIsRefillMode,
        clearHistory,
        setCartItems,
        setRefillItems,
        setSubmittedItems,
        setCurrentOrder,
        getCurrentOrder,
        getCurrentOrderStatus,
        getHistory,
        getCartItems,
        getRefillItems,
        getSubmittedItems,
        getIsPolling,
        getPollTimerId,
        getPollingOrderId,
        // Polling controls
        startPolling,
        stopPolling,
        startOrderPolling,
        stopOrderPolling,
        handleOrderError
    }
}, {
    persist: {
        key: "order-store",
        storage: (typeof localStorage !== "undefined") ? localStorage : undefined,
        pick: ["guestCount", "package", "hasPlacedOrder", "currentOrder", "submittedItems", "isRefillMode", "history", "cartItems", "refillItems"]
    }
})
