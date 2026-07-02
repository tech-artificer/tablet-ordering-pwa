/**
 * Rewrites backend-absolute media URLs to use the current window origin.
 *
 * The nexus backend stamps img_url values with its own APP_URL host/port (e.g. :443).
 * The tablet PWA runs on a different port (:4443). Passing those raw URLs to <NuxtImg>
 * creates cross-port image requests whose success depends on nginx location blocks
 * staying in sync with backend config — a fragile assumption that has burned us before.
 *
 * Rules:
 *   - Same-hostname absolute URLs → protocol + port replaced with window.location values
 *   - Different-hostname URLs (CDN, external) → returned unchanged
 *   - Relative paths → returned unchanged (already origin-relative)
 *   - Null / undefined → null
 */
export function resolveMediaUrl (url: string | null | undefined): string | null {
    if (!url) { return null }
    if (typeof window === "undefined") { return url }
    try {
        const parsed = new URL(url)
        if (parsed.hostname === window.location.hostname) {
            parsed.protocol = window.location.protocol
            parsed.port = window.location.port
        }
        return parsed.toString()
    } catch {
        return url
    }
}
