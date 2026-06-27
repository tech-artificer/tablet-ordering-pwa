# tab-case-013 — Settings Device IP Display

## Status

Resolved. Frontend-only fix. No backend change.

## Scope

- `utils/getLocalIp.ts`
- `pages/settings.vue`
- `docs/LESSONS.md` (new)
- `docs/cases/tab-case-013-settings-device-ip-display.md` (this file)

## Symptom

The Settings page "IP Address" field shows `172.21.112.1` (the WSL2 NAT gateway) for every tablet instead of each device's real LAN IP. All tablets appear identical in the Settings IP display during local development.

## Root Cause

Two compounding bugs:

**1. `getLocalIp.ts` — `else` branch resolves immediately (contrary to comment)**

The `onicecandidate` handler intended to buffer non-private IPs and only resolve immediately on private LAN IPs. The comment said "don't resolve immediately" but both branches called `handleIp(ip)` — which resolves the promise. A public/reflexive STUN candidate emitted before a private LAN candidate would win incorrectly.

**2. `settings.vue` — wrong priority order in `getLocalIpAddress` and `displayIpAddress`**

`getLocalIpAddress` tried `last_ip_address` (backend-stored) before WebRTC. In WSL2 dev, `last_ip_address` is always the gateway (`172.21.112.1`), so WebRTC never ran.

`displayIpAddress` always preferred `device.ip_address` (also the gateway) over `localIpAddress`, so even a correctly detected WebRTC IP was never shown.

## Fix

### `utils/getLocalIp.ts`

Added `publicCandidate` closure variable. Private LAN IPs still resolve immediately. Non-private IPs are buffered in `publicCandidate` and only returned at timeout if no private IP was found.

### `pages/settings.vue`

- Added `isPrivateLanIp` helper (same private-range regex as `getLocalIp.ts`).
- Reordered `getLocalIpAddress`: WebRTC first → `last_ip_address` → `/api/device/ip`.
- Updated `displayIpAddress`: prefers `localIpAddress` only when `isPrivateLanIp(localIpAddress.value)` is true, otherwise falls back to `device.ip_address`.

## Behavior After Fix

| Environment | WebRTC result | `displayIpAddress` |
|---|---|---|
| Physical LAN (prod) | real LAN IP (e.g. `192.168.1.x`) | WebRTC LAN IP ✓ |
| WSL2 dev | null or non-private | `device.ip_address` (gateway, dev-only limitation) |
| WebRTC blocked | null | `device.ip_address` fallback ✓ |

## Verification

```bash
npm run typecheck && npm run lint
```

Manual: open Settings in a desktop browser on a real LAN — "IP Address" should show the machine's LAN IP (e.g. `192.168.x.x`). "Detected Client IP" diagnostic row should match.
