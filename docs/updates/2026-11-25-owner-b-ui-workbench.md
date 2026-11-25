# Update: Owner B UI & Visualization Workbench

- **Date:** 2026-11-25
- **Author / Role:** Irfan & Pradipta Arya (Owner B UI / Design Spec)
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** Branch `feat/owner-b-ui-workbench`

## Summary

Implemented the complete 100% client-side SennaGrid Emergency Operations Center (EOC) spatial workbench in `apps/web`, aligned with the approved Owner B Implementation Plan and companion `docs/DESIGN_SPEC.md`. All KPI cards, synchronized MapLibre GL v5 choropleth overlays, Recharts v3 trajectories and Impact Radar, filterable dispatch tables/cards, Stage 2 swap traces, and Policy Gates consume deterministic `@sennagrid/engine` outputs directly with zero UI metric recomputation.

## Changes

- **Theme & Typography (`apps/web/index.html`, `apps/web/src/index.css`):** Adopted `IBM Plex Sans` and `IBM Plex Mono` (`tabular-nums`), WCAG AA/AAA verified dark-slate tokens (`#090d16` / `#0f172a` / `#162033`), `#64748b` interactive control borders (`3.75:1`), visible `#22d3ee` focus rings, accessible `44px`-hit-target range sliders, and `prefers-reduced-motion` support.
- **State Store & Deterministic View Models (`apps/web/src/store/useSimulationStore.ts`, `apps/web/src/lib/viewModels.ts`):**
  - Built non-blocking startup (`initialize` / `setRegion`) that solves immediately on cached or deterministic fallback climatology while upgrading to live Open-Meteo weather in the background.
  - Enforced latest-request-wins worker superseding and non-destructive error handling (preserving previous valid `output`).
  - Reconciled engine contracts verbatim: peak overflow (`beds`) separated from cumulative overflow (`bed-days`), honest signed `Cases Averted` vs `Mild-Case Trade-off` framing, dynamic `maxDay` / `totalWeeks` (`Day 0..91`, `End of Week 13`), and `stress = icuDemand / icuBeds`.
- **Global Controls & Simulator Tab (`apps/web/src/components/{layout,simulator}/*`):**
  - `ControlBar` (compact header, live/fallback weather pill, Policy Gate quick status, Guided Tour trigger, scenario & disease mode selectors, debounced `10%–40%` budget slider, collapsible Advanced Parameters drawer with Reset Defaults) and `TabNav`.
  - `KpiStrip`, dual synchronized MapLibre GL v5 `SplitMapView` (Carto Dark Matter + inline v8 offline dark fallback, `promoteId: 'id'` + `setFeatureState` playback, `Camera Sync` lock toggle, mobile single-map toggle, legend, and keyboard `<select>` district selector), `DistrictInspector` (empty state + side-by-side snapshot + 91-day peaks), `TimelinePlayer` (`Play/Pause`, `Previous/Next Day`, `Jump to Peak`, `1x/2x/4x`), and Recharts v3 `EpidemicCharts` (Active Infections, City-Wide ICU vs Capacity, neutral 5-axis Impact Radar).
- **Operational Dispatch, Methodology, & Tour (`apps/web/src/components/{schedule,methodology,onboarding}/*`, `apps/web/src/App.tsx`):**
  - `DispatchSchedule` (Week/Zone/Rationale/Search filters, mobile stacked cards + desktop table, CSV/JSON export with success/error status feedback, click-to-inspect jumping to Simulator week) and `SwapTracePanel`.
  - `PolicyGatesPanel` (`PASS`/`REVIEW`/`FAIL` + readiness score) and `MethodologyView` (active `EPIDEMIC_CONSTANTS` formulas + synthetic benchmark / non-clinical disclaimer).
  - Keyboard-accessible 4-step `InteractiveTour` (`ArrowLeft`, `ArrowRight`, `Escape`) and global guarded keyboard shortcuts in `App.tsx`.
- **Tests & Documentation:** Added `viewModels.test.ts` and `useSimulationStore.test.ts`; added `docs/DESIGN_SPEC.md`, linked in `docs/README.md`, and synchronized `docs/BLUEPRINT.md`, `docs/CHANGELOG.md`, and `docs/SUBMISSION_CHECKLIST.md`.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: 69/69 tests PASS (42 `@sennagrid/engine` + 27 `@sennagrid/web`, including 6 `viewModels` tests and 4 `useSimulationStore` tests)
- `npm run build`: PASS (0 strict TypeScript errors; Vite production build completed in 7.48s with split `vendor-maplibre` and `vendor-recharts` chunks; main app chunk 348.71 kB / 98.54 kB gzip)
- Browser QA (`antislop` R-35 & `DESIGN_SPEC.md` Section 15): Verified live at `http://127.0.0.1:5173/` across Desktop (`1440x900`), Tablet (`960x800`), and Mobile (`390x844`) with 0 JS console errors, 0 horizontal overflows, instant fallback solve (`426 ms`) + live Open-Meteo upgrade (`465 ms`), interactive `Jump to Peak`, `DistrictInspector` + `Escape`, `Advanced` drawer, `Harbor Corridor` switch (`Direct SEIR` + positive `Cases Averted`), `Dispatch Schedule` filtering + CSV/JSON exports + `SwapTracePanel`, `Methodology & Math` 5 Policy Gates, 4-step keyboard `Guided Tour`, and mobile single-map toggle + stacked dispatch cards (`>= 44px` tap targets).
