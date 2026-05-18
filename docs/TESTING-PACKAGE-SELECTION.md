# Testing Package Selection

## Current Behavior

The package-selection screen is the premium comparison UI at `pages/order/packageSelection.vue`.

The current flow is:

1. Guest opens package selection.
2. Three package cards are visible in landscape tablet view when the CSS viewport supports it.
3. A package card CTA says `Preview the meats`.
4. `Preview the meats` opens the split-pane meat browser modal.
5. The modal shows a featured meat pane, grouped meat grid, `Keep Browsing`, and `Choose [Package Name]`.
6. `Choose [Package Name]` selects the package and continues to `/menu`.

Package cards must not directly select a package.

## Manual Test Setup

### 1. Start Dev Server

```powershell
npm.cmd run dev
```

Wait for the server to show the local URL.

### 2. Refresh Browser State

If stale PWA assets are suspected:

1. Open browser DevTools.
2. Go to Application or Storage.
3. Unregister this app's service worker.
4. Hard reload with `Ctrl + Shift + R`.

## Package Selection Checks

### Landscape Tablet

Use a `1280x800` or equivalent landscape tablet viewport.

Expected:

- Package selection uses the warm grill-table background.
- All three package cards are visible in one row when the viewport is wide enough.
- Cards do not require internal vertical or horizontal scrolling.
- Each card shows package name, subtitle, description, total price, per-guest price/duration, inclusion checklist, and bottom meat preview rail.
- Each card CTA says `Preview the meats`.
- No card shows a direct `Choose package` or `Select` CTA.

### Meat Browser Modal

Tap `Preview the meats` on a package.

Expected:

- Modal opens without selecting the package.
- Left pane shows featured meat image, receipt code, group label, meat name, description, and tags.
- Right pane groups cuts by Pork, Beef, and Chicken.
- Meat cards show image, receipt code, and name.
- Clicking a meat card updates the featured pane.
- Right meat-grid pane scrolls internally when needed.
- The page behind the modal does not become the scrolling surface.
- Footer shows `Keep Browsing` and `Choose [Package Name]`.
- `Keep Browsing`, close button, backdrop click, and `Esc` close the modal without selecting the package.
- `Choose [Package Name]` selects the package and navigates to `/menu`.

### Narrow / Mobile Fallback

Use browser device emulation or a narrow viewport.

Expected:

- Package cards fall back to the existing narrow/carousel experience.
- `Preview the meats` still opens the same package preview flow.
- Final package selection still requires `Choose [Package Name]`.

## Error And Loading Checks

Expected:

- No red console errors.
- No failed package-selection chunks.
- Package API calls complete successfully.
- Empty package state shows a friendly empty state, not a technical error.

## Success Criteria

- `Preview the meats` opens the meat browser.
- Package cards never directly commit a package.
- `Choose [Package Name]` is the only package commit action.
- The modal has a featured pane and grouped meat grid.
- Right-pane scrolling is contained.
- Welcome and package selection can share `bg-grill-table`.
- `flame.gif` remains welcome-only.
