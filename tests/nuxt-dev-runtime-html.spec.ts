import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import { resolve } from "path"
import { afterEach, describe, expect, it } from "vitest"

const DEV_SERVER_PORT = 3111
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}/`
const WINDOWS_ASSET_PATH_PATTERN = /\/_nuxt\/[A-Za-z]:\//
const NUXT_CLI_PATH = resolve(process.cwd(), "node_modules/nuxt/bin/nuxt.mjs")

let devServer: ChildProcessWithoutNullStreams | null = null

async function fetchWithRetries (url: string, attempts = 30): Promise<string> {
    let lastError: unknown

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Unexpected status ${response.status}`)
            }

            return await response.text()
        } catch (error) {
            lastError = error
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to fetch Nuxt dev HTML")
}

afterEach(() => {
    if (devServer) {
        devServer.kill()
        devServer = null
    }
})

describe("nuxt dev runtime html", () => {
    it("does not expose absolute Windows filesystem paths in _nuxt entry URLs", async () => {
        devServer = spawn(process.execPath, [NUXT_CLI_PATH, "dev", "--host", "127.0.0.1", "--port", String(DEV_SERVER_PORT)], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: "development",
                NUXT_DEVTOOLS: "false",
            },
            stdio: "pipe",
        })

        devServer.unref()

        const html = await fetchWithRetries(DEV_SERVER_URL)

        expect(html).not.toMatch(WINDOWS_ASSET_PATH_PATTERN)
    }, 150000)
})
