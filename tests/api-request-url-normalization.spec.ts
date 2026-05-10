import { describe, expect, it } from "vitest"
import { normalizeApiRequestUrl } from "../utils/apiRequest"

describe("normalizeApiRequestUrl", () => {
    it("keeps absolute-path /api endpoints unchanged when baseURL already includes /api", () => {
        const normalized = normalizeApiRequestUrl({
            baseURL: "https://192.168.100.7/api/",
            requestUrl: "/api/devices/login",
        })

        expect(normalized).toBe("/api/devices/login")
    })

    it("deduplicates relative api/ paths when baseURL already includes /api", () => {
        const normalized = normalizeApiRequestUrl({
            baseURL: "https://192.168.100.7/api/",
            requestUrl: "api/devices/login",
        })

        expect(normalized).toBe("devices/login")
    })

    it("keeps endpoint unchanged when baseURL does not end with /api", () => {
        const normalized = normalizeApiRequestUrl({
            baseURL: "https://192.168.100.7/",
            requestUrl: "/api/devices/login",
        })

        expect(normalized).toBe("/api/devices/login")
    })

    it("keeps absolute URLs unchanged", () => {
        const normalized = normalizeApiRequestUrl({
            baseURL: "https://192.168.100.7/api/",
            requestUrl: "https://third-party.test/health",
        })

        expect(normalized).toBe("https://third-party.test/health")
    })
})
