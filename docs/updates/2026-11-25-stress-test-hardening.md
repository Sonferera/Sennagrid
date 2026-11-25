# Update: Multi-Scenario Stress Test Hardening & Map Synchronization Fix

- **Date:** 2026-11-25
- **Author / Role:** Irfan & Pradipta Arya (QA Stress Test & Reliability Pass)
- **Scope:** `packages/engine` | `apps/web` | `docs`
- **Related Commits / PR:** Branch `feat/ui-stitch-precision`

## Summary

Executed a 19-scenario numerical engine & export stress matrix paired with a 6-scenario interactive browser stress test (`http://localhost:5173/`), uncovering and fixing a stale MapLibre feature-state/marker synchronization race during rapid scenario switches, a false offline-basemap fallback during theme switches, a `NaN` quota edge case in `computeWeeklyQuota`, badge overlap on dense ward clusters, and UI copy/overflow details under extreme 4-digit loads.

## Changes

- **Engine Quota Sanitization (`packages/engine/src/optimizer.ts`, `optimizer.test.ts`):**
  - Guarded `computeWeeklyQuota` and `optimizeResourceAllocation` against non-finite `budgetRatio` inputs (`NaN` / `Infinity`), falling back cleanly to `DEFAULT_SIMULATION_PARAMS.budgetRatio` so `BUDGET_COMPLIANCE` never emits `NaN` quotas.
- **Race-Free MapLibre Synchronization & Basemap Recovery (`apps/web/src/components/simulator/SplitMapView.tsx`):**
  - Unified region GeoJSON updates, marker recreation, and `setFeatureState` sync around `styleEpoch` and MapLibre `sourcedata` events instead of gating updates on transient `map.isStyleLoaded()` state during rapid `Metro <-> Harbor` / `Dengue <-> Respiratory` switches.
  - Filtered aborted fetch errors (`AbortError`) during rapid `Dark <-> Light` `setStyle` transitions so live Carto basemaps stay visible instead of triggering premature offline fallback.
  - Compacted pane summary strings (`1 active hub` vs `3 active hubs`) to keep both map panels aligned on one horizontal line across extreme numbers.
- **Collision-Free Priority Map Badges (`apps/web/src/lib/viewModels.ts`, `viewModels.test.ts`):**
  - Updated `selectPriorityBadgeDistrictIds` to enforce normalized spatial centroid separation (`dx >= 0.25` or `dy >= 0.14`) across breached, treated, and top-stressed districts on both Metro Tropica and Harbor Corridor.
- **Header, KPI, Slider Grammar, Chart Axis & Swap Log Polish (`HeaderBar.tsx`, `ControlBar.tsx`, `KpiStrip.tsx`, `EpidemicCharts.tsx`, `SwapTracePanel.tsx`):**
  - Keyed `HeaderBar` gate indicator copy from `gates.overallStatus` (`Pass` / `Review` / `Fail`).
  - Added singular/plural grammar (`1 ward` vs `3 wards`) in `ControlBar`, `whitespace-nowrap` non-splitting figures in `KpiStrip`, compact `YAxis` formatting (`>= 1000 -> k`) with `left: 0` / `width={46}` in `EpidemicCharts.tsx` so 4-digit extreme overflow ticks never clip, and right scrollbar clearance (`pr-4`) on `SwapTracePanel` `COST DELTA` cells.

## Verification

- Engine & ViewModel 19-scenario stress harness: zero non-finite values, zero mass-conservation errors (`< 1e-9`), zero quota violations, solve latency `27–390ms`, and finite safe handling of adversarial `NaN` inputs.
- `npm run check:docs`: PASS
- `npm run test`: PASS (see verification log)
- `npm run build`: PASS (typecheck + Vite build)
- Live Browser Stress QA (`http://localhost:5173/`): verified rapid scenario thrash (`S4`) syncs map polygons and badges cleanly, `Dark <-> Light` theme switches keep Carto basemaps intact, `Key Wards` badges avoid collisions on Harbor Corridor (`S3`) and Metro Tropica (`Day 0`), `COST DELTA` scrollbar clearance works cleanly, and `0` console/page errors occur.
