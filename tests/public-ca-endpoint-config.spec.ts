import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const nginxConfigPath = fileURLToPath(new URL("../nginx/default.conf", import.meta.url))

describe("public root CA endpoint config", () => {
    it("serves the root CA at /ca.crt without requiring application auth", () => {
        const source = readFileSync(nginxConfigPath, "utf8")

        expect(source).toContain("location = /ca.crt")
        expect(source).toContain("alias /etc/nginx/certs/ca.crt")
        expect(source).toContain("application/x-x509-ca-cert")
        expect(source).toContain("woosoo-ca.crt")
    })
})
