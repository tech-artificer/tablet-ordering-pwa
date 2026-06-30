export { ACTIVE_ORDER_RECOVERY_STATUS_PARAM } from "../../../stores/Order"

export const E2E_DEVICE_STORE = {
    token: "e2e-playwright-device-token",
    table: {
        id: 1,
        name: "T1",
        status: "active",
        is_available: true,
        is_locked: false,
    },
    device: { id: 1, name: "E2E Tablet" },
    expiration: null,
    broadcastConfig: null,
    kioskUnlocked: true,
}

export const E2E_SESSION_STORE_EMPTY = {
    sessionId: null,
    orderId: null,
    isActive: false,
    sessionStartedAt: null,
    sessionEndsAt: null,
}

export function seedPiniaPersistenceScript (): string {
    return `
        localStorage.clear();
        window.__APP_CONFIG__ = { apiBaseUrl: "/api" };
        localStorage.setItem("order-store", JSON.stringify({
            package: null,
            guestCount: 2,
            rounds: [],
            draft: [],
            serverOrderId: null,
            serverStatus: "building",
            serverTotal: 0,
            mode: "initial"
        }));
        localStorage.setItem("device-store", ${JSON.stringify(JSON.stringify(E2E_DEVICE_STORE))});
        localStorage.setItem("session-store", ${JSON.stringify(JSON.stringify(E2E_SESSION_STORE_EMPTY))});
    `
}
