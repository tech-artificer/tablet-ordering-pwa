import { defineStore } from "pinia"
import { reactive, computed, toRefs } from "vue"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import { notifyBlockedAction } from "../composables/useNotifier"
import type { CartItem, Package, MenuItem, OrderApiResponse, OrderPayload, OrderPayloadItem, RefillPayload } from "../types"
import { API_ENDPOINTS } from "../config/api"
import { ERROR_MENU_ITEM_UNAVAILABLE } from "../utils/errorCodes"
import { useDeviceStore } from "./Device"
import { useMenuStore } from "./Menu"
import { useSessionStore } from "./Session"

// ─────────────────────────────────────────────────────────────────────────────
// DATA MODEL (see docs/DATA_MODEL.md)
// Append-only ledger of submitted rounds. rounds[] / draft / mode is the
// single source of truth. Legacy fields removed in TASK E Phase 1.
// ─────────────────────────────────────────────────────────────────────────────
export type OrderRoundKind = "initial" | "refill"
export type OrderMode = "initial" | "refill"
export type OrderServerStatus = "building" | "in-progress" | "completed" | "cancelled" | "voided" | string

export interface OrderRound {
    kind: OrderRoundKind
    number: number // 1 = initial, 2..n = refill #N-1
    submittedAt: string // ISO timestamp from server (or client fallback)
    items: CartItem[] // immutable snapshot at submit time
    serverOrderId: number | null // parent order id (same across all rounds for one order)
    serverRefillId?: number | null // refill-specific id when applicable
    serverTotal: number // server-reported total for this round
}

const UNLIMITED_ITEM_CAP = 5

const toMoney = (value: unknown): number => {
    const numeric = Number(value || 0)
    if (!Number.isFinite(numeric)) { return 0 }
    return Math.round((numeric + Number.EPSILON) * 100) / 100
}

const normalizeCartCategory = (category?: string | null): string | null => {
    const normalized = String(category ?? "").trim().toLowerCase()
    if (!normalized) { return null }
    if (normalized === "meat") { return "meats" }
    if (normalized === "side") { return "sides" }
    return normalized
}

type SubmitOrderOptions = {
    headers?: Record<string, string>
    clientSubmissionId?: string
}

type SubmitRefillOptions = {
    headers?: Record<string, string>
    idempotencyKey?: string
    clientSubmissionId?: string
}

type MenuUnavailableError = Error & { code: string }

export const useOrderStore = defineStore("order", () => {
    const state = reactive({
        package: null as Package | null,
        guestCount: 2 as number,
        isSubmitting: false as boolean,
        error: null as string | null,
        // ─── Primary data model (see docs/DATA_MODEL.md) ─────────────────────
        rounds: [] as OrderRound[],
        draft: [] as CartItem[],
        mode: "initial" as OrderMode,
        serverOrderId: null as number | null,
        serverStatus: "building" as OrderServerStatus,
        serverTotal: 0 as number,
    })

    function handleOrderError (message: string): void {
        state.error = message
        state.isSubmitting = false
        logger.error("[Order Store Error]", message)
    }

    // ─────────────────────────────────────────────────────────────────────
    // appendRound — single mutator for the ledger. Called AFTER a server
    // success response from either initial-submit or refill-submit paths.
    // ─────────────────────────────────────────────────────────────────────
    function appendRound (
        kind: OrderRoundKind,
        sourceItems: CartItem[],
        respData: any
    ): void {
        try {
            const orderObj = respData?.order ?? respData ?? {}
            const parentOrderId = Number(
                orderObj?.order_id ??
                respData?.order_id ??
                state.rounds[0]?.serverOrderId ??
                state.serverOrderId ??
                0
            ) || null
            const refillId = Number(
                orderObj?.refill_id ?? respData?.refill_id ?? 0
            ) || null
            const total = Number(
                orderObj?.total_amount ??
                respData?.total_amount ??
                orderObj?.total ??
                0
            ) || 0
            const submittedAt = String(
                orderObj?.created_at ??
                respData?.created_at ??
                new Date().toISOString()
            )
            const nextNumber = state.rounds.length + 1

            const round: OrderRound = {
                kind,
                number: nextNumber,
                submittedAt,
                items: sourceItems.map(item => ({ ...item })),
                serverOrderId: parentOrderId,
                serverRefillId: refillId,
                serverTotal: total,
            }

            state.rounds = [...state.rounds, round]
            state.draft = []
            state.serverOrderId = parentOrderId ?? state.serverOrderId
            state.serverStatus = String(orderObj?.status ?? respData?.status ?? state.serverStatus)
            state.serverTotal = total || state.serverTotal
            state.mode = "refill"

            logger.info("[Order Ledger] Round appended", {
                kind,
                number: nextNumber,
                itemCount: round.items.length,
                serverOrderId: round.serverOrderId,
                serverRefillId: round.serverRefillId,
                serverTotal: round.serverTotal,
            })
        } catch (error) {
            logger.error("[Order Ledger] Failed to append round", error)
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

    function getServerOrderId (): number | null {
        if (state.serverOrderId !== null) { return state.serverOrderId }
        const sessionStore = useSessionStore()
        const id = sessionStore.getOrderId()
        return (id !== null && id !== undefined) ? Number(id) : null
    }

    function buildAvailableMenuIdSet (menuStore: ReturnType<typeof useMenuStore>): Set<number> {
        const menuIds = new Set<number>()

        const collectIds = (items: unknown[]) => {
            items.forEach((item: any) => {
                const id = Number(item?.id)
                if (Number.isFinite(id) && id > 0) {
                    menuIds.add(id)
                }
            })
        }

        collectIds(menuStore.packages || [])
        collectIds(menuStore.sides || [])
        collectIds(menuStore.desserts || [])
        collectIds(menuStore.beverages || [])

        return menuIds
    }

    function createMenuUnavailableError (): MenuUnavailableError {
        const error = new Error("Some menu items are no longer available. We refreshed the menu. Please review your order again.") as MenuUnavailableError
        error.code = ERROR_MENU_ITEM_UNAVAILABLE
        return error
    }

    const getCartItemQuantity = (id: number) => {
        return state.draft.find(i => i.id === id)?.quantity ?? 0
    }

    const getPackage = computed(() => state.package)
    const getPackageModifiers = computed(() => state.package?.modifiers ?? [])

    const refillTotal = computed(() =>
        state.draft.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0)
    )

    const activeCart = computed(() => state.draft)

    const packageTotal = computed(() => toMoney(Number(state.package?.price || 0) * Number(state.guestCount || 1)))

    const addOnsTotal = computed(() =>
        toMoney(state.draft
            .filter(it => normalizeCartCategory(it.category) !== "meats")
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
        if ((state.package as Package)?.id === item.id) {
            state.guestCount = Number(state.guestCount) + 1
            return
        }

        const existing = state.draft.find(i => i.id === item.id)
        const category = normalizeCartCategory(opts?.category ?? (item as any)?.category)

        if (existing) {
            const isUnlimited = Boolean(existing.isUnlimited || opts?.isUnlimited)
            const max = isUnlimited ? UNLIMITED_ITEM_CAP : 99
            existing.quantity = Math.min(Number(existing.quantity) + 1, max)
            existing.category = normalizeCartCategory(existing.category ?? category)
        } else {
            state.draft.push({
                id: Number(item.id),
                name: item.name,
                img_url: item.img_url || "",
                price: Number(item.price || 0),
                quantity: 1,
                isUnlimited: Boolean(opts?.isUnlimited),
                category,
            })
        }
    }

    function updateQuantity (id: number, quantity: number) {
        if (state.package?.id === id) {
            state.guestCount = Math.max(2, Number(quantity))
            return
        }

        const existing = state.draft.find(i => i.id === id)
        if (!existing) { return }

        const max = existing.isUnlimited ? UNLIMITED_ITEM_CAP : 99
        const q = Math.min(Math.max(0, Number(quantity)), max)
        existing.quantity = q
        if (existing.quantity <= 0) { remove(id) }
    }

    function remove (id: number) {
        if (state.package?.id === id) {
            state.package = null
            return
        }
        state.draft = state.draft.filter(i => i.id !== id)
    }

    function clearRefillCart () {
        state.draft = []
    }

    function toggleRefillMode (enabled: boolean) {
        if (enabled && state.rounds.length === 0) {
            logger.warn("toggleRefillMode blocked: cannot enter refill mode before placing initial order")
            notifyBlockedAction("Cannot enter Refill mode until initial order is placed")
            return
        }
        state.mode = enabled ? "refill" : "initial"
        if (enabled) {
            state.draft = []
        }
    }

    function normalizePayloadItems (items: CartItem[]): OrderPayloadItem[] {
        const grouped = new Map<number, number>()

        items.forEach((item) => {
            const menuId = Number(item.id)
            const quantity = Number(item.quantity)
            if (!Number.isFinite(menuId) || menuId <= 0) { return }
            if (!Number.isFinite(quantity) || quantity < 1) { return }
            grouped.set(menuId, (grouped.get(menuId) ?? 0) + quantity)
        })

        return Array.from(grouped.entries()).map(([menuId, quantity]) => ({ menu_id: menuId, quantity }))
    }

    function buildPayload (): OrderPayload {
        logger.debug("Validating payload structure...")

        const pkg = state.package as any
        const kryptonMenuId = Number(pkg?.krypton_menu_id ?? pkg?.package_id ?? pkg?.id)

        logger.debug("Package selection for order", {
            local_package_id: pkg?.id,
            krypton_menu_id: pkg?.krypton_menu_id,
            package_id_fallback: pkg?.package_id,
            submitted_package_id: kryptonMenuId,
        })

        if (!Number.isFinite(kryptonMenuId) || kryptonMenuId <= 0) {
            throw new Error("Invalid package_id: package must be selected with valid krypton_menu_id")
        }

        const payload = {
            guest_count: Number(state.guestCount),
            package_id: kryptonMenuId,
            items: normalizePayloadItems(state.draft),
        }

        if (!payload.guest_count || payload.guest_count < 1) {
            throw new Error("Invalid guest_count: must be at least 1")
        }

        if (!Array.isArray(payload.items) || payload.items.length === 0) {
            throw new Error("Invalid items: must be a non-empty array")
        }

        payload.items.forEach((item, index) => {
            if (!item.menu_id || typeof item.menu_id !== "number") {
                throw new Error(`Invalid item[${index}].menu_id: must be a number`)
            }
            if (!item.quantity || item.quantity < 1) {
                throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
            }
        })

        logger.debug("Payload validation passed")
        return payload
    }

    function buildRefillPayload (): RefillPayload {
        return {
            order_id: getServerOrderId() as number,
            items: normalizePayloadItems(state.draft),
        }
    }

    async function submitOrder (payload?: OrderPayload, options?: SubmitOrderOptions) {
        if (state.rounds.length > 0 || state.serverOrderId !== null) {
            throw new Error("An initial order has already been placed for this session. Use refill instead.")
        }
        if (state.isSubmitting) {
            throw new Error("Order submission already in progress. Please wait.")
        }
        state.isSubmitting = true
        try {
            const deviceStore = useDeviceStore()

            logger.debug("Pre-submission validation:", {
                hasPackage: !!state.package?.id,
                packageId: state.package?.id,
                guestCount: state.guestCount,
                draftItemCount: state.draft.length,
                isAuthenticated: deviceStore.isAuthenticated
            })

            if (!deviceStore.getToken()) {
                try {
                    await deviceStore.authenticate()
                } catch (e) {
                    logger.warn("Device authenticate retry failed before submitOrder", e)
                }
                if (!deviceStore.getToken()) {
                    state.isSubmitting = false
                    throw new Error("Device not authenticated - missing token. Please register device first.")
                }
            }

            const tableId = deviceStore.getTableId()
            const tableName = deviceStore.getTableName()

            logger.debug("Table validation:", { tableId, tableName })

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
                logger.error("Table validation failed - no table ID found", { tableName: refreshedTableName })
                state.isSubmitting = false
                throw new Error("No table assigned to this device. Please contact staff.")
            }
            logger.debug("Table validated:", refreshedTableName)

            if (!state.package?.id) {
                state.isSubmitting = false
                throw new Error("No package selected. Please select a package first.")
            }

            if (state.guestCount < 1) {
                state.isSubmitting = false
                throw new Error("Guest count must be at least 1.")
            }

            logger.debug("All validations passed - proceeding with order submission")

            const api = useApi()
            const body = payload ?? buildPayload()

            if (options?.clientSubmissionId) {
                body.client_submission_id = options.clientSubmissionId
            }

            logger.debug("Order Payload:", body)

            const IDEM_KEY_STORAGE = "woosoo_order_idem_key"
            let idempotencyKey = options?.headers?.["X-Idempotency-Key"] ?? (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(IDEM_KEY_STORAGE) : null)
            if (!idempotencyKey) {
                idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                if (typeof sessionStorage !== "undefined") {
                    try { sessionStorage.setItem(IDEM_KEY_STORAGE, idempotencyKey) } catch (e) { logger.debug("Failed to persist idempotency key", e) }
                }
            }

            try {
                const resp = await api.post(API_ENDPOINTS.DEVICE_CREATE_ORDER, body, {
                    headers: {
                        ...options?.headers,
                        "X-Idempotency-Key": idempotencyKey
                    }
                })
                const responseData = resp?.data ?? null
                logger.info("Order submission SUCCESS")
                logger.debug("Response:", responseData)

                if (!responseData) {
                    handleOrderError("Order creation response missing body")
                    throw new Error("Order creation response missing body")
                }

                if (!responseData.success) {
                    logger.error("Server returned success=false:", responseData)
                    throw new Error(responseData.message || "Order processing failed on server")
                }

                const orderNumber = responseData.order?.order_number
                const orderId = responseData.order?.id

                logger.debug("Order created:", { orderNumber, orderId })

                if (orderNumber || orderId) {
                    await setOrderCreated(responseData)
                    if (typeof sessionStorage !== "undefined") {
                        try { sessionStorage.removeItem("woosoo_order_idem_key") } catch (e) { /* ignore */ }
                    }
                } else {
                    logger.error("Missing order identifiers in response:", responseData)
                    throw new Error("Order confirmation failed: No order ID received from server")
                }

                return responseData
            } catch (error: any) {
                logger.error("Order submission failed:", error.message)
                const errorResponse = extractErrorResponse(error)

                if (error.response?.status === 401 || errorResponse?.exception === "authentication") {
                    logger.error("Authentication error - token invalid or expired")
                    throw new Error("Your session has expired. Please re-register this device in Settings.")
                }

                if (error.response?.status === 422 && errorResponse?.code === ERROR_MENU_ITEM_UNAVAILABLE) {
                    const menuStore = useMenuStore()

                    try {
                        await menuStore.loadAllMenus(true)
                    } catch (refreshError) {
                        logger.warn("Failed to refresh menus after MENU_ITEM_UNAVAILABLE", refreshError)
                    }

                    const validMenuIds = buildAvailableMenuIdSet(menuStore)
                    state.draft = state.draft.filter(item => validMenuIds.has(Number(item.id)))

                    const selectedPackageId = Number(state.package?.id ?? 0)
                    if (selectedPackageId > 0 && !validMenuIds.has(selectedPackageId)) {
                        state.package = null
                    }

                    throw createMenuUnavailableError()
                }

                if (error.response?.status === 422) {
                    const validationErrors = errorResponse?.errors
                    if (validationErrors && Object.keys(validationErrors).length > 0) {
                        logger.error("Validation errors:", validationErrors)
                        const errorMessages = Object.values(validationErrors || {}).flat().join(", ")
                        throw new Error(`Validation failed: ${errorMessages}`)
                    }

                    throw new Error(errorResponse?.message || "Order validation failed.")
                }

                if (error.response?.status === 409) {
                    const existingOrder = errorResponse?.order
                    if (existingOrder) {
                        logger.warn("Active order already exists for this device/session. Resuming existing order instead of creating a new one.", {
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
                    throw new Error("No active POS terminal session found. Please ask staff to open a POS session, then try again.")
                }

                if (error.response?.status === 500) {
                    const serverMessage = errorResponse?.message || "Internal server error"
                    logger.error("SERVER ERROR (500) - Backend crashed")

                    throw new Error(
                        `${serverMessage}\n\n` +
          "Backend debugging needed:\n" +
          "1. Check Laravel logs (storage/logs/laravel.log)\n" +
          "2. Enable APP_DEBUG=true in .env\n" +
          "3. Verify database schema and OrderService\n\n" +
          "Use Settings > Backend Diagnostics to test directly."
                    )
                }

                if (error instanceof Error && /missing body|Cannot mark order created from empty response/.test(error.message)) {
                    throw error
                }

                if (!error.response) {
                    throw new Error("Network error: Cannot reach backend server. Check if Laravel is running.")
                }

                throw error
            }
        } finally {
            state.isSubmitting = false
        }
    }

    async function submitRefill (payload?: any, options?: SubmitRefillOptions) {
        if (state.serverOrderId === null && getServerOrderId() === null) {
            throw new Error("No existing order found - cannot submit a refill.")
        }
        if (state.isSubmitting) {
            throw new Error("Order submission already in progress. Please wait.")
        }
        state.isSubmitting = true
        try {
            const invalidRefillItem = state.draft.find((i) => {
                const cat = (i.category ?? "").toLowerCase()
                const isMeat = /\b(?:meat|meats)\b/.test(cat)
                const isSide = /\b(?:side|sides)\b/.test(cat)
                return !isMeat && !isSide
            })
            if (invalidRefillItem) {
                throw new Error("Refill validation failed: only meats and sides are allowed")
            }

            const api = useApi()
            const sessionStore = useSessionStore()
            const terminalStatuses = new Set(["completed", "voided", "cancelled"])

            const currentOrderId = state.serverOrderId ?? sessionStore.getOrderId()

            if (!currentOrderId) {
                throw new Error("Cannot submit refill: missing order ID")
            }

            const localStatus = state.serverStatus.toLowerCase()
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
                state.serverStatus = liveStatus
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

            const refillPayload = buildRefillPayload()

            if (options?.clientSubmissionId) {
                refillPayload.client_submission_id = options.clientSubmissionId
            }

            logger.debug("[Refill] Submitting refill payload", {
                orderId: currentOrderId,
                refillPayload,
            })

            try {
                const REFILL_IDEM_KEY_STORAGE = "woosoo_refill_idem_key"
                let idempotencyKey = options?.idempotencyKey ??
                    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(REFILL_IDEM_KEY_STORAGE) : null)
                if (!idempotencyKey) {
                    idempotencyKey = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                    if (typeof sessionStorage !== "undefined") {
                        try { sessionStorage.setItem(REFILL_IDEM_KEY_STORAGE, idempotencyKey) } catch (e) { logger.debug("Failed to persist refill idempotency key", e) }
                    }
                }
                const resp = await api.post(API_ENDPOINTS.ORDER_REFILL(currentOrderId), payload ?? refillPayload, { headers: { ...(options?.headers ?? {}), "X-Idempotency-Key": idempotencyKey } })
                const responseData = extractResponseData(resp)
                if (!responseData) {
                    handleOrderError("Refill response missing body")
                    throw new Error("Refill response missing body")
                }
                appendRound("refill", state.draft, responseData)
                if (typeof sessionStorage !== "undefined") {
                    try { sessionStorage.removeItem("woosoo_refill_idem_key") } catch (e) { /* ignore */ }
                }
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
        const orderId = respData?.order?.order_id || respData?.order_id || respData?.order?.id || respData?.id

        if (orderId !== null && orderId !== undefined) {
            sessionStore.setOrderId(Number(orderId))
        }

        appendRound("initial", state.draft, respData)

        logger.info("Order marked created:", { orderId: sessionStore.orderId, orderNumber })
    }

    async function initializeFromSession () {
        const sessionStore = useSessionStore()
        const deviceStore = useDeviceStore()

        logger.debug("initializeFromSession called:", {
            sessionOrderId: sessionStore.getOrderId(),
            roundsCount: state.rounds.length,
            sessionIsActive: sessionStore.getIsActive()
        })

        if (!sessionStore.getOrderId()) {
            const hasStaleTransactionalState = (
                state.rounds.length > 0 ||
                !!state.package ||
                state.guestCount !== 2 ||
                state.draft.length > 0
            )

            const isActiveSession = sessionStore.getIsActive()
            const shouldSkipResetDueToActiveSession = isActiveSession && state.rounds.length === 0
            const shouldClearStaleState = hasStaleTransactionalState && !shouldSkipResetDueToActiveSession

            if (!deviceStore.getToken()) {
                if (shouldClearStaleState) {
                    logger.info("No token + no session.orderId: clearing stale transactional order state")
                    state.rounds = []
                    state.draft = []
                    state.mode = "initial"
                    state.serverOrderId = null
                    state.serverStatus = "building"
                    state.serverTotal = 0
                    state.package = null
                    state.guestCount = 2
                    state.error = null
                } else if (shouldSkipResetDueToActiveSession) {
                    logger.debug("Session active & no order placed yet: preserving transactional state (menu browsing)")
                }
                logger.debug("Skipping active-order lookup until device token is available")
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
                    const sessionStartedAt = (sessionStore.sessionStartedAt as unknown as number | null)
                    const orderCreatedAt = activeOrder?.created_at
                        ? new Date(activeOrder.created_at).getTime()
                        : null
                    if (sessionStartedAt && orderCreatedAt && orderCreatedAt < sessionStartedAt - 60_000) {
                        logger.info("Recovered order pre-dates current session - skipping to avoid cross-session contamination", {
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

                    state.serverOrderId = Number(activeOrderId)
                    state.serverStatus = activeStatus
                    logger.info("Recovered active order from active order endpoint:", {
                        orderId: activeOrderId,
                        status: activeStatus,
                    })
                    return
                }
            } catch (err) {
                logger.warn("Active order lookup failed; continuing local-state fallback", err)
            }

            if (shouldClearStaleState) {
                logger.info("No session.orderId found, resetting stale order state (with grace)")
                await new Promise(resolve => setTimeout(resolve, 1500))
                const refreshed = useSessionStore()
                if (!refreshed.getOrderId()) {
                    state.rounds = []
                    state.draft = []
                    state.mode = "initial"
                    state.serverOrderId = null
                    state.serverStatus = "building"
                    state.serverTotal = 0
                    state.package = null
                    state.guestCount = 2
                    state.error = null
                } else {
                    logger.debug("initializeFromSession: session.orderId appeared during grace, skipping clear")
                }
            } else if (shouldSkipResetDueToActiveSession && hasStaleTransactionalState) {
                logger.debug("Grace period skipped: session active & no order placed yet (preserving transactional state)")
            }
            return
        }

        if (sessionStore.getOrderId()) {
            state.serverOrderId = Number(sessionStore.getOrderId())
        }

        if (!deviceStore.getToken()) {
            logger.debug("Deferred canonical order fetch until device token is available")
            return
        }

        try {
            const api = useApi()
            const orderIdStr = String(sessionStore.getOrderId())
            if (orderIdStr && orderIdStr !== "null" && orderIdStr !== "undefined") {
                const resp = await api.get(`/api/device-order/by-order-id/${orderIdStr}`)
                const orderObj = resp.data?.order || resp.data
                if (orderObj) {
                    state.serverStatus = String(orderObj?.status ?? state.serverStatus)
                    state.serverOrderId = Number(orderObj?.order_id ?? orderObj?.id ?? state.serverOrderId)
                    logger.debug("Fetched order from server for session.orderId:", orderIdStr)
                } else {
                    logger.warn("No order payload returned; initialized minimal order_id:", sessionStore.getOrderId())
                }
            } else {
                logger.warn("session.orderId is invalid; initialized minimal order_id:", sessionStore.getOrderId())
            }
        } catch (err) {
            logger.warn("Failed to fetch order during initializeFromSession:", err)
        }
        logger.debug("Initialized order state from session.orderId:", sessionStore.getOrderId())
    }

    function updateOrderStatus (status: string) {
        state.serverStatus = status
    }

    function clearPackage () { state.package = null }

    // Computed helpers — TypeScript-safe accessors that unwrap ref types for component consumers
    const isRefillMode = computed(() => state.mode === "refill")
    // hasPlacedOrder is true when rounds exist OR when serverOrderId is recovered (e.g. via initializeFromSession)
    const hasPlacedOrder = computed(() => state.rounds.length > 0 || state.serverOrderId !== null)
    const allOrderedItems = computed(() => state.rounds.flatMap(r => r.items))

    function resetOrderState () {
        state.rounds = []
        state.draft = []
        state.mode = "initial"
        state.serverOrderId = null
        state.serverStatus = "building"
        state.serverTotal = 0
        state.package = null
        state.guestCount = 2
        state.error = null
    }

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
        clearPackage,
        getServerOrderId,
        handleOrderError,
        appendRound,
        resetOrderState,
        isRefillMode,
        hasPlacedOrder,
        allOrderedItems,
    }
}, {
    persist: {
        key: "order-store",
        storage: (typeof localStorage !== "undefined") ? localStorage : undefined,
        pick: ["package", "guestCount", "rounds", "draft", "serverOrderId", "serverStatus", "serverTotal", "mode"]
    }
})
