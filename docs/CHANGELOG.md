# Changelog

Seluruh perubahan signifikan pada proyek **SennaGrid** dicatat secara kronologis di file ini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan wajib diperbarui pada setiap update kode di `packages/` atau `apps/`.

---

## [Unreleased]

### Added
- Laporan audit keamanan repository (`docs/security-audit/2026-11-27/`): cakupan 15 unit / 40 pemeriksaan source-only, hasil **0 confirmed finding** dan **0 lead needs-validation**, 3 lead ditolak independen, serta catatan hardening untuk CI dan build deployment.
- Structured documentation governance system (`docs/README.md`, `docs/CHANGELOG.md`, `docs/HANDOFF.md`, `docs/SUBMISSION_CHECKLIST.md`, `docs/updates/TEMPLATE.md`).
- Automated docs check script (`scripts/check-docs.mjs` via `npm run check:docs`), local Git pre-commit hook (`.githooks/pre-commit`), GitHub Actions CI (`.github/workflows/ci.yml`), PR template, `CONTRIBUTING.md`, `AGENTS.md`, `LICENSE` (MIT), and `.gitattributes`.
- Dated milestone update notes in `docs/updates/`.
- Optional `SimulationParams.interventionEfficacy` with mode-specific defaults and bounded parameter normalization.
- Engine-owned `ImpactSummary`, `ImpactRadar`, and per-district peak comparisons in `OptimizationOutput`, including full-run JSON export coverage.
- Deterministic worker-client lifecycle tests covering overlapping requests, stale responses, successful latest responses, termination, and late messages.
- Complete Owner B UI & Visualization workbench (`apps/web/src/{store,lib,components}` and `App.tsx`): non-blocking Zustand store with instant fallback startup and background Open-Meteo climate upgrade, `ControlBar` with collapsible Advanced Parameters drawer, `TabNav`, `KpiStrip` with separated peak `beds` vs total `bed-days` units and honest signed `Mild-Case Trade-off` framing, dual synchronized MapLibre GL v5 `SplitMapView` with offline dark fallback and keyboard district selector, `DistrictInspector`, `TimelinePlayer` with `Jump to Peak`, Recharts v3 `EpidemicCharts` (Active Infections, City-Wide ICU vs Capacity, 5-axis engine-owned Impact Radar), responsive `DispatchSchedule` (stacked mobile cards + desktop table + CSV/JSON exports with feedback) & `SwapTracePanel`, `MethodologyView` & `PolicyGatesPanel`, and keyboard-accessible 4-step `InteractiveTour`.
- Companion UI/UX specification (`docs/DESIGN_SPEC.md`) and Vitest suites for `viewModels` and `useSimulationStore`.
- Overhauled the SennaGrid web interface (`apps/web`) into a Clean Editorial Light spatial workbench: Carto Positron basemap with organic subdivided district boundaries (`meshBuilder.ts`, preserving exact district centroids), on-map ward ICU badges, toggleable commuter flow corridors, active-week dispatched ward chips, auto-focus on Peak Surge Day, explicit `Peak Season` vs `Live Open-Meteo` climate toggle, plain-language executive takeaway banner, ranked District ICU Watchlist, ICU Overflow/Total chart toggle, 5-axis radar + score bars, and a 13-week visual deployment matrix.
- Streamlined the web UI to the approved Stitch v3 minimalist architecture (`HeaderBar.tsx`, full-height `284px` `ControlBar.tsx` with always-visible `Model Parameters` and aligned run summary, unified 3-column hairline `KpiStrip`, priority-badged `SplitMapView` with `Map | Watchlist` mode and tactile toolbar buttons, single-row `TimelinePlayer`, `ICU Overflow Trajectory` + transparent 5-bar `Strategy Fit`, pastel `H / S / I` matrix with paginated 5-column dispatch schedule and collapsible `SwapTracePanel`, and hairline `PolicyGatesPanel`) in a glare-free warm paper palette (`#f5f2eb` / `#fbf9f5`) with enlarged typography.
- Implemented the approved Stitch v5 **Obsidian Dark** default theme (`#121110` canvas, `#1a1917` surfaces, `#f3efe6` primary ink, `#2dd4bf` Seafoam Teal, `#fb7185` Rose, `#fbbf24` Amber) alongside an instant persisted Warm Paper Light toggle (`theme` / `toggleTheme` in `useSimulationStore.ts` + pre-paint `index.html` script), dynamic Carto Dark Matter / Carto Positron basemap switching in `SplitMapView.tsx`, a `sticky top-0 z-40` `HeaderBar`, and a grounded 3-column `Footer.tsx` (`Engine & Scope`, interactive `Workspace` shortcuts, and MIT License research baseline bar).
- Added custom geometric 2x2 brand favicon (`apps/web/public/favicon.svg` + `index.html` links + theme-color meta) matching SennaGrid's teal/parchment wordmark.
- Added the searchable `FeatureGuideModal` (`Guide`) and upgraded `InteractiveTour` (`Live Tour`) into an 8-step cross-tab spotlight walkthrough (`guideCatalog.ts`) explaining every workspace control, spatial overlay, KPI, chart, 13-week H/S/I matrix action, Swap Trace column, CSV/JSON export, Policy Gate, equation, and keyboard shortcut.

### Changed
- Hardened the delivery path after the 2026-11-27 security audit: explicit `permissions: contents: read` and SHA-pinned GitHub Actions in `.github/workflows/ci.yml`, plus `npm ci` as the Vercel `installCommand` so deployment builds use exactly the audited lockfile resolution.
- Rewrote root `README.md` into the public SennaGrid project overview with verified benchmarks, quick start, and architecture documentation.
- Synchronized `docs/BLUEPRINT.md` with the implemented multi-seed Stage 1, ICU-overflow-first hybrid block-swap/1-swap Stage 2 optimizer, objective-cost tie-break, cost-dominance fallback, and Hospital Safety Guardrail.
- Stage 2 now uses bounded multi-pass local search that retains accepted checkpoints and shares the existing evaluation and time budgets across passes.
- The optimizer swap trace now records the 1-based Stage 2 pass and a signed overflow delta so multi-pass ICU-first decisions remain directly auditable.
- Harbor Corridor Direct SEIR at 20% budget now reaches 112.8 ICU overflow bed-days, below the 231.0 bed-day acceptance target, while retaining cost dominance, weekly quota compliance, and no-worse collapse days.
- Updated the public benchmark table to report signed case changes from ICU-first search, including the small Metro Vector case increase paired with substantially lower ICU pressure.

### Fixed
- Enforced the Hospital Safety Guardrail (`totalOverflow <= reactive` and `collapseDays <= reactive`) on the Stage 2 `bestCostDomSchedule` fallback candidate in `packages/engine/src/optimizer.ts`, with OOD multi-seed regression coverage.
- Restored pure TypeScript engine typechecking by removing the optimizer's dependency on the browser-only `performance` global.
- Added a scoped timeout to the aggregate 12-scenario preset calibration test so its default Vitest run completes without changing global test timeouts.
- Constrained Recharts containers in `EpidemicCharts.tsx` (`min-w-0`, `overflow-hidden`, `minWidth={0}`) so the trajectory SVG never bleeds into the adjacent `Strategy Fit` column on desktop reflow.
- Sanitized non-finite `budgetRatio` inputs in `computeWeeklyQuota` and `optimizeResourceAllocation` (`packages/engine/src/optimizer.ts`) to prevent `NaN` weekly quotas under adversarial parameters.
- Eliminated a MapLibre `isStyleLoaded()` synchronization race during rapid region/mode transitions and aborted-fetch false offline fallbacks during `Dark`/`Light` basemap switching in `SplitMapView.tsx`.
- Added spatial centroid collision avoidance to `selectPriorityBadgeDistrictIds` (`apps/web/src/lib/viewModels.ts`), dynamic `Pass`/`Review`/`Fail` status labels in `HeaderBar.tsx`, singular/plural grammar (`1 ward` / `1 hub`), non-wrapping `KpiStrip` figures, compact `YAxis` overflow formatting (`>= 1000 -> k`) in `EpidemicCharts.tsx`, and right scrollbar clearance on `SwapTracePanel.tsx`.

### Removed
- Removed unused pre-rename draft specification file (`gemini-code-1795430416191.md`) and its stale references.

---

## [0.2.0] - 2026-11-23 (Owner A Complete)

### Added
- `packages/engine/src/solver.ts`: Vectorized `Float64Array` RK4 ODE solver (`dt = 0.25`, 91-day horizon) for Vector-Borne SEIR-SEI and Direct-Contact SEIR, conservation-preserving clamping, 14-28 day unmitigated lookahead, and weekly checkpoint evaluation.
- `packages/engine/src/optimizer.ts`: Reactive baseline, Stage 1 multi-seed predictive initialization, Stage 2 checkpointed 2-week block swaps and 1-week swaps with Hospital Safety Guardrail, deterministic rationale tagging, and `swapTrace`.
- `packages/engine/src/gates.ts`: 5 deterministic Policy & Integrity Gates (`PASS` / `REVIEW` / `FAIL` + 0-100 readiness score).
- `apps/web/src/data/regions/`: Contiguous non-overlapping GeoJSON presets for `Metro Tropica` (18 districts) and `Harbor Corridor` (16 districts).
- `apps/web/src/services/weather.ts` & `export.ts`: Open-Meteo client with 3-second timeout and seasonal fallback climatology, plus RFC-4180 CSV and JSON run exporters.
- `apps/web/src/workers/optimizer.worker.ts` & `optimizerClient.ts`: Native ESM Web Worker with request-ID staleness protection.
- Integration and unit test suites across both workspaces (23/23 tests passing).

### Changed
- `packages/engine/src/mobility.ts`: Switched `hubCentrality` from row-normalized outflow to population-weighted incoming commuter flow ($\sum_{j \neq i} W_{ji} N_j / N_{\text{avg}}$) so central transit hubs separate cleanly from peripheral districts.

---

## [0.1.0] - 2026-11-23 (Foundation & Monorepo Setup)

### Added
- Initialized npm workspaces monorepo (`packages/engine` as `@sennagrid/engine`, `apps/web` as `@sennagrid/web`, `tsconfig.base.json`, `vercel.json`).
- Implemented foundational engine contracts (`types.ts`), gravity mobility matrix (`mobility.ts`), climate modulation curves (`climate.ts`), and initial Vitest suite (8 tests).
- Authored initial `docs/PRD.md` and `docs/BLUEPRINT.md`.
