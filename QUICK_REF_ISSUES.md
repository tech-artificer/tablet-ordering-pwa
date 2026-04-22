# tablet-ordering-pwa Quick Issue Reference

**AUTO-GENERATED - Do not edit manually**
**Source**: agent-continuum/issues/by-project/tablet-ordering-pwa/
**Generated**: 2026-04-20 08:26:02

This file provides INSTANT LOOKUP for common issues.
For COMPLETE DETAILS, read the linked ISS-* files in continuum.

---

## Quick Lookup

| ID | Symptom | Severity |
|:---|:--------|:---------|
| [T1](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T1-npm-peer-dependency-conflict.md) | Docker build fails during `npm ci` with peer dependency conflict errors: ``` ... | [HIGH] |

## By Category

### Deployment

- [T1: Docker Build Fails on npm Peer Dependency Conflicts](E:/Projects/agent-continuum/issues/by-project/tablet-ordering-pwa/ISS-T1-npm-peer-dependency-conflict.md)

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

