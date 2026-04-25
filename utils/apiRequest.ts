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

    if (baseEndsWithApi && /^\/api(\/|$)/i.test(url)) {
        return url.replace(/^\/api(?=\/|$)/i, "") || "/"
    }

    return url
}

export function isDeviceAuthPath (url: string | null | undefined): boolean {
    const value = String(url || "")
    return /^\/?(?:api\/)?devices\/(login|register|refresh)(?:$|\?|\/)/i.test(value)
}
