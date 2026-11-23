# Changelog

Seluruh perubahan signifikan pada proyek **SennaGrid** dicatat secara kronologis di file ini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan wajib diperbarui pada setiap update kode di `packages/` atau `apps/`.

---

## [Unreleased]

### Added
- Structured documentation governance system (`docs/README.md`, `docs/CHANGELOG.md`, `docs/HANDOFF.md`, `docs/SUBMISSION_CHECKLIST.md`, `docs/updates/TEMPLATE.md`).
- Automated docs check script (`scripts/check-docs.mjs` via `npm run check:docs`), local Git pre-commit hook (`.githooks/pre-commit`), GitHub Actions CI (`.github/workflows/ci.yml`), PR template, `CONTRIBUTING.md`, `AGENTS.md`, `LICENSE` (MIT), and `.gitattributes`.
- Dated milestone update notes in `docs/updates/`.

### Changed
- Rewrote root `README.md` into the public SennaGrid project overview with verified benchmarks, quick start, and architecture documentation.
- Synchronized `docs/BLUEPRINT.md` with the implemented multi-seed Stage 1, hybrid block-swap/1-swap Stage 2 optimizer, and Hospital Safety Guardrail.

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
