# Tablet PWA Agent Quality Gate

Use this protocol for every `tablet-ordering-pwa/` code change. The goal is simple: no new lint errors, no Nuxt type errors, and no hidden regression in the ordering state machine.

## Standard Gate

```powershell
cd tablet-ordering-pwa
npm.cmd run validate
```

`validate` runs the warning budget, Nuxt typecheck, and the Vitest suite. For routing, session, middleware, polling, service worker, or deployment-sensitive changes, also run:

```powershell
npm.cmd run build
```

## Before Editing

- Load Vue/Nuxt/Pinia guidance for `.vue`, `stores/`, `middleware/`, `pages/`, and `composables/` work.
- Read nearby tests before changing state-machine behavior.
- Keep edits inside `tablet-ordering-pwa/` unless the task explicitly requires another app.
- Add or update a regression test before fixing behavior that already broke once.

## Coding Rules

- Use `<script setup lang="ts">` patterns already present in the app.
- Type store actions and composable returns when they cross page/component boundaries.
- Prefer `unknown` plus refinement over `any` for API or persisted payloads.
- Await navigation, store writes, timers, polling state, and emitted events that affect user flow.
- Remove unused imports, refs, computed values, props, emits, diagnostic UI, and console logging before handoff.
- Avoid blanket `eslint-disable`, `@ts-ignore`, and non-null assertions. If one is unavoidable, keep it local and explain why in code.

## Warning Budget

The app has legacy ESLint warnings, so the gate uses a budget instead of pretending the debt is zero. Agents may reduce the budget after cleanup, but must not raise it for feature work.

```powershell
npm.cmd run lint:budget
```

If the command fails, fix the new warnings. Do not hand off with an increased warning count.

## Handoff Format

Include:

- Changed files.
- Validation commands and results.
- Any skipped check and the exact reason.
