# Lessons Learned

Running notes on non-obvious bugs and the fix patterns that resolved them. Add entries when a root cause would surprise a future developer.

---

## WSL2 Dev: All Tablets Show the Same IP Address (tab-case-013)

**Symptom:** The Settings page "IP Address" field displays `172.21.112.1` for every registered tablet.

**Root cause:** In WSL2, all traffic from the Windows host reaches nginx via the WSL2 NAT gateway (`172.21.112.1`). Laravel sees that address as the source IP for every request, so `device.ip_address` and `last_ip_address` are identical across all tablets — they all reflect the gateway, not the tablet's actual LAN IP.

**Fix pattern:**
- Use WebRTC ICE candidate detection first (`getLocalIp.ts`) — it detects the browser machine's real LAN IP without a network round-trip.
- Only prefer the WebRTC-detected value in the display if it is a private LAN IP (`isPrivateLanIp` guard). This prevents a public/reflexive STUN candidate from being shown as the display IP.
- Demote backend-stored IPs (`last_ip_address`, `/api/device/ip`) to fallbacks; they reflect what the server sees, not what the client's NIC is.

**Affected:** dev environment only. In production, nginx sees real tablet IPs and backend-stored values are correct per-device.

**Files changed:** `utils/getLocalIp.ts`, `pages/settings.vue`

---
