type NormalizeApiRequestUrlInput = {
    baseURL?: string | null
    requestUrl?: string | null
}

const ABSOLUTE_URL_REGEX = /^[a-z][a-z\d+\-.]*:\/\//i

function normalizePath (value: string): string {
    return value.replace(/\/+/g, "/").replace(/\/+$/, "") || "/"
}

function getBasePath (baseURL: string): string {
    const trimmed = String(baseURL || "").trim()
    if (!trimmed) {
        return ""
    }

    try {
        return normalizePath(new URL(trimmed).pathname)
    } catch {
        const withoutOrigin = trimmed.replace(/^[a-z][a-z\d+\-.]*:\/\/[^/]+/i, "")
        return normalizePath(withoutOrigin || "/")
    }
}

export function normalizeApiRequestUrl ({ baseURL, requestUrl }: NormalizeApiRequestUrlInput): string {
    const url = String(requestUrl || "")
    if (!url) {
        return url
    }

    if (ABSOLUTE_URL_REGEX.test(url) || url.startsWith("//")) {
        return url
    }

    const basePath = getBasePath(String(baseURL || ""))
    const baseEndsWithApi = /\/api$/i.test(basePath)

    if (baseEndsWithApi) {
        // Keep absolute-path API endpoints unchanged (/api/...) so they still
        // target the API namespace on the host origin.
        if (/^\/api(\/|$)/i.test(url)) {
            return url
        }

        // Only de-duplicate for relative "api/..." paths when baseURL already
        // includes /api (e.g. baseURL=https://host/api + requestUrl=api/menus).
        if (/^api(\/|$)/i.test(url)) {
            const deduped = url.replace(/^api\/?/i, "")
            return deduped || "/"
        }
    }

    return url
}

export function isDeviceAuthPath (url: string | null | undefined): boolean {
    const value = String(url || "")
    return /^\/?(?:api\/)?devices\/(login|register|refresh)(?:$|\?|\/)/i.test(value)
}
