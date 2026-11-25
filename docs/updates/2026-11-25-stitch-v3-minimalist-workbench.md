# Update: Stitch v3 Minimalist Workbench Overhaul

- **Date:** 2026-11-25
- **Author / Role:** Irfan & Pradipta Arya (Owner B Minimalist UI Redesign)
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** Branch `feat/ui-stitch-precision`

## Summary

Streamlined the SennaGrid web interface (`apps/web`) into the approved **Stitch v3 Minimalist** layout so planners and judges can read the core outbreak outcome (`5d -> 0 days` collapse, `7.6 -> 0.0 beds` peak overflow, `5 / 5 Passed` gates), compare spatial districts without map label collisions, inspect individual wards on click, and review the 13-week plan without nested cards, badge noise, or permanent sidebar crowding.

## Changes

- **Warm Paper Theme & Enlarged Typography (`index.css`, `index.html`, `DESIGN_SPEC.md`, all UI views):**
  - Replaced bright `#f8fafc` / `#ffffff` surfaces with soft archival paper tones (`#f5f2eb` canvas, `#fbf9f5` cards, `#eee9df` inset wells, `#e0dbd0` warm stone borders, `#1c1917` / `#57534e` warm charcoal inks, plus gentle sepia/brightness toning on `.maplibregl-canvas`) to eliminate white glare.
  - Increased UI readability across all components (`14px`–`15px` controls/tables, `16px` section headings, `13px` secondary captions, `32px`–`36px` KPI figures) while keeping WCAG AA contrast >= `4.78:1`.
- **Minimal Header & Calm Control Rail (`HeaderBar.tsx`, `TabNav.tsx`, `ControlBar.tsx`):**
  - Consolidated navigation into a 52px top bar (`SennaGrid` wordmark, underlined tabs `Simulator` / `Weekly Plan` / `Methodology`, `Tour`, and `5/5 Gates Pass` indicator).
  - Moved primary simulation inputs into a crisp `256px` left control rail (`City Scenario`, `Dengue | Respiratory`, `Budget` slider, `Run Optimization`) with a collapsed `Parameters` drawer housing Climate Forcing (`Peak Season` vs `Live Weather`), `ICU Rate`, `Commuter Outflow`, `Team Efficacy`, and `Reset Defaults`.
- **Unified Impact Strip & Spatial Stage (`KpiStrip.tsx`, `SplitMapView.tsx`, `DistrictInspector.tsx`, `TimelinePlayer.tsx`, `viewModels.ts`):**
  - Replaced stacked executive banner + 4-card grid with a single 3-column hairline card (`Hospital Collapse`, `Peak ICU Overflow`, `Policy Gates & Trade-off`).
  - Added `selectPriorityBadgeDistrictIds` in `viewModels.ts` (tested in `viewModels.test.ts`) so MapLibre shows non-overlapping key ward pills by default (`Key Wards | All Wards | Off`), paired with a `Map | Watchlist` switcher, a click-to-open contextual `DistrictInspector` comparison strip, and a single-row attached `TimelinePlayer`.
- **Clean Trajectory, Weekly Plan, & Methodology (`EpidemicCharts.tsx`, `DispatchSchedule.tsx`, `SwapTracePanel.tsx`, `PolicyGatesPanel.tsx`, `MethodologyView.tsx`):**
  - Unified `EpidemicCharts` into `ICU Overflow Trajectory` (`Overflow | Cases` toggle) alongside a transparent 5-bar `Strategy Fit (vs Reactive Baseline)` panel.
  - Simplified `DispatchSchedule` to a pastel `H / S / I` Weekly Coverage Matrix (active wards by default with toggle for all wards), paginated 5-column `Field Assignments` table, and a collapsed-by-default `SwapTracePanel` accordion.
  - Refactored `PolicyGatesPanel` and `MethodologyView` to a hairline 5-gate strip, 3 clean formula cards, and a 5-step execution pipeline with synthetic benchmark scope disclosure.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: 70/70 tests PASS (42 `@sennagrid/engine` + 28 `@sennagrid/web`)
- `npm run build`: PASS (strict TypeScript typecheck + Vite production build)
- Live browser verification (`http://localhost:5173/`): Verified across Desktop (`1440x900`), Tablet (`900x800`), and Mobile (`390x844`) with 0 JS console errors, 0 horizontal overflow, stacked 256px sidebar scenario cards, Carto Positron key-ward choropleth maps, click-to-inspect `DistrictInspector`, `Watchlist` mode, `Live Weather` / `Harbor Corridor` switching, paginated `Weekly Plan` filters & CSV/JSON exports, expandable `Stage 2 Swap Trace`, `Methodology` gates/formulas, `Tour`, and `>= 44px` mobile touch targets.
