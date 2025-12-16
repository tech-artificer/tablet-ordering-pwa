# Copilot Agent Guidelines (PWA)

Purpose
-------
Standard rules for Copilot-style agents working on the PWA. These rules emphasize preserving offline behavior and not touching service worker configuration unless explicitly requested.

Core rules (PWA)
-----------------
- Do NOT modify `nuxt.config.ts`, any service-worker files, or `public/` service-worker assets in this PR.
- Only change files explicitly requested by the user. If a change touches offline caching or runtime service worker behavior, require explicit user approval.
- Preserve persisted client state behavior unless the user asks for deliberate changes.

General rules (as in root)
-------------------------
- Never commit secrets. Ask one question and stop if required fields are UNKNOWN.
- Use `manage_todo_list` to plan multi-step tasks.
- Run linters and tests locally when feasible and include commands and results in the PR.

Enforcement
-----------
- This repo includes a PR-body validation Action that requires the `[PR-TEMPLATE]` skeleton in PR bodies.

If blocked
----------
Ask exactly one concise clarifying question and stop.

Revision: 2025-12-16

