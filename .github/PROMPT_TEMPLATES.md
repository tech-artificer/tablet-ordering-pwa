PR and agent prompt templates (tablet-ordering-pwa)
===============================================

This file contains the required `[PR-TEMPLATE]` skeleton and common prompt templates agents should use for the PWA.

[PR-TEMPLATE]
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

Agent prompt templates (examples)
--------------------------------

Prompt: "Add the five Copilot guideline files to `tablet-ordering-pwa`, ensure no service worker or `nuxt.config.ts` changes, run `npm ci` and `npm run lint`, and prepare the PR body including offline-testing notes."
# Prompt Templates (PWA)

Use these when asking an agent to work on the PWA. Be explicit about files that may be edited and include `run_commands`.

Template skeleton
-----------------
- template: <feature|bugfix|chore|docs>
- repo: tech-artificer/tablet-ordering-pwa
- target_branch: <branch>
- files_to_change: <list of paths under tablet-ordering-pwa/>
- motivation: <reason>
- acceptance_criteria: <what success looks like>
- run_commands: <commands to verify locally>
- tests_to_add_or_run: <tests or NONE>
- risk_level: <low|medium|high>
- architect_approve: <required|not_required>
- additional_notes: <e.g., do not modify nuxt.config.ts or service worker files>

Examples live in docs/EXAMPLES.md

