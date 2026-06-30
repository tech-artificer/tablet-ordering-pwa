# tab-case-013 — Settings Device IP Display

## Status

Open on `feat/welcome-screen-redesign`. Frontend-only fix. No backend change.

> **Note:** This case file was rescued from the Pi checkout (PR #223). The full IP-display
> fix (WebRTC-first, `isPrivateLanIp` gating) is already on `staging`/`main`. This branch
> still has the pre-fix behavior documented under **Current behavior** below.

## Scope (this PR cohort)

- `docs/cases/tab-case-013-settings-device-ip-display.md` (this file)

## Symptom

The Settings page "IP Address" field shows `172.21.112.1` (the WSL2 NAT gateway) for every tablet instead of each device's real LAN IP. All tablets appear identical in the Settings IP display during local development.

## Root Cause

Two compounding bugs (still present on this branch):

**1. `getLocalIp.ts` — non-private candidates resolve immediately**

The `onicecandidate` handler comment says non-private IPs should be buffered, but both branches call `handleIp(ip)`, which resolves the promise. A public/reflexive STUN candidate emitted before a private LAN candidate can win incorrectly.

**2. `settings.vue` — backend IP preferred over WebRTC**

`getLocalIpAddress` tries `last_ip_address` (backend-stored) before WebRTC. In WSL2 dev, `last_ip_address` is often the gateway (`172.21.112.1`), so WebRTC may never run.

`displayIpAddress` is `displayDevice.value?.ip_address ?? localIpAddress.value ?? "—"`, so the backend-stored gateway wins over a WebRTC-detected LAN IP.

## Current behavior (this branch)

| Helper | Behavior |
|--------|----------|
| `getLocalIpAddress` | `last_ip_address` → WebRTC (`getLocalIp`) → `GET /api/device/ip` |
| `displayIpAddress` | `device.ip_address` → `localIpAddress` → `"—"` |
| `getLocalIp` | Private and public ICE candidates both call `handleIp` immediately |

## Target fix (on `staging`/`main`)

- `getLocalIp.ts`: buffer non-private candidates; resolve private LAN IPs immediately.
- `settings.vue`: add `isPrivateLanIp`; WebRTC first in `getLocalIpAddress`; prefer `localIpAddress` in `displayIpAddress` only when `isPrivateLanIp(localIpAddress)`.

| Environment | WebRTC result | Expected display |
|---|---|---|
| Physical LAN (prod) | real LAN IP (e.g. `192.168.1.x`) | WebRTC LAN IP |
| WSL2 dev | null or non-private | `device.ip_address` (gateway; dev limitation) |
| WebRTC blocked | null | `device.ip_address` fallback |

## Verification

```bash
npm run typecheck && npm run lint
```

Manual (after merging staging IP fix): open Settings on a real LAN — "IP Address" should show the machine's LAN IP.
