import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const nginxConfigPath = resolve(process.cwd(), "nginx/default.conf")

describe("public root CA endpoint config", () => {
    it("serves the root CA at /ca.crt without requiring application auth", () => {
        const source = readFileSync(nginxConfigPath, "utf8")

        expect(source).toContain("location = /ca.crt")
        expect(source).toContain("alias /etc/nginx/certs/ca.crt")
        expect(source).toContain("application/x-x509-ca-cert")
        expect(source).toContain("woosoo-ca.crt")
    })
})
