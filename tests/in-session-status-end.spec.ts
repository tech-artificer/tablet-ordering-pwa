import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const inSessionPath = resolve(__dirname, "../pages/order/in-session.vue")

describe("in-session status watcher — POS Payment Sync spec", () => {
    const source = readFileSync(inSessionPath, "utf8")

    it("ends the session when status leaves the pending/confirmed live set", () => {
        // Watcher must trigger handleSessionEnd for any non-live status
        // (preparing, ready, completed, voided, cancelled) per POS Payment Sync spec.
        const watcherMatch = source.match(/watch\(orderStatus,\s*\(status\)\s*=>\s*\{([\s\S]*?)\n\}\)/)
        const watcherBody = watcherMatch?.[1] ?? ""

        expect(watcherBody).toBeTruthy()
        expect(watcherBody).toContain("handleSessionEnd()")
        expect(watcherBody).toMatch(/status\s*!==\s*"pending"\s*&&\s*status\s*!==\s*"confirmed"/)
    })

    it("does NOT special-case 'completed' alone (regression guard)", () => {
        // Older code only fired on `status === "completed"` and let preparing/ready
        // leave the tablet stuck. Reverting would break the POS handoff contract.
        const watcherMatch = source.match(/watch\(orderStatus,\s*\(status\)\s*=>\s*\{([\s\S]*?)\n\}\)/)
        const watcherBody = watcherMatch?.[1] ?? ""

        expect(watcherBody).not.toMatch(/if\s*\(\s*status\s*===\s*"completed"\s*\)/)
    })

    it("classifies pending and confirmed as the only live statuses", () => {
        // Direct surface of the live-status set; fail loudly if either is removed.
        const watcherMatch = source.match(/watch\(orderStatus,\s*\(status\)\s*=>\s*\{([\s\S]*?)\n\}\)/)
        const watcherBody = watcherMatch?.[1] ?? ""

        expect(watcherBody).toContain("\"pending\"")
        expect(watcherBody).toContain("\"confirmed\"")
    })
})
