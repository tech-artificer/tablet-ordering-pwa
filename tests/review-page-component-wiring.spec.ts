import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

describe("order review page component wiring", () => {
    it("directly imports the review submit component instead of relying on Nuxt global registration", () => {
        const page = readProjectFile("pages/order/review.vue")

        expect(page).toContain("import OrderingStep3ReviewSubmit from \"~/components/order/OrderingStep3ReviewSubmit.vue\"")
        expect(page).toContain("<OrderingStep3ReviewSubmit @order-submitted=\"handleOrderSubmitted\" />")
        expect(page).not.toContain("<OrderOrderingStep3ReviewSubmit")
    })

    it("does not ship temporary review diagnostics to kiosk tablets", () => {
        const page = readProjectFile("pages/order/review.vue")
        const component = readProjectFile("components/order/OrderingStep3ReviewSubmit.vue")

        expect(page).not.toContain("TEST: If you see this")
        expect(component).not.toContain("DEBUG PANEL")
        expect(component).not.toContain("Debug State")
    })
})
