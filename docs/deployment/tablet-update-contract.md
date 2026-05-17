# Tablet Update Contract

This contract defines the minimum cross-repo rules for deterministic, verifiable tablet updates between:

- `tech-artificer/tablet-ordering-pwa` (tablet app)
- `tech-artificer/woosoo-nexus` (backend + deployment orchestration)

## 1) Source of truth for Nexus branch and Tablet branch

For every production rollout, deployment metadata MUST include both refs:

- `NEXUS_GIT_REF` (branch/tag + commit SHA)
- `TABLET_GIT_REF` (branch/tag + commit SHA)

Rules:

1. Both refs MUST be pinned to immutable commit SHAs at release time.
2. `TABLET_GIT_REF` is the source of truth for which tablet build is expected on devices.
3. `NEXUS_GIT_REF` is the source of truth for API/runtime behavior the tablet build is validated against.
4. If either SHA changes, the rollout is a new release and must produce a new build fingerprint.

## 2) Production Dockerfile for tablet deployment

The production tablet image MUST be built from:

- `/Dockerfile` in the `tablet-ordering-pwa` repository root

Contract expectations:

- Multi-stage build (`node:22-alpine` builder + runtime)
- `npm ci` + `npm run build` in builder stage
- Runtime serves Nuxt output from `.output/server/index.mjs`

No alternate production Dockerfile path is allowed unless this contract is updated in both repos.

## 3) Required runtime files

A production deployment is valid only when all files below are reachable by tablets:

- `/runtime-config.js`
- `/sw.js`
- `/manifest.webmanifest`
- `/_nuxt/*` (hashed build assets)

If any file above is missing, stale, or mismatched with the deployed HTML shell, deployment MUST be treated as failed.

## 4) Cache policy expectations

To keep updates deterministic:

- HTML app shell documents (`/`, `/index.html`, `/200.html`, `/404.html`) MUST be `no-cache`/revalidated.
- `/runtime-config.js` MUST be `no-cache`/revalidated on each app launch.
- `/sw.js` MUST be fresh-checkable (`no-cache`/revalidated), never long-lived immutable.
- `/_nuxt/*` hashed assets SHOULD be immutable with long max-age.
- `/manifest.webmanifest` SHOULD be short-lived or revalidated.

Service worker freshness requirement:

- The active service worker script (`/sw.js`) must update promptly after each release so clients can activate the new precache manifest.

Dedicated-origin assumption:

- Aggressive full-origin cache/service-worker resets are only safe when the tablet PWA owns the entire origin.
- If the tablet PWA shares an origin with admin, docs, assets, or other surfaces, normal tablet update apply must not delete unrelated same-origin caches or unregister unrelated same-origin service workers.

Update/reset safety rules:

- Normal in-app update apply (via `UpdateBanner`) must only activate the waiting tablet service worker and reload once blockers are clear; it must not perform full-origin cache purges.
- The Settings maintenance action must only clear formalized tablet PWA cache names/prefixes and the current tablet app registration.
- `/sw-reset` is an emergency operator path for dedicated-origin recovery only; it may clear every same-origin cache and unregister every same-origin service worker.

## 5) Required visible debug values

Each deployment MUST expose (in a visible debug panel/banner/log block available to operators):

- Runtime config identity (non-secret): environment name + API origin/base URL identifier
- Build fingerprint (e.g., tablet commit SHA or release ID)
- Service worker freshness status (installed script version or last update check timestamp)
- Update banner status (whether a newer version is available and pending activation)

Do not expose secrets/tokens in debug output.

## 6) Deployment hard-stop rules

Deployment MUST NOT proceed (or must auto-fail health verification) when any of these are true:

1. Nexus/tablet refs are not pinned to explicit SHAs.
2. Build fingerprint is missing from deployment metadata.
3. Any required runtime file in Section 3 is missing/unreachable.
4. Cache headers violate Section 4 for HTML, `/runtime-config.js`, or `/sw.js`.
5. Required visible debug values in Section 5 are not available.
6. This same contract (or an equivalent mirror) is not present in `woosoo-nexus` (see **Cross-repo sync requirement** below).

---

## Cross-repo sync requirement

`woosoo-nexus` MUST keep this contract mirrored (same intent and enforceable rules). Changes to one repo's contract must be mirrored in the other repo as part of the same release train.
