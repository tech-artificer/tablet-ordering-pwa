---
status: canonical
last_reviewed: 2026-05-17
scope: tablet-ordering-pwa
---

# AGENTS.md — tablet-ordering-pwa (per-app entrypoint)

This is a **pointer**, not a duplicate. It scopes agent work that happens inside
`tablet-ordering-pwa/`; the full operating system lives in the root `../AGENTS.md`.

1. **Operating system:** follow the root `../AGENTS.md` — the Lite 4-agent sequence
   (Contrarian → Specialist → Verifier → Executioner) and triage tiers apply here.
2. **This app's detailed onboarding is in `docs/AI_ONBOARDING.md`** (architecture, PWA rules,
   validation). The scope rules in this file are authoritative — do not duplicate them.
3. **Specialist for this app:** `chuya-frontend`. Scope is `tablet-ordering-pwa/**` only;
   touching another app is `SPLIT_REQUIRED`.
4. **Contracts:** `../contracts/tablet-api.contract.md`, `order-state`.
5. Tablet sends intent only: `{ guest_count, package_id, items:[{menu_id,quantity}] }`. Never
   send pricing/tax/modifiers/totals/POS/state. Never invent backend states.
6. Never show raw technical errors to customers. No hardcoded LAN IPs or API/Reverb hosts.
7. **Resume:** before any task, check `../docs/cases/<task-slug>.md`. If `IN_PROGRESS`/`BLOCKED`,
   do not restart — follow `../docs/RESUME_PROTOCOL.md`, adopt the `next_agent` role, and
   checkpoint to the case file before handing off.
