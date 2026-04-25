# tablet-ordering-pwa Quick Issue Reference

**AUTO-GENERATED - Do not edit manually**
**Source**: agent-continuum/issues/by-project/tablet-ordering-pwa/
**Generated**: 2026-04-23 19:55:37

This file provides INSTANT LOOKUP for common issues.
For COMPLETE DETAILS, read the linked ISS-* files in continuum.

---

## Quick Lookup

| ID | Symptom | Severity |
|:---|:--------|:---------|
| [T1](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T1-npm-peer-dependency-conflict.md) | Docker build fails during `npm ci` with peer dependency conflict errors: ``` ... | [HIGH] |
| [T7](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T7-startup-hold-api-url-icons-sw-fallback.md) | - App startup fails on a clean tablet device session. - Network requests are ... | [HIGH] |

## By Category

### Deployment

- [T1: Docker Build Fails on npm Peer Dependency Conflicts](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T1-npm-peer-dependency-conflict.md)
- [T7: PWA Startup Hold - Stale API URL, Missing Icons, and SW Fallback Mismatch](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T7-startup-hold-api-url-icons-sw-fallback.md)

---

## How to Use

1. **Find symptom** in Quick Lookup table
2. **Click ID link** to open full ISS-* file in continuum
3. **Read complete diagnosis**, not just quick fix
4. **Log resolution** via: `.\.agents\scripts\log-issue-resolution.ps1 -IssueID [ID] -Action [what you did]`

## Nuclear Enforcement

Agents **MUST** check project issues during boot sequence:
```powershell
.\.agents\scripts\log-evidence.ps1 -Action CheckProjectIssues -Details "tablet-ordering-pwa"
```

**Rule**: Before diagnosing ANY deployment/build error, check if it's already documented here.

---

**Regenerate**: `.\.agents\scripts\generate-quick-ref.ps1 -Project tablet-ordering-pwa -Force`

