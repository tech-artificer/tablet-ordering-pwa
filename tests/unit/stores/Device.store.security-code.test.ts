import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useDeviceStore } from "~/stores/Device"

const mockPost = vi.fn()
const mockGet = vi.fn()

// Mock the API composable
vi.mock("~/composables/useApi", () => ({
    useApi: () => ({
        post: mockPost,
        get: mockGet
    })
}))

describe("Device Store — Security Code Contract (Batch 3)", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockPost.mockReset()
        mockGet.mockReset()
    })

    describe("register() action with security_code field", () => {
        it("should emit security_code in payload instead of legacy code field", async () => {
            const store = useDeviceStore()

            const mockResponse = {
                data: {
                    device: { id: 1, name: "Test Device" },
                    token: "test-token",
                    table: { id: 4, name: "Table 4" },
                    code: "123456"
                }
            }

            mockPost.mockResolvedValueOnce(mockResponse)

            // Call register with security_code field
            await store.register({ security_code: "123456", name: "Test Device" } as any)

            // Verify API was called with security_code, not code
            expect(mockPost).toHaveBeenCalledWith(
                "/api/devices/register",
                expect.objectContaining({
                    security_code: "123456",
                    name: "Test Device"
                })
            )
        })

        it("should store security_code from response in state", async () => {
            const store = useDeviceStore()

            const mockResponse = {
                data: {
                    device: {
                        id: 1,
                        name: "Kiosk-1",
                        security_code: "654321",
                        security_code_generated_at: "2026-04-21T10:00:00Z"
                    },
                    token: "test-token",
                    table: { id: 4, name: "Table 4" },
                    code: "654321"
                }
            }

            mockPost.mockResolvedValueOnce(mockResponse)

            await store.register({ security_code: "654321", name: "Kiosk-1" } as any)

            // Verify device object includes security_code metadata
            expect(store.device).toEqual(
                expect.objectContaining({
                    id: 1,
                    name: "Kiosk-1",
                    security_code: "654321",
                    security_code_generated_at: "2026-04-21T10:00:00Z"
                })
            )
        })

        it("should handle 409 Conflict response for duplicate security_code", async () => {
            const store = useDeviceStore()

            const mockError = {
                response: {
                    status: 409,
                    data: {
                        message: "Security code already assigned to another device",
                        errors: { security_code: "This code is in use" }
                    }
                }
            }

            mockPost.mockRejectedValueOnce(mockError)

            await expect(
                store.register({ security_code: "111111", name: "Kiosk" } as any)
            ).rejects.toThrow()

            expect(store.errorMessage).toEqual(expect.objectContaining({ security_code: "This code is in use" }))
        })

        it("should handle 422 Validation error for invalid security_code format", async () => {
            const store = useDeviceStore()

            const mockError = {
                response: {
                    status: 422,
                    data: {
                        errors: {
                            security_code: ["The security code must be 6 digits"]
                        }
                    }
                }
            }

            mockPost.mockRejectedValueOnce(mockError)

            await expect(
                store.register({ security_code: "12345", name: "Kiosk" } as any) // 5 digits, invalid
            ).rejects.toThrow()

            expect(store.errorMessage).toBeTruthy()
        })
    })

    describe("backward compatibility with legacy code field", () => {
        it("should still accept code field as alias for one release", async () => {
            const store = useDeviceStore()

            const mockResponse = {
                data: {
                    device: { id: 1, name: "Test Device", code: "555555" },
                    token: "test-token",
                    table: { id: 5, name: "Table 5" }
                }
            }

            mockPost.mockResolvedValueOnce(mockResponse)

            // Call with legacy code field for backward compatibility
            await store.register({ code: "555555", name: "Test Device" } as any)

            expect(mockPost).toHaveBeenCalled()
            expect(store.device).toEqual(
                expect.objectContaining({
                    id: 1,
                    name: "Test Device"
                })
            )
        })
    })

    describe("settings display using device_uuid", () => {
        it("should store device_uuid from response for settings display", async () => {
            const store = useDeviceStore()

            const mockResponse = {
                data: {
                    device: {
                        id: 1,
                        name: "Kiosk-1",
                        device_uuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                        last_seen_at: "2026-04-21T10:00:00Z",
                        last_ip_address: "192.168.1.100",
                        type: "tablet"
                    },
                    token: "test-token",
                    table: { id: 6, name: "Table 6" }
                }
            }

            mockPost.mockResolvedValueOnce(mockResponse)

            await store.register({ security_code: "333333", name: "Kiosk-1" } as any)

            expect(store.device).toEqual(
                expect.objectContaining({
                    device_uuid: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                    type: "tablet",
                    last_seen_at: "2026-04-21T10:00:00Z",
                    last_ip_address: "192.168.1.100"
                })
            )
        })
    })
})
