// tests/offline-outbox.spec.ts
// Unit tests for the IndexedDB offline order outbox helpers.
// Uses fake-indexeddb so no real browser DB is required.

import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import Dexie from "dexie"
import type { OfflineOrderRecord } from "~/types/offline-order"

// ---------------------------------------------------------------------------
// Re-create a minimal outbox DB for each test (isolated instances)
// ---------------------------------------------------------------------------

function makeOutboxDb () {
    // Each call creates a uniquely-named DB so tests don't bleed into each other
    const dbName = `wooserve_offline_test_${Math.random().toString(36).slice(2)}`
    const db = new Dexie(dbName)
    db.version(1).stores({ orders: "id, status, createdAt" })

    const orders = (db as any).orders as Dexie.Table<OfflineOrderRecord, string>

    return {
        async enqueue (rec: OfflineOrderRecord) {
            await orders.put(rec)
        },
        async markStatus (
            id: string,
            status: OfflineOrderRecord["status"],
            lastError: string | null = null
        ) {
            await orders.update(id, { status, lastError, updatedAt: Date.now() })
        },
        async remove (id: string) {
            await orders.delete(id)
        },
        async countPending () {
            return orders.where("status").anyOf("queued_local", "queued_sw", "syncing").count()
        },
        async listPending () {
            return orders.where("status").anyOf("queued_local", "queued_sw", "syncing").toArray()
        },
        async findById (id: string) {
            return orders.get(id)
        },
    }
}

function makeRecord (overrides: Partial<OfflineOrderRecord> = {}): OfflineOrderRecord {
    const id = `test-${Math.random().toString(36).slice(2)}`
    return {
        id,
        endpoint: "/api/devices/create-order",
        method: "POST",
        payload: { guest_count: 2, items: [] },
        headersSnapshot: { Authorization: "Bearer token123", Accept: "application/json", "Content-Type": "application/json" },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        retryCount: 0,
        status: "queued_local",
        lastError: null,
        idempotencyKey: id,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------

describe("offline-outbox", () => {
    let outbox: ReturnType<typeof makeOutboxDb>

    beforeEach(() => {
        outbox = makeOutboxDb()
    })

    it("enqueue persists a row", async () => {
        const rec = makeRecord()
        await outbox.enqueue(rec)
        const found = await outbox.findById(rec.id)
        expect(found).toBeDefined()
        expect(found!.id).toBe(rec.id)
        expect(found!.status).toBe("queued_local")
    })

    it("markStatus updates row status", async () => {
        const rec = makeRecord()
        await outbox.enqueue(rec)

        await outbox.markStatus(rec.id, "syncing")
        const updated = await outbox.findById(rec.id)
        expect(updated!.status).toBe("syncing")
        expect(updated!.lastError).toBeNull()
    })

    it("markStatus records lastError", async () => {
        const rec = makeRecord()
        await outbox.enqueue(rec)

        await outbox.markStatus(rec.id, "failed", "Network error")
        const updated = await outbox.findById(rec.id)
        expect(updated!.status).toBe("failed")
        expect(updated!.lastError).toBe("Network error")
    })

    it("remove deletes the row", async () => {
        const rec = makeRecord()
        await outbox.enqueue(rec)
        await outbox.remove(rec.id)
        const found = await outbox.findById(rec.id)
        expect(found).toBeUndefined()
    })

    it("countPending counts only pending-family statuses", async () => {
        await outbox.enqueue(makeRecord({ status: "queued_local" }))
        await outbox.enqueue(makeRecord({ status: "queued_sw" }))
        await outbox.enqueue(makeRecord({ status: "syncing" }))
        await outbox.enqueue(makeRecord({ status: "synced" }))
        await outbox.enqueue(makeRecord({ status: "failed" }))

        const count = await outbox.countPending()
        expect(count).toBe(3)
    })

    it("listPending returns only pending-family rows", async () => {
        const a = makeRecord({ status: "queued_local" })
        const b = makeRecord({ status: "synced" })
        await outbox.enqueue(a)
        await outbox.enqueue(b)

        const pending = await outbox.listPending()
        expect(pending).toHaveLength(1)
        expect(pending[0].id).toBe(a.id)
    })
})
