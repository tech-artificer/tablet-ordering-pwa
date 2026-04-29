import { defineEventHandler, sendRedirect, setHeader } from "h3"

export default defineEventHandler((event) => {
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === "production" && event.node.req.headers["x-forwarded-proto"] !== "https") {
        const host = event.node.req.headers.host
        const url = `https://${host}${event.node.req.url}`
        return sendRedirect(event, url, 301)
    }

    // Derive allowed origins from runtime env so the CSP works across deployments.
    // The tablet PWA (port 4443) calls the Laravel API (port 443) cross-origin, so
    // connect-src must explicitly list the API origin and the WebSocket origin.
    const apiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || ""
    let apiOrigin = ""
    try {
        if (apiBaseUrl.startsWith("http")) {
            apiOrigin = new URL(apiBaseUrl).origin  // e.g. https://192.168.100.7
        }
    } catch { /* ignore malformed URLs */ }

    const reverbHost = process.env.NUXT_PUBLIC_REVERB_HOST || ""
    const reverbScheme = process.env.NUXT_PUBLIC_REVERB_SCHEME || "http"
    const wsScheme = reverbScheme === "https" ? "wss" : "ws"
    const wsOrigin = reverbHost ? `${wsScheme}://${reverbHost}` : ""

    const extraOrigins = [apiOrigin, wsOrigin].filter(Boolean).join(" ")
    const connectSrc = extraOrigins ? `'self' ${extraOrigins}` : "'self'"
    const imgSrc = apiOrigin ? `'self' data: ${apiOrigin}` : "'self' data:"

    // Set security headers
    setHeader(event, "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    setHeader(event, "Content-Security-Policy",
        `default-src 'self'; connect-src ${connectSrc}; img-src ${imgSrc}; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`)
    setHeader(event, "X-Content-Type-Options", "nosniff")
    setHeader(event, "X-Frame-Options", "SAMEORIGIN")
    setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin")
    setHeader(event, "Permissions-Policy", "geolocation=(), microphone=()")
})
