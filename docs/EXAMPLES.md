# Examples (PWA)

PR-TEMPLATE (PWA) - include offline-testing notes

[PR-TEMPLATE] title: chore: add Copilot agent guidelines and enforcement
[PR-TEMPLATE] motivation: Enforce consistent safe agent behaviour for the PWA while preserving offline functionality.
[PR-TEMPLATE] changes:
- .github/COPILOT_PROMPT_GUIDELINES.md: PWA-specific rules (do not modify service worker)
- .github/PROMPT_TEMPLATES.md: prompt templates for PWA tasks
- docs/AGENT_WORKFLOWS.md: verification commands for PWA
- docs/EXAMPLES.md: this file
- .github/workflows/pr_template_check.yml: PR body validation Action

[PR-TEMPLATE] verification:
run: npm ci && npm run lint || true

[PR-TEMPLATE] acceptance_criteria:
- All five files present on branch chore/copilot-guidelines
- PR contains the [PR-TEMPLATE] skeleton
- No changes to `nuxt.config.ts` or any service worker files in this PR

Offline testing notes: When creating this PR include steps to run the PWA dev server and a Playwright or browser sequence that demonstrates the expected offline behavior.

