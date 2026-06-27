import { describe, expect, it } from "vitest"
import {
    ACTIVE_ORDER_RECOVERY_STATUSES,
    ACTIVE_ORDER_RECOVERY_STATUS_PARAM
} from "../stores/Order"

describe("active order recovery status filter", () => {
    it("matches Nexus scopeActiveOrder non-terminal set", () => {
        expect(ACTIVE_ORDER_RECOVERY_STATUSES).toEqual([
            "pending",
            "confirmed",
            "in_progress",
            "ready",
            "served",
        ])
    })

    it("serializes to comma-separated query param", () => {
        expect(ACTIVE_ORDER_RECOVERY_STATUS_PARAM).toBe(
            "pending,confirmed,in_progress,ready,served"
        )
    })
})
