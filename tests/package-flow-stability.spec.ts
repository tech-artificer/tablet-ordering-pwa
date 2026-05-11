import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

function src (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

// ---------------------------------------------------------------------------
// 1. Package selection page only fetches packages (not loadAllMenus)
// ---------------------------------------------------------------------------
describe("packageSelection.vue — loading behaviour", () => {
    it("uses fetchPackages() guarded by packages.length/isCacheStale instead of loadAllMenus", () => {
        const page = src("pages/order/packageSelection.vue")

        expect(page).toContain("menuStore.fetchPackages()")
        expect(page).toContain("menuStore.packages.length === 0 || menuStore.isCacheStale")
        expect(page).not.toMatch(/menuStore\.loadAllMenus\(true\)/)
    })

    it("does not call loadAllMenus inside proceedToMenuForPackage", () => {
        const page = src("pages/order/packageSelection.vue")

        const proceedFn = page.match(/const proceedToMenuForPackage = async[\s\S]*?\n\}/)
        const body = proceedFn?.[0] ?? ""
        expect(body).not.toContain("loadAllMenus")
    })
})

// ---------------------------------------------------------------------------
// 2. Package selection persists package, starts session, navigates with packageId
// ---------------------------------------------------------------------------
describe("packageSelection.vue — package selection flow", () => {
    it("sets package on orderStore before starting session", () => {
        const page = src("pages/order/packageSelection.vue")

        const proceedFn = page.match(/const proceedToMenuForPackage = async[\s\S]*?sessionStore\.start/)
        const body = proceedFn?.[0] ?? ""
        expect(body).toContain("orderStore.setPackage(packageData)")
        expect(body).toContain("sessionStore.start")
    })

    it("navigates to /menu with packageId in query", () => {
        const page = src("pages/order/packageSelection.vue")

        expect(page).toContain("path: \"/menu\"")
        expect(page).toContain("query: { packageId: packageData.id }")
    })

    it("starts session with preserveSelection: true", () => {
        const page = src("pages/order/packageSelection.vue")

        expect(page).toContain("sessionStore.start({ preserveSelection: true })")
    })
})

// ---------------------------------------------------------------------------
// 2a. Session start error handling in proceedToMenuForPackage
// ---------------------------------------------------------------------------
describe("packageSelection.vue — proceedToMenuForPackage error handling", () => {
    it("defines SessionStartResult type with three outcomes", () => {
        const page = src("pages/order/packageSelection.vue")

        expect(page).toContain("type SessionStartResult")
        expect(page).toContain("success: true")
        expect(page).toContain("reason: \"needs_registration\"")
        expect(page).toContain("reason: \"backend_error\"")
    })

    it("only navigates to /menu when sessionStartResult.success is true", () => {
        const page = src("pages/order/packageSelection.vue")

        // Find the navigation block and verify it's guarded by success check
        const proceedFn = page.match(/const proceedToMenuForPackage = async[\s\S]*?\n}$/)
        const body = proceedFn?.[0] ?? ""

        // Navigation should be guarded by success check
        expect(body).toContain("if (!sessionStartResult.success)")
        expect(body).toContain("return sessionStartResult")
    })

    it("returns needs_registration when device lacks token/table", () => {
        const page = src("pages/order/packageSelection.vue")

        // When sessionStore.start returns false and device needs registration
        expect(page).toContain("needsRegistration")
        expect(page).toContain("await nuxtApp.$router.push(\"/settings\")")
        expect(page).toContain("reason: \"needs_registration\"")
    })

    it("returns backend_error when device has credentials but session start failed", () => {
        const page = src("pages/order/packageSelection.vue")

        // When sessionStore.start returns false but device has credentials
        expect(page).toContain("Backend Session Failure")
        expect(page).toContain("reason: \"backend_error\"")
        expect(page).toContain("alert(\"Ordering is unavailable. Please call staff.\")")
    })

    it("returns backend_error when session start throws an exception", () => {
        const page = src("pages/order/packageSelection.vue")

        // When sessionStore.start throws, it should not navigate to /menu
        const catchBlock = page.match(/\} catch \(err: any\) \{[\s\S]*?return sessionStartResult/)
        const body = catchBlock?.[0] ?? ""

        expect(body).toContain("reason: \"backend_error\"")
        expect(body).toContain("alert(\"Ordering is unavailable. Please call staff.\")")
        expect(body).toContain("return sessionStartResult")
    })

    it("does NOT navigate to /menu when session start throws", () => {
        const page = src("pages/order/packageSelection.vue")

        // The navigation block should be AFTER the catch block and guarded
        const proceedFn = page.match(/const proceedToMenuForPackage = async[\s\S]*?\n}$/)
        const body = proceedFn?.[0] ?? ""

        // Navigation happens after session start, only on success
        const navIndex = body.indexOf("await nuxtApp.$router.push({\n            path: \"/menu\"")
        const catchReturnIndex = body.indexOf("return sessionStartResult", body.indexOf("} catch (err: any)"))

        // Navigation should come after the catch block's return
        expect(navIndex).toBeGreaterThan(catchReturnIndex)
    })
})

// ---------------------------------------------------------------------------
// 3. menu.vue cart drawer submit navigates to /order/review?packageId=ID
// ---------------------------------------------------------------------------
describe("menu.vue — cart drawer submit-order handler", () => {
    it("includes packageId in route query when navigating to /order/review", () => {
        const page = src("pages/menu.vue")

        const submitHandler = page.match(/@submit-order="[^"]*"/)
        const handler = submitHandler?.[0] ?? ""
        expect(handler).toContain("/order/review")
        expect(handler).toContain("packageId")
        expect(handler).toContain("selectedPackageId")
    })

    it("uses route object form (path + query) not bare string for review navigation", () => {
        const page = src("pages/menu.vue")

        const submitHandler = page.match(/@submit-order="[^"]*"/)
        const handler = submitHandler?.[0] ?? ""
        expect(handler).toContain("path: '/order/review'")
        expect(handler).toContain("query:")
    })
})

// ---------------------------------------------------------------------------
// 4. order-guard.ts /order/review accepts packageId from query
// ---------------------------------------------------------------------------
describe("order-guard.ts — /order/review guard", () => {
    it("reads packageId from route query for the review route", () => {
        const guard = src("middleware/order-guard.ts")

        expect(guard).toContain("to.query?.packageId")
        expect(guard).toContain("packageIdFromQuery")
    })

    it("allows access when packageId is present in query even without orderStore.package", () => {
        const guard = src("middleware/order-guard.ts")

        const hasPackageExpr = guard.match(/const hasPackage = !!\(packageIdFromQuery \|\| packageIdFromStore\)/)
        expect(hasPackageExpr).not.toBeNull()
    })

    it("blocks /order/review when neither query packageId nor store package nor order reference exist", () => {
        const guard = src("middleware/order-guard.ts")

        expect(guard).toContain("!hasPackage && !hasOrderReference")
        expect(guard).toContain("navigateTo(\"/order/packageSelection\")")
    })
})

// ---------------------------------------------------------------------------
// 5. Session start with preserveSelection does not discard orderStore.package
// ---------------------------------------------------------------------------
describe("Session.ts — start() with preserveSelection preserves package", () => {
    it("saves packageId before reset and restores fresh package after reset", () => {
        const session = src("stores/Session.ts")

        expect(session).toContain("preservedPackageId")
        expect(session).toContain("menuStore.packages.find(p => p.id === preservedPackageId)")
        expect(session).toContain("orderStore.setPackage(freshPackage)")
    })

    it("only resets when session is not already active", () => {
        const session = src("stores/Session.ts")

        expect(session).toContain("if (!state.isActive)")
        const resetBlock = session.match(/if \(!state\.isActive\) \{[\s\S]*?state\.isActive = true/)
        const block = resetBlock?.[0] ?? ""
        expect(block).toContain("preserveSelection")
        expect(block).toContain("orderStore.resetTransactionalState()")
    })
})

// ---------------------------------------------------------------------------
// 6. OrderingStep3ReviewSubmit renders cart items on review page
// ---------------------------------------------------------------------------
describe("OrderingStep3ReviewSubmit — cart items visible on review", () => {
    it("renders cart item names from activeCart", async () => {
        const { mount } = await import("@vue/test-utils")
        const { useOrderStore } = await import("../stores/Order")
        const OrderingStep3ReviewSubmit = (await import("../components/order/OrderingStep3ReviewSubmit.vue")).default

        const pinia = createPinia()
        setActivePinia(pinia)

        const order = useOrderStore()
        order.setHasPlacedOrder(false)
        order.setIsRefillMode(false)
        order.setCartItems([
            { id: 501, name: "Wagyu Beef", quantity: 3, category: "meats", price: 0 } as any,
        ])

        const wrapper = mount(OrderingStep3ReviewSubmit)
        expect(wrapper.text()).toContain("Wagyu Beef")
        expect(wrapper.text()).toContain("×3")
    })

    it("renders refill items when in refill mode", async () => {
        const { mount } = await import("@vue/test-utils")
        const { useOrderStore } = await import("../stores/Order")
        const OrderingStep3ReviewSubmit = (await import("../components/order/OrderingStep3ReviewSubmit.vue")).default

        const pinia = createPinia()
        setActivePinia(pinia)

        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(true)
        order.setRefillItems([
            { id: 601, name: "Pork Belly Refill", quantity: 2, category: "meats", price: 0 } as any,
        ])

        const wrapper = mount(OrderingStep3ReviewSubmit)
        expect(wrapper.text()).toContain("Pork Belly Refill")
        expect(wrapper.text()).toContain("×2")
    })
})
