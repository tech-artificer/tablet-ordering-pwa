import { describe, it, expect } from "vitest"
import {
    ACTIVE_ORDER_RECOVERY_STATUSES,
    ACTIVE_ORDER_RECOVERY_STATUS_PARAM
} from "../stores/Order"

describe("active-order recovery status filter (TAB-CASE-011)", () => {
    it("includes all Nexus non-terminal kitchen statuses", () => {
        expect(ACTIVE_ORDER_RECOVERY_STATUSES).toEqual([
            "pending",
            "confirmed",
            "in_progress",
            "ready",
            "served"
        ])
    })

    it("serializes the API status query param with in_progress and served", () => {
        expect(ACTIVE_ORDER_RECOVERY_STATUS_PARAM).toBe(
            "pending,confirmed,in_progress,ready,served"
        )
        expect(ACTIVE_ORDER_RECOVERY_STATUS_PARAM).toContain("in_progress")
        expect(ACTIVE_ORDER_RECOVERY_STATUS_PARAM).toContain("served")
        expect(ACTIVE_ORDER_RECOVERY_STATUS_PARAM).not.toBe("pending,confirmed,ready")
    })
})
