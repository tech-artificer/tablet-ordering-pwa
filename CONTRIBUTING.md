# Contributing

## Release process

On each staging→main promotion: tag the release (e.g. `v2026.06.19`), run `git cliff -o CHANGELOG.md`, and commit the updated changelog.

Conventional Commits are enforced via Husky (`commit-msg` hook) when `npm install` has run.
