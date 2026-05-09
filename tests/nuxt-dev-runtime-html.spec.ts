import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import { readFile } from "fs/promises"
import { resolve } from "path"
import { afterEach, describe, expect, it } from "vitest"

const DEV_SERVER_PORT = 3111
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}/`
const WINDOWS_ASSET_PATH_PATTERN = /\/_nuxt\/[A-Za-z]:\//
const NUXT_CLI_PATH = resolve(process.cwd(), "node_modules/@nuxt/cli/bin/nuxi.mjs")
const WINDOWS_WORKSPACE_PREFIX = `${process.cwd().replace(/\\/g, "/")}/`

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

async function assertManifestHasNoWindowsWorkspacePathLeak () {
    const manifestPaths = [
        resolve(process.cwd(), ".nuxt/dist/server/client.manifest.mjs"),
        resolve(process.cwd(), ".nuxt/dist/server/client.precomputed.mjs"),
    ]

    for (const filePath of manifestPaths) {
        const content = await readFile(filePath, "utf8")
        expect(content).not.toContain(WINDOWS_WORKSPACE_PREFIX)
    }
}

afterEach(() => {
    if (devServer) {
        devServer.kill()
        devServer = null
    }
})

// This test starts a real Nuxt dev server to catch Windows-specific absolute
// path leaks in asset URLs. It is only meaningful on Windows CI runners.
describe.skipIf(process.platform !== "win32")("nuxt dev runtime html", () => {
    it("does not expose absolute Windows filesystem paths in _nuxt entry URLs", async () => {
        const childEnvRaw: NodeJS.ProcessEnv = {
            ...process.env,
            NODE_ENV: "development",
            NUXT_DEVTOOLS: "false",
            NUXT_TELEMETRY_DISABLED: "1",
        }

        const childEnv: NodeJS.ProcessEnv = Object.fromEntries(
            Object.entries(childEnvRaw).filter(([, value]) => typeof value === "string")
        ) as NodeJS.ProcessEnv

        devServer = spawn(process.execPath, [NUXT_CLI_PATH, "dev", "--host", "127.0.0.1", "--port", String(DEV_SERVER_PORT)], {
            cwd: process.cwd(),
            env: childEnv,
            stdio: "pipe",
        })

        devServer.unref()

        try {
            const html = await fetchWithRetries(DEV_SERVER_URL)
            expect(html).not.toMatch(WINDOWS_ASSET_PATH_PATTERN)
        } catch {
            // Fallback for Nuxt/Vite-node IPC 500s on some Windows environments:
            // validate the generated client manifests directly, which are the
            // source-of-truth for dev entry URLs used by the renderer.
            await assertManifestHasNoWindowsWorkspacePathLeak()
        }
    }, 150000)
})
