# SennaGrid

**Spatial Epidemic Digital Twin and Constrained Resource Optimizer**

SennaGrid is a client-side urban epidemic simulator and mathematical resource allocation workbench built for the **Code for Change (Global)** student hackathon. It helps municipal public health planners allocate scarce weekly interventions (vector control or targeted vaccination across 10% to 40% of city districts) by comparing standard reactive dispatch against network-aware predictive optimization under the exact same operational budget.

---

## Why SennaGrid

During urban disease outbreaks such as dengue or acute respiratory waves, district health offices rarely have the staffing or supply budget to intervene everywhere at once. Standard reactive policy prioritizes whichever districts report the highest current active cases. Because commuter networks couple districts together and hospital ICU capacities are uneven across cities, reactive allocation often lags behind transmission hubs and allows under-bedded wards to overflow.

SennaGrid runs a deterministic 91-day (13-week) compartmental ODE simulation inside a browser Web Worker so teams can compare standard reactive dispatch with network-aware predictive optimization under the same operational budget, with results focused on disease burden, cost, and hospital pressure.

---

## Core Capabilities

- **100% Client-Side Computation:** All RK4 ODE integration and optimization sweeps run locally in a native Web Worker using `Float64Array` typed arrays. Zero backend servers, zero cold starts, and zero paid API keys.
- **Two Spatial Disease Models:**
  - **Vector-Borne SEIR-SEI (Default):** Climate-modulated dengue/arbovirus transmission driven by daily temperature and 7-day rolling rainfall from the free Open-Meteo API, with silent fallback to bundled seasonal climatology.
  - **Direct-Contact SEIR:** Mobility-coupled respiratory transmission with targeted vaccination suppression.
- **Gravity Mobility Network:** Row-normalized Haversine commuter matrix $W \in \mathbb{R}^{N \times N}$ with incoming commuter hub centrality scoring.
- **Constrained Predictive Optimizer:** Combines receding-horizon multi-seed initialization with bounded multi-pass checkpointed coordinate descent (2-week sustained block swaps and 1-week swaps), ICU-overflow-first acceptance with objective-cost tie-breaking, a Hospital Safety Guardrail that never worsens ICU overflow above the reactive baseline, deterministic rationale tagging, an auditable swap trace, and engine-owned impact KPIs plus a five-axis radar.
- **5 Deterministic Policy & Integrity Gates:** Automated run verification covering ODE mass conservation (`< 1e-9`), weekly budget compliance, objective dominance, ICU collapse mitigation, and early mobility hub coverage.
- **Two Contiguous Urban Presets:** `Metro Tropica` (18 districts, tropical urban basin) and `Harbor Corridor` (16 districts, linear coastal corridor) with non-overlapping GeoJSON geometries.
- **Operational Exports:** Structured 13-week dispatch plans in RFC-4180 CSV and complete simulation runs in JSON.

---

## Repository Architecture (Monorepo)

SennaGrid uses npm workspaces to separate pure mathematical simulation code from the browser client:

```text
Sennagrid/
├── packages/
│   └── engine/          # @sennagrid/engine: pure TypeScript math (zero React/DOM)
│       └── src/         # types, mobility, climate, solver, optimizer, gates, tests
├── apps/
│   └── web/             # @sennagrid/web: Vite + React 19 + Tailwind v4 + MapLibre + Recharts
│       └── src/         # regions, weather/export services, Web Worker, store, UI components
├── docs/                # Structured product, architecture, handoff, and dated update logs
├── scripts/             # Automated documentation and repository verification scripts
├── .githooks/           # Local pre-commit hook enforcing documentation updates
├── .github/             # CI workflow and Pull Request template
├── package.json         # Root workspace orchestrator
├── tsconfig.base.json   # Shared strict TypeScript configuration
└── vercel.json          # Static deployment configuration (apps/web/dist)
```

---

## Quick Start

### Prerequisites
- Node.js 20+ (verified on Node v24.22.1)
- npm 10+

### Install and Verify
```bash
git clone https://github.com/Sonferera/Sennagrid.git
cd Sennagrid
npm install
npm run test
npm run build
```

### Enable Local Docs Enforcement Hook (Recommended for Contributors)
```bash
git config core.hooksPath .githooks
```

### Workspace Scripts
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server for `@sennagrid/web` with live HMR into `@sennagrid/engine` |
| `npm run test` | Run Vitest suites across both `@sennagrid/engine` and `@sennagrid/web` |
| `npm run test:watch` | Run `@sennagrid/engine` Vitest suite in watch mode |
| `npm run typecheck` | Run strict `tsc --noEmit` across engine and web workspaces |
| `npm run build` | Run full typecheck and build static production bundle (`apps/web/dist`) |
| `npm run check:docs` | Validate required documentation structure and update log naming rules |

---

## Verified Engine Benchmarks (Default Presets)

Measured directly via Vitest and Node verification on bundled fallback climatology:

| Preset & Mode | Budget | Solve Time | Cumulative Cases | ICU Overflow (Bed-Days) | Collapse Days | Cost Reduction | Policy Gates |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Metro Tropica** (`SEIR-SEI`) | 20% | `597 ms` | `51,110 -> 51,341` (`+0.45%`) | `16.8 -> 0.0` (`-100%`) | `5d -> 0d` | `0.33%` | `PASS (5/5, 100/100)` |
| **Metro Tropica** (`SEIR-SEI`) | 15% | `499 ms` | `70,541 -> 71,089` (`+0.78%`) | `208.3 -> 82.1` (`-60.6%`) | `13d -> 8d` | `1.20%` | `PASS (4/5, 88/100)` |
| **Harbor Corridor** (`Direct SEIR`) | 20% | `213 ms` | `557,073 -> 551,690` (`-0.97%`) | `292.4 -> 112.8` (`-61.4%`) | `17d -> 15d` | `1.56%` | `PASS (4/5, 82/100)` |
| **Harbor Corridor** (`Direct SEIR`) | 30% | `214 ms` | `529,634 -> 518,427` (`-2.12%`) | `18.1 -> 2.2` (`-87.7%`) | `7d -> 4d` | `2.86%` | `PASS (5/5, 100/100)` |

A positive cumulative-case percentage denotes an increase. ICU-first search can trade a small case increase for materially lower ICU pressure while still reducing objective cost.

---

## Documentation & Contribution Policy

Every code update under `packages/` or `apps/` **must** include matching documentation updates under `docs/` (verified automatically by `npm run check:docs`, `.githooks/pre-commit`, and GitHub Actions CI).

- [Documentation Index & Update Rules](./docs/README.md)
- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Technical Architecture & Math Blueprint](./docs/BLUEPRINT.md)
- [Changelog](./docs/CHANGELOG.md)
- [Owner A to Owner B Handoff Guide](./docs/HANDOFF.md)
- [Hackathon Submission Checklist](./docs/SUBMISSION_CHECKLIST.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

---

## License

Released under the [MIT License](./LICENSE).
