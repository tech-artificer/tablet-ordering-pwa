# Agent Workflows (tablet-ordering-pwa)

This document describes the expected local workflow for Copilot-style agents working on the PWA repository.

Local workflow (agent)
----------------------
1. Ensure you do NOT modify `nuxt.config.ts` or any service worker files in this task.
2. Create a new branch:

   git switch -c chore/copilot-guidelines

3. Add only the guideline and docs files under `.github/` and `docs/`.

4. Commit and run verification:

   npm ci
   npm run lint || true
   npm run test || true

5. Prepare PR body and include *offline-testing notes* describing how to validate the change while offline.
# Agent Workflows (PWA)

Verification commands (tablet-ordering-pwa)
-----------------------------------------
Run these in `tablet-ordering-pwa`:

```powershell
cd tablet-ordering-pwa
npm ci
npm run lint || true
npm run test || true
```

Offline testing notes
---------------------
- Do not modify service worker files in this changelist. To verify offline behavior, run the dev server and use browser tools or Playwright to simulate offline scenarios. Provide explicit steps in the PR to reproduce any offline tests.

Agent lifecycle summary
-----------------------
1. Clarify unknowns (ask one question if necessary).
2. Create a branch and small todo plan.
3. Implement minimal changes.
4. Run linters/tests and include results in the PR.
5. Commit only intended files and prepare PR body with [PR-TEMPLATE].

