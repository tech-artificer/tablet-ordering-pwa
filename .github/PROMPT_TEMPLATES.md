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

