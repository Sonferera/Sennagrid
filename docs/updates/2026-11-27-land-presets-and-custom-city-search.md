# Update: Harbor Corridor Land Alignment, New Benchmarks, and Custom City Search

- **Date:** 2026-11-27
- **Author / Role:** Irfan (`Sonferera`) / Full-Stack Engine & UI
- **Scope:** `packages/engine` | `apps/web` | `docs`
- **Related Commits / PR:** `feat/presets-land-fix-and-custom-city`

## Summary

Aligned `Harbor Corridor` coordinates onto land west of Tokyo Bay open water, added two new calibrated urban benchmarks (`Highland Ring` and `Monsoon Delta`), and implemented global Custom City Search powered by the free Open-Meteo Geocoding and Forecast APIs with transparent normalized-grid framing and offline latitude-band climatology fallback.

## Changes

- Expanded `packages/engine/src/types.ts` (`BuiltInRegionId`, `CustomRegionId`, `RegionId`) and updated `packages/engine/src/climate.ts` with profiles for `highland_ring`, `monsoon_delta`, plus latitude-band fallback climatology for `custom_*` cities.
- Shifted `apps/web/src/data/regions/harborCorridor.ts` (`originLng: 139.18, originLat: 35.43`, `ANCHOR_LAT = 35.495, ANCHOR_LNG = 139.4`) so all 16 districts sit on inland/bayfront terrain west of `139.66` while retaining benchmark behavior.
- Added `apps/web/src/data/regions/highlandRing.ts` (16 districts, upland plateau `-1.2921, 36.8219`, `direct_seir` default), `apps/web/src/data/regions/monsoonDelta.ts` (18 districts, humid river plain `13.806, 100.548`, `vector_seir_sei` default), and `apps/web/src/data/regions/customCity.ts` (`buildCustomCityPreset` with `cos(lat)` metric width scaling and latitude-matched tropical Vector SEIR-SEI vs temperate Direct SEIR 18-ward templates).
- Created `apps/web/src/services/geocoding.ts` (`https://geocoding-api.open-meteo.com/v1/search`, 3000ms abort timeout, coordinate bounds checks) and extended `apps/web/src/services/weather.ts` to accept custom anchor coordinates.
- Wired `customPreset`, `customPresetsById`, and `selectCustomCity` in `useSimulationStore.ts` (restoring `seasonal_benchmark` when returning from a custom city to a built-in preset and guarding in-flight `setClimateMode` fetches against stale region switches), updated `ControlBar.tsx` with the 4 benchmarks and `Simulate Any City (Open-Meteo)` search box + loading/empty/offline error states, made the `SplitMapView.tsx` custom weather badge dynamically reflect `open_meteo` vs `fallback_climatology`, passed matched custom presets through `App.tsx`, `SplitMapView.tsx`, and `DispatchSchedule.tsx`, and updated `Footer.tsx`, `MethodologyView.tsx`, `guideCatalog.ts`, `README.md`, `docs/BLUEPRINT.md`, `docs/HANDOFF.md`, `docs/DESIGN_SPEC.md`, and `docs/CHANGELOG.md`.
- Upgraded `guideCatalog.ts`, `FeatureGuideModal.tsx`, `InteractiveTour.tsx`, `HeaderBar.tsx`, `ControlBar.tsx`, `DispatchSchedule.tsx`, and `SwapTracePanel.tsx` into a synchronized 10-step precision Live Tour (`header-bar`, `city-scenarios`, `model-controls`, `kpi-strip`, `split-map`, `timeline-player`, `epidemic-charts`, `dispatch-matrix`, `swap-trace`, `methodology-gates`) with per-step `Try it now` guidance and a 14-card Feature Guide featuring a 5-row City Benchmarks & Global City Search reference table, dynamic category counts, and live step-count labels.
- Expanded tests in `packages/engine/src/__tests__/climate.test.ts`, `apps/web/src/data/regions/__tests__/presets.test.ts`, `apps/web/src/services/__tests__/services.test.ts`, `apps/web/src/store/__tests__/useSimulationStore.test.ts`, and `apps/web/src/components/onboarding/__tests__/guideCatalog.test.ts`.

## Verification

- `npm run check:docs` and `node scripts/check-docs.mjs --base origin/main`: Pass (0 errors; updated `CHANGELOG.md`, `BLUEPRINT.md`, `HANDOFF.md`, `DESIGN_SPEC.md`, `README.md`, and this update note).
- `npm run test`: Pass (`80/80` tests across `@sennagrid/engine` `43/43` in 5 files and `@sennagrid/web` `37/37` in 6 files, including temperate London Direct SEIR calibration, `seasonal_benchmark` restore, and 10-step `guideCatalog.test.ts` cross-link validation).
- `npm run build`: Pass (`tsc --noEmit` on `@sennagrid/engine` and `@sennagrid/web` plus Vite production bundle in `9.77s`).
- Catatan pengujian manual / browser: Live Playwright E2E QA on `http://localhost:5173/` verified all 4 built-in presets (`Metro Tropica`, inland `Harbor Corridor` `final_step_20.png`, `Highland Ring`, `Monsoon Delta`), temperate Custom City Search (`London` `18d -> 15d`, `34.7 -> 14.3 beds`, `4/5 Gates Pass`, `final_step_32.png`), tropical Custom City Search (`Surabaya`), the upgraded 14-card Feature Guide modal (`Start Live Tour (10 Steps)`, 5-row City Benchmarks reference table, category counts, `Try it:` callouts, search `"London"` + reset), all 10 Live Tour steps with matching `ring-2` DOM targets (`header-bar` through `methodology-gates`, `final_step_18.png`), zero horizontal overflow at `1440x900` and `390x844`, and `0` console/page/network errors.
