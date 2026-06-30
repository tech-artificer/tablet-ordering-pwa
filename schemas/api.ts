import { z } from "zod"
import { logger } from "~/utils/logger"

// ─── Shared primitives ────────────────────────────────────────────────────────

const coercedNumber = z.preprocess(
    (value) => {
        if (value === null || value === undefined) { return value }
        if (typeof value === "string" && value.trim() === "") { return Number.NaN }
        return value
    },
    z.coerce.number().refine(Number.isFinite, {
        error: "Expected a finite number",
    })
)
const coercedString = z.union([z.string(), z.number(), z.null()]).transform(v => (v == null ? "" : String(v)))

// ─── Order schemas ────────────────────────────────────────────────────────────

const OrderItemSchema = z.object({
    id: coercedNumber,
    name: coercedString,
    quantity: coercedNumber,
    price: coercedString,
    is_refill: z.boolean().optional().default(false),
})

export const OrderCreateResponseSchema = z.object({
    success: z.boolean().optional(),
    order: z.object({
        id: coercedNumber.optional(),
        order_id: coercedNumber.optional(),
        order_number: z.string().optional(),
        status: z.string().optional(),
        total: coercedString.optional(),
        total_amount: coercedNumber.optional(),
        created_at: z.string().optional(),
        items: z.array(OrderItemSchema).optional(),
    }).passthrough().optional(),
    order_id: coercedNumber.optional(),
    order_number: z.string().optional(),
    total_amount: coercedNumber.optional(),
}).passthrough()

export const OrderStatusResponseSchema = z.object({
    order: z.object({
        id: coercedNumber.optional(),
        order_id: coercedNumber.optional(),
        status: z.string(),
        order_number: z.string().optional(),
    }).passthrough().optional(),
    data: z.object({
        id: coercedNumber.optional(),
        order_id: coercedNumber.optional(),
        status: z.string(),
    }).passthrough().optional(),
    status: z.string().optional(),
    id: coercedNumber.optional(),
}).passthrough().refine(
    value => Boolean(
        value.order?.status ||
        value.data?.status ||
        value.status
    ),
    { message: "Expected order.status, data.status, or top-level status" }
)

// ─── Device schemas ───────────────────────────────────────────────────────────

export const DeviceAuthResponseSchema = z.object({
    token: z.string().min(1),
    device: z.object({
        id: coercedNumber,
        name: z.string().optional(),
    }).passthrough().optional(),
    table: z.object({
        id: coercedNumber.optional(),
        name: z.string().optional(),
    }).passthrough().nullable().optional(),
    expires_at: z.union([z.number(), z.string()]).optional(),
    broadcasting: z.object({
        key: z.string(),
        host: z.string(),
        port: coercedNumber.optional(),
        scheme: z.string().optional(),
        auth_endpoint: z.string().optional(),
    }).passthrough().optional(),
}).passthrough()

// ─── Session schemas ──────────────────────────────────────────────────────────

export const SessionResponseSchema = z.object({
    session_id: coercedNumber.optional(),
    id: coercedNumber.optional(),
    table_id: coercedNumber.optional(),
    order_id: coercedNumber.optional(),
}).passthrough()

// ─── Menu schemas ─────────────────────────────────────────────────────────────

export const MenuItemSchema = z.object({
    id: coercedNumber,
    name: z.string(),
    price: coercedNumber.optional(),
    category: z.string().optional(),
    is_available: z.boolean().optional(),
}).passthrough()

export const PackageSchema = z.object({
    id: coercedNumber,
    name: z.string(),
    price: coercedNumber.optional(),
    is_popular: z.boolean().optional(),
}).passthrough()

// ─── Safe validate helper ─────────────────────────────────────────────────────

type SafeValidateResult<T> =
    | { success: true; data: T }
    | { success: false; data: null; error: z.ZodError }

/**
 * Validates `data` against `schema` without throwing.
 * - In dev/test: logs a structured warning so regressions surface early.
 * - In production: degrades gracefully — callers keep their existing `??` fallback chain.
 *
 * @param schema Zod schema to validate against
 * @param data   Raw API response data
 * @param context Label for log messages (e.g. "DeviceAuth", "appendRound")
 */
export function safeValidate<T> (
    schema: z.ZodType<T>,
    data: unknown,
    context: string
): SafeValidateResult<T> {
    const result = schema.safeParse(data)
    if (!result.success) {
        const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
        const summary = result.error.issues
            .slice(0, 3)
            .map(i => `${i.path.join(".")}: ${i.message}`)
            .join(" | ")
        logger.warn(`[Schema:${context}] Validation warning — ${summary}`, {
            issues: result.error.issues.length,
        })
        if (isDev) {
            // Surface in dev so the team catches contract drift before production
            console.warn(`[Schema:${context}] Full issues:`, result.error.issues)
        }
        return { success: false, data: null, error: result.error }
    }
    return { success: true, data: result.data }
}
