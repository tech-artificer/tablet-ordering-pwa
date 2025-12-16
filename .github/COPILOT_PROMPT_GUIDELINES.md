# Copilot Agent Prompt Guidelines (tablet-ordering-pwa)

This file mirrors the repository-level guidelines and includes PWA-specific notes.

Important PWA notes
-------------------
- Do NOT modify `nuxt.config.ts`, service worker files, or other offline runtime configuration in this PR.
- Include *offline-testing notes* in the PR body describing how a human can verify behavior without network access.

General rules
-------------
- Follow the same rules as the repository-level `.github/COPILOT_PROMPT_GUIDELINES.md`.

[PR-TEMPLATE] (required)
title: chore: add Copilot agent guidelines and enforcement
motivation: Enforce consistent, safe AI-agent behavior for the PWA while preserving offline functionality.
changes:

- .github/COPILOT_PROMPT_GUIDELINES.md: add strict agent rules and repo purpose
- .github/PROMPT_TEMPLATES.md: add required prompt templates
- docs/AGENT_WORKFLOWS.md: add workflows and verification commands
- docs/EXAMPLES.md: add examples and expected deliverables
- .github/workflows/pr_template_check.yml: add PR-body validation Action

verification:
run: npm ci
run: npm run lint || true
run: npm run test || true

acceptance_criteria:
All five files present on branch chore/copilot-guidelines
PR contains the [PR-TEMPLATE] skeleton and offline-testing notes
No modifications to service worker or `nuxt.config.ts` in this PR

risk_level: low

tests: NONE
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

