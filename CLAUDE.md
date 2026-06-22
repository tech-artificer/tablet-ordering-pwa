# Tablet Ordering PWA — repo-local conventions

> **Docs live in the platform repo.** Ecosystem rules → `woosoo-platform/AGENTS.md`; cross-app
> authority → `woosoo-platform/docs/CONTRACTS.md`; this app's spec/status/config →
> `woosoo-platform/docs/tablet-ordering-pwa/`.

## Hard rules (tablet)
- **Sends intent only** (`{guest_count, package_id, items[{menu_id, quantity}]}`, CONTRACTS §3) —
  never pricing, tax, modifiers, totals, POS mapping, or state.
- No hardcoded LAN IPs / API / Reverb hosts.
- Client-safe errors only; stop on critical API failure, never fabricate success.
- Guard Pinia store leakage (cart / session / device).
- Active-order recovery must include all 5 non-terminal states (CONTRACTS §1).
