// types/offline-order.ts
// Types for the IndexedDB offline order outbox

export type OfflineOrderStatus =
  | "queued_local"
  | "queued_sw"
  | "syncing"
  | "synced"
  | "auth_error"
  | "failed"

export interface OfflineOrderRecord {
  /** UUID generated at submission time — also used as X-Idempotency-Key */
  id: string
  /** API endpoint path, e.g. /api/devices/create-order */
  endpoint: string
  /** HTTP method, always 'POST' for orders */
  method: string
  /** Full request body */
  payload: Record<string, unknown>
  /** Sanitized auth headers (Authorization, Accept, Content-Type) */
  headersSnapshot: Record<string, string>
  /** Epoch ms when the record was first queued */
  createdAt: number
  /** Epoch ms of the most recent status update */
  updatedAt: number
  /** Number of SW replay attempts so far */
  retryCount: number
  /** Current lifecycle status */
  status: OfflineOrderStatus
  /** Last error message — set on auth_error or failed */
  lastError: string | null
  /** Same as `id` — the idempotency key sent as X-Idempotency-Key header */
  idempotencyKey: string
}
