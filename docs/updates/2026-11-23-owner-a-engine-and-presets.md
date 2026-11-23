# Update: Owner A Core Engine, City Presets, Services, and Web Worker

- **Date:** 2026-11-23
- **Author / Role:** SennaGrid Team (Owner A)
- **Scope:** `packages/engine`, `apps/web/src/{data,services,workers}`
- **Related Commits / PR:** `8b18232`

## Summary

Completed the entire Owner A foundation: vectorized `Float64Array` RK4 solver for Vector-Borne SEIR-SEI and Direct-Contact SEIR, constrained receding-horizon and checkpointed block-swap/1-swap optimizer with a Hospital Safety Guardrail, 5 deterministic Policy & Integrity Gates, two contiguous GeoJSON urban presets, Open-Meteo weather client with fallback, CSV/JSON operational exporters, and a stale-safe native ESM Web Worker client.

## Changes

- Added `packages/engine/src/solver.ts` with conservation-preserving clamping (`< 1e-9` relative error), quasi-equilibrium vector seeding, 14-28 day unmitigated lookahead, and checkpointed partial cost/overflow/collapse-day evaluation.
- Added `packages/engine/src/optimizer.ts` combining multi-seed receding-horizon initialization, 2-week sustained block swaps and 1-week swaps, Hospital Safety Guardrail (`totalOverflow <= reactive` and `collapseDays <= reactive`), deterministic rationale tagging, and `swapTrace`.
- Updated `packages/engine/src/mobility.ts` so `hubCentrality` measures population-weighted incoming commuter inflow into each district rather than constant row-normalized outflow.
- Added `packages/engine/src/gates.ts` implementing 5 deterministic policy gates (`MASS_CONSERVATION`, `BUDGET_COMPLIANCE`, `COST_DOMINANCE`, `ICU_COLLAPSE_MITIGATION`, `HUB_COVERAGE`).
- Added contiguous non-overlapping GeoJSON presets in `apps/web/src/data/regions/` (`Metro Tropica` 18 districts, `Harbor Corridor` 16 districts) calibrated so default `Metro Tropica (20%)` passes 5/5 gates (`100/100`) and cuts ICU overflow bed-days by 95.2% (`16.8 -> 0.8`) and collapse days by 80% (`5d -> 1d`) in ~256 ms.
- Added `apps/web/src/services/weather.ts`, `apps/web/src/services/export.ts`, `apps/web/src/workers/optimizer.worker.ts`, and `apps/web/src/workers/optimizerClient.ts`.
- Added unit and integration test suites across both workspaces (`solver.test.ts`, `optimizer.test.ts`, `gates.test.ts`, `presets.test.ts`, `services.test.ts`).

## Verification

- `npm run test`: 7 test files passed, 23/23 tests passed (`@sennagrid/engine`: 17, `@sennagrid/web`: 6).
- `npm run build`: `tsc --noEmit` (engine + web) passed with 0 errors; `vite build` succeeded in 799 ms.
- Calibration check: Every tested scenario across `Metro Tropica` and `Harbor Corridor` at 15%, 20%, and 30% budgets finished well under 300 ms and passed Policy Gates (`PASS`).
