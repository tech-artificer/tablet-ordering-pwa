// plugins/offline-outbox.client.ts
// Provides an IndexedDB-backed outbox for offline order submissions.
// Initialized once on the client and injected as $offlineOutbox into the Nuxt app.

import { defineNuxtPlugin } from "#app"
import Dexie, { type Table } from "dexie"
import type { OfflineOrderRecord, OfflineOrderStatus } from "~/types/offline-order"

class OutboxDatabase extends Dexie {
    orders!: Table<OfflineOrderRecord, string>

    constructor () {
        super("wooserve_offline")
        this.version(1).stores({
            // Index on id (primary key), status, and createdAt
            orders: "id, status, createdAt",
        })
    }
}

const db = new OutboxDatabase()

export interface OfflineOutbox {
  enqueue(record: OfflineOrderRecord): Promise<void>
  markStatus(id: string, status: OfflineOrderStatus, lastError?: string | null): Promise<void>
  remove(id: string): Promise<void>
  countPending(): Promise<number>
  listPending(): Promise<OfflineOrderRecord[]>
}

const outbox: OfflineOutbox = {
    async enqueue (record: OfflineOrderRecord): Promise<void> {
        await db.orders.put(record)
    },

    async markStatus (
        id: string,
        status: OfflineOrderStatus,
        lastError: string | null = null
    ): Promise<void> {
        await db.orders.update(id, { status, lastError, updatedAt: Date.now() })
    },

    async remove (id: string): Promise<void> {
        await db.orders.delete(id)
    },

    async countPending (): Promise<number> {
        return db.orders
            .where("status")
            .anyOf("queued_local", "queued_sw", "syncing")
            .count()
    },

    async listPending (): Promise<OfflineOrderRecord[]> {
        return db.orders
            .where("status")
            .anyOf("queued_local", "queued_sw", "syncing")
            .toArray()
    },
}

export default defineNuxtPlugin(() => {
    return {
        provide: {
            offlineOutbox: outbox,
        },
    }
})
