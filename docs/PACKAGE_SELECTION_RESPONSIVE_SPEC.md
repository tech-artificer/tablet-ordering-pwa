# Package Selection Responsive Spec (Authoritative)

**Status:** Active (authoritative)
**Last updated:** 2026-05-18
**Applies to:** `tablet-ordering-pwa` package selection UX on Samsung Galaxy Tab A9 (`SM-X110`) and equivalent small-tablet viewports
**Supersedes:** `docs/SPLIT-LAYOUT-IMPLEMENTATION.md`

---

## 1) Product direction (locked)

Primary experience is package comparison, not single-card browsing.

**Locked layout rule:**

`SM-X110 landscape target: show 3 comparable cards when the actual CSS viewport width supports readable 3-column cards; otherwise show 2.5-card peek or portrait fallback.`

This rule is intentionally CSS-viewport based (not physical pixel assumptions) to avoid forcing unreadably narrow cards when browser/system UI reduces effective width.

---

## 2) Responsive modes

### A. Landscape primary mode (preferred)
- Show comparable package cards in a stable row.
- Prefer 3 columns when readable width is available.
- If readable 3-column width is not available, use **2.5-card peek** pattern.
- Avoid full-page carousel as the default in landscape.

### B. Portrait / narrow fallback mode
- Single-card carousel is allowed here.
- Keep touch navigation controls clear but not visually dominant over content.

---

## 3) Card information architecture

Each card must prioritize fast comparison:
- Package name
- Price + duration + guest math
- Inclusion checklist for quick package comparison
- Bottom meat preview rail (show up to 4 overlapping thumbnails)
- `+N more` affordance when modifiers exceed preview limit
- Explicit `Preview the meats` action

**Commit model:**
- Package cards do not directly commit a package.
- `Preview the meats` opens the split-pane meat browser.
- `Choose [Package Name]` inside the meat browser is the **only commit action**.
- Card body tap may highlight/focus card but must not silently commit unless explicitly approved in a separate UX decision.

---

## 4) Modifier details behavior

Use the on-demand split-pane meat browser while preserving the comparison-first package screen:
- Left pane: featured meat image, receipt code, group label, name, description, and service tags
- Right pane: grouped Pork, Beef, and Chicken meat grid
- Footer: `Keep Browsing` and `Choose [Package Name]`
- Only the right meat-grid pane may scroll when the package contains many cuts
- Provide visible close control, backdrop close, and `Esc` to close

---

## 5) Interaction safety (required)

Current risk to avoid: previewing package details must never silently select a package.

Required guardrails:
- `Preview the meats` / details action must not trigger selection
- Event propagation must be explicit (`stop`/handler separation)
- Selection state and commit state must be visually distinct

---

## 6) Accessibility baseline (required)

- Replace emoji-only group markers with icon + text labels
- Ensure clear focus-visible states for all interactive controls
- Ensure keyboard reachable details open/close flow
- Ensure the final package commit action is explicit and announced by button text

---

## 7) Visual quality bar (standard + beautiful)

- Stable card heights in a row (no jitter from content length)
- Preview area uses fixed vertical rhythm
- CTA remains consistently visible and non-jumping
- Density tuned for 8.7" small-tablet readability
- Comparison-first visual hierarchy over decorative motion
- Shared `bg-grill-table` surface is allowed on package selection and welcome
- `flame.gif` remains welcome-only and must not move into shared package/layout surfaces

---

## 8) Acceptance criteria

1. On SM-X110 landscape, cards are readable and comparable without forcing narrow 3-column compression.
2. System chooses 3-column only when CSS viewport supports readable card width.
3. If viewport is tighter, UI falls back to 2.5-card peek (landscape) or portrait fallback.
4. `Choose [Package Name]` inside the meat browser is the only commit action.
5. Opening details never auto-selects a package.
6. Modifier preview is capped and consistent (up to 4 thumbnails + `+N`).
7. Meat browser uses featured pane + grouped grid, with scroll contained to the right pane.
8. Welcome and package selection may share `bg-grill-table`; `flame.gif` stays welcome-only.

---

## 9) Validation and verification

- Validate in real SM-X110 device/browser where possible.
- Do not rely only on physical resolution assumptions; inspect actual CSS viewport.
- Run project quality gates:
  - `npm.cmd run validate`
  - `npm.cmd run build`

---

## 10) Out of scope for this spec

- Backend/menu data model changes
- Pricing/business rule changes
- Non-package flows
