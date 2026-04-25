import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import DeviceRegistration from "~/components/Auth/DeviceRegistration.vue"

const mockReplace = vi.fn()
const mockRegister = vi.fn()
const mockRefresh = vi.fn()
const mockStartTablePolling = vi.fn()
const mockStopTablePolling = vi.fn()

const mockDeviceStore: any = {
    isLoading: false,
    errorMessage: null,
    waitingForTable: false,
    isPollingForTable: false,
    token: null,
    table: null,
    device: null,
    register: mockRegister,
    refresh: mockRefresh,
    startTablePolling: mockStartTablePolling,
    stopTablePolling: mockStopTablePolling,
}

vi.mock("~/stores/Device", () => ({
    useDeviceStore: () => mockDeviceStore,
}))

vi.mock("~/utils/logger", () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

vi.mock("~/utils/getLocalIp", () => ({
    getLocalIp: vi.fn().mockResolvedValue("192.168.1.100"),
}))

function mountRegistration (inline = false) {
    return mount(DeviceRegistration, {
        props: { inline },
        global: {
            stubs: {
                WoosooLogo: true,
                "el-form": { template: "<form><slot /></form>" },
                "el-form-item": { template: "<div><slot /></div>" },
                "el-input": {
                    props: ["modelValue", "placeholder", "maxlength", "type", "inputmode", "disabled"],
                    emits: ["update:modelValue"],
                    template:
            "<input :value=\"modelValue\" :placeholder=\"placeholder\" :maxlength=\"maxlength\" :type=\"type\" :inputmode=\"inputmode\" :disabled=\"disabled\" @input=\"$emit('update:modelValue', $event.target.value)\" />",
                },
                "el-alert": true,
            },
        },
    })
}

describe("DeviceRegistration Component — Security Code Contract (Batch 3)", () => {
    beforeEach(() => {
        mockReplace.mockReset()
        mockRegister.mockReset()
        mockRefresh.mockReset()
        mockStartTablePolling.mockReset()
        mockStopTablePolling.mockReset()

        mockDeviceStore.isLoading = false
        mockDeviceStore.errorMessage = null
        mockDeviceStore.waitingForTable = false
        mockDeviceStore.isPollingForTable = false
        mockDeviceStore.token = null
        mockDeviceStore.table = null
        mockDeviceStore.device = null

        vi.stubGlobal("useRouter", () => ({
            currentRoute: { value: { path: "/register" } },
            replace: mockReplace,
        }))
    })

    it("renders security code input with numeric 6-digit constraints", () => {
        const wrapper = mountRegistration(false)
        const securityInput = wrapper.find("input[placeholder=\"e.g. 123456\"]")

        expect(securityInput.exists()).toBe(true)
        expect(securityInput.attributes("maxlength")).toBe("6")
        expect(securityInput.attributes("inputmode")).toBe("numeric")
    })

    it("blocks submission when security code is invalid", async () => {
        const wrapper = mountRegistration(false)
        await wrapper.find("input[placeholder=\"e.g. Table 4 - Kiosk\"]").setValue("Kiosk-1")
        await wrapper.find("input[placeholder=\"e.g. 123456\"]").setValue("12345")
        const submitButton = wrapper.find("button")

        expect(submitButton.attributes("disabled")).toBeDefined()
        expect(mockRegister).not.toHaveBeenCalled()
    })

    it("emits security_code payload on successful submission", async () => {
        mockRegister.mockResolvedValueOnce(undefined)

        const wrapper = mountRegistration(false)
        await wrapper.find("input[placeholder=\"e.g. Table 4 - Kiosk\"]").setValue("Kiosk-1")
        await wrapper.find("input[placeholder=\"e.g. 123456\"]").setValue("654321")
        await wrapper.find("button").trigger("click")

        expect(mockRegister).toHaveBeenCalledWith(
            expect.objectContaining({
                security_code: "654321",
                name: "Kiosk-1",
            })
        )
    })

    it("supports inline registration with security_code only", async () => {
        mockRegister.mockResolvedValueOnce(undefined)

        const wrapper = mountRegistration(true)
        await wrapper.find("input[placeholder=\"Enter security code\"]").setValue("123456")
        await wrapper.find("button").trigger("click")

        expect(mockRegister).toHaveBeenCalledWith(
            expect.objectContaining({
                security_code: "123456",
                name: "",
            })
        )
    })
})
