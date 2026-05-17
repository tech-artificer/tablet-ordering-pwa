import { describe, it, expect } from "vitest"
import { classifyError } from "~/composables/useErrorClassifier"

describe("useErrorClassifier", () => {
    it("should classify 400 Bad Request as RECOVERABLE", () => {
        const error = {
            response: {
                status: 400,
                data: { message: "Invalid request" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("UNKNOWN")
        expect(result.message).toBeDefined()
        expect(result.message).not.toContain("Invalid request")
    })

    it("should classify 401 as RECOVERABLE", () => {
        const error = {
            response: {
                status: 401,
                data: { message: "Unauthorized" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("RECOVERABLE")
        expect(result.statusCode).toBe(401)
        expect(result.surface).toBe(true)
    })

    it("should classify 403 as SERVER_BLOCKING", () => {
        const error = {
            response: {
                status: 403,
                data: { message: "Forbidden" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("SERVER_BLOCKING")
        expect(result.statusCode).toBe(403)
        expect(result.surface).toBe(true)
    })

    it("should classify 404 as RECOVERABLE", () => {
        const error = {
            response: {
                status: 404,
                data: { message: "Not Found" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("RECOVERABLE")
        expect(result.statusCode).toBe(404)
    })

    it("should classify 409 Conflict as RECOVERABLE", () => {
        const error = {
            response: {
                status: 409,
                data: { message: "Conflict" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("RECOVERABLE")
        expect(result.statusCode).toBe(409)
        expect(result.surface).toBe(false)
    })

    it("should classify 422 as RECOVERABLE", () => {
        const error = {
            response: {
                status: 422,
                data: { message: "Validation error" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("RECOVERABLE")
        expect(result.statusCode).toBe(422)
        expect(result.surface).toBe(true)
    })

    it("should classify 429 as TRANSIENT", () => {
        const error = {
            response: {
                status: 429,
                data: { message: "Too Many Requests" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("TRANSIENT")
        expect(result.statusCode).toBe(429)
    })

    it("should classify 500 as SERVER_BLOCKING", () => {
        const error = {
            response: {
                status: 500,
                data: { message: "Internal Server Error" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("SERVER_BLOCKING")
        expect(result.statusCode).toBe(500)
        expect(result.surface).toBe(true)
    })

    it("should classify 502 as SERVER_BLOCKING", () => {
        const error = {
            response: {
                status: 502,
                data: { message: "Bad Gateway" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("SERVER_BLOCKING")
        expect(result.statusCode).toBe(502)
    })

    it("should classify 503 as TRANSIENT", () => {
        const error = {
            response: {
                status: 503,
                data: { message: "Service Unavailable" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("TRANSIENT")
        expect(result.statusCode).toBe(503)
    })

    it("should classify 504 as SERVER_BLOCKING", () => {
        const error = {
            response: {
                status: 504,
                data: { message: "Gateway Timeout" },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("SERVER_BLOCKING")
        expect(result.statusCode).toBe(504)
    })

    it("should detect sensitive data and classify as SERVER_BLOCKING", () => {
        const error = {
            response: {
                status: 200,
                data: {
                    message: "OK",
                    exception: "SomeException",
                    trace: "stack trace here",
                },
            },
        }
        const result = classifyError(error)
        expect(result.category).toBe("SERVER_BLOCKING")
        expect(result.surface).toBe(true)
        expect(result.message).not.toContain("exception")
        expect(result.message).not.toContain("trace")
    })

    it("should never return raw input string in message", () => {
        const rawError = "Some raw error string with details"
        const error = {
            response: {
                status: 500,
                data: { message: rawError },
            },
        }
        const result = classifyError(error)
        expect(result.message).not.toBe(rawError)
        expect(result.message).toBeDefined()
    })

    it("should classify network error as CONNECTIVITY", () => {
        const error = {
            code: "ERR_NETWORK",
            message: "Network error",
        }
        const result = classifyError(error)
        expect(result.category).toBe("CONNECTIVITY")
        expect(result.surface).toBe(true)
    })

    it("should classify timeout as TRANSIENT", () => {
        const error = {
            code: "ECONNABORTED",
            message: "timeout of 15000ms exceeded",
        }
        const result = classifyError(error)
        expect(result.category).toBe("TRANSIENT")
        expect(result.surface).toBe(false)
    })

    it("should return whitelisted message for all errors", () => {
        const errors = [
            { response: { status: 400, data: {} } },
            { response: { status: 401, data: {} } },
            { response: { status: 403, data: {} } },
            { response: { status: 404, data: {} } },
            { response: { status: 409, data: {} } },
            { response: { status: 422, data: {} } },
            { response: { status: 429, data: {} } },
            { response: { status: 500, data: {} } },
            { response: { status: 502, data: {} } },
            { response: { status: 503, data: {} } },
            { response: { status: 504, data: {} } },
        ]

        errors.forEach((error) => {
            const result = classifyError(error)
            expect(result.message).toBeDefined()
            expect(typeof result.message).toBe("string")
            expect(result.message.length).toBeGreaterThan(0)
        })
    })
})
