# Update: Engine UI Contracts and Edge Hardening

- **Date:** 2026-11-25
- **Author / Role:** SennaGrid Team (Owner A)
- **Scope:** `packages/engine`, `apps/web`, `docs`
- **Related Commits / PR:** Local branch `feat/engine-ui-contracts`

## Summary

Completes the engine contracts needed by Owner B: optional intervention efficacy, engine-owned impact metrics, deterministic ICU-first Harbor optimization, worker lifecycle coverage, and boundary-safe parameter handling. Harbor Corridor Direct SEIR at 20% budget now reaches 112.8 ICU overflow bed-days, below the 231.0 bed-day target, while retaining weekly quota compliance, cost dominance, and no-worse collapse days.

## Changes

- Replaced the optimizer's browser-only `performance` reference with the pure ECMAScript `Date.now()` clock so the engine typechecks under its `ES2022` library boundary.
- Added a local 15-second timeout to the aggregate 12-scenario preset calibration test without changing the global Vitest timeout.
- Added optional `SimulationParams.interventionEfficacy` with Vector SEIR-SEI default `0.65` and Direct SEIR default `0.60`; finite values are clamped to `[0,1]` and non-finite values use the mode default.
- Normalized invalid or negative ICU rates to `0`, and bounded mobility outflow to `[0,1]` with non-finite values using the existing `0.18` default.
- Added required `ImpactSummary`, `ImpactRadar`, and per-district peak contracts to `OptimizationOutput`, plus the same engine-owned metrics in full-run JSON export without changing dispatch CSV columns.
- Extracted early top-quartile hub coverage into `computeHubCoverage`, shared by the `HUB_COVERAGE` gate and the `hubContainment` radar axis.
- Changed Stage 2 to bounded multi-pass ICU-overflow-first acceptance with objective-cost tie-breaking. The Hospital Safety Guardrail, weekly quota, final cost dominance, 250 swap evaluations, and 1,150 ms search guard remain enforced.
- Retained one mode-specific Direct SEIR Stage 1 seed: `{ susPow: 1.0, hubW: 1.2, icuW: 15.0, overflowBoost: 20, lookaheadDays: 21 }`. Selection does not branch on `regionId`.
- Extended the swap trace with its 1-based Stage 2 pass and a signed 6-decimal overflow delta so multi-pass ICU-first decisions are directly auditable.
- Added worker-client tests for overlapping requests, stale responses, latest-response success, worker errors, termination while pending, and messages after termination. No worker production repair was required.
- Added solver, mobility, optimizer, gate, preset-calibration, and export coverage for efficacy, ICU-rate, mobility-outflow, budget, safety, quota, deterministic-output, and serialization boundaries.

## Verification

Measured on Node.js `v24.22.1` with bundled fallback climatology:

| Scenario | Reactive overflow | Optimized overflow | Collapse days | Evaluations | Solve time | Gates |
| :--- | ---: | ---: | :--- | ---: | ---: | :--- |
| Harbor Corridor, Direct SEIR, 20% | 292.4 | 112.8 | 17 -> 15 | 256 | 213 ms | PASS, 4/5, readiness 82 |
| Metro Tropica, Vector SEIR-SEI, 20% | 16.8 | 0.0 | 5 -> 0 | 255 | 597 ms | PASS, 5/5, readiness 100 |
| Metro Tropica, Vector SEIR-SEI, 15% | 208.3 | 82.1 | 13 -> 8 | 255 | 499 ms | PASS, 4/5, readiness 88 |
| Harbor Corridor, Direct SEIR, 30% | 18.1 | 2.2 | 7 -> 4 | 256 | 214 ms | PASS, 5/5, readiness 100 |

ICU-first acceptance trades a small cumulative-case increase in the two Metro Vector scenarios for materially lower ICU pressure. Objective cost and collapse days improve in all four measured scenarios.

- `npm run check:docs`: PASS.
- `npm run test`: PASS, 58/58 tests (41 engine, 17 web), 0 skipped.
- `npm run build`: PASS, both workspace typechecks succeeded and Vite built in 979 milliseconds.
- `openspec validate tune-optimizer-and-ui-contracts --type change --strict --no-interactive`: PASS.
- No Owner B UI files were changed, so no browser click-through was required for this engine and contract update.
