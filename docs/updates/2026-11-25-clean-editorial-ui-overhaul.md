# Update: Clean Editorial Spatial Workbench & Cartographic Overhaul

- **Date:** 2026-11-25
- **Author / Role:** Irfan & Pradipta Arya (Owner B UI Overhaul)
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** Branch `feat/ui-clean-redesign`

## Summary

Completely redesigned the SennaGrid browser interface from a dark-navy box layout into a crisp, high-legibility **Clean Editorial Light** spatial analytics workbench (`#f8fafc` / `#ffffff`, `Plus Jakarta Sans` + `IBM Plex Mono`, Carto Positron cartography) so simulation insights, spatial ward boundaries, commuter corridors, and weekly team dispatches are immediately understandable at first glance.

## Changes

- **Organic Contiguous Ward Geometry (`apps/web/src/data/regions/meshBuilder.ts`):** Subdivided shared grid edges into smooth multi-vertex municipal boundaries while keeping canonical 4-corner district centroids bit-identical so all `@sennagrid/engine` mobility weights and benchmarks remain unchanged.
- **Immediate Visual Storytelling (`useSimulationStore.ts`, `viewModels.ts`, `KpiStrip.tsx`):**
  - Added explicit `Climate Forcing` toggle (`Peak Season` default vs prefetched `Live Open-Meteo`) and automatic timeline focus on `findCrisisFocusDay(output)` so users immediately see the ICU surge contrast (`5` collapse days vs `0` days) on initial load, alongside a 1-click `Replay D0` button.
  - Added deterministic plain-language `buildExecutiveNarrative(output)` banner and visual Reactive-vs-SennaGrid comparison bars on KPI cards (zero raw ASCII arrows).
- **Carto Positron Split Map + Watchlist (`SplitMapView.tsx`, `DistrictInspector.tsx`, `TimelinePlayer.tsx`):**
  - Tight `fitBounds` framing, luminous sequential stress fill (`#ecfdf5` -> `#bae6fd` -> `#fde68a` -> `#fb923c` -> `#f43f5e`), clickable on-map ward badges (`CODE %`), toggleable gravity commuter corridors, clickable active-week team chips above each map, and non-overlapping selection halos under dispatch borders.
  - Replaced dead empty inspector space with a live ranked **District ICU Watchlist** docked beside the map stage.
- **Charts, 13-Week Deployment Matrix, & Clean Math (`EpidemicCharts.tsx`, `DispatchSchedule.tsx`, `MethodologyView.tsx`):**
  - Added `Overflow` vs `City Total` toggle on the ICU `AreaChart` and paired the 5-axis `RadarChart` with horizontal `0–100` score bars.
  - Added an interactive **13-Week Deployment Matrix** (`Districts x W1..W13`) above the filterable dispatch schedule and updated `MethodologyView` to clean typographic math notation.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: 69/69 tests PASS (42 `@sennagrid/engine` + 27 `@sennagrid/web`)
- `npm run build`: PASS (0 strict TypeScript errors; Vite production bundle built cleanly)
- Live browser visual inspection (`http://localhost:5173/`): Verified across Desktop (`1440x900`) and Mobile (`390x844`) with 0 JS console errors, 0 horizontal overflows, pixel-aligned Carto Positron split maps, sharp crimson threshold exclusively for `>= 100%` ICU breach (`5` red wards in Reactive vs `0` red wards in SennaGrid on default Metro Tropica `20%`), interactive District ICU Watchlist, 13-week deployment matrix, and clean typographic methodology cards.
