# SennaGrid Security Audit Architecture

## Run identity

- Repository: `Sonferera/Sennagrid`
- Target: `C:\Users\User\Downloads\Workspace\Sennagrid`
- Source ref: `5b66aeacfe0af1c3febee938330f2365bdc7ea04` on `main` (clean worktree)
- Profile: `standard`; no user agent budget; no compatible prior audit ledger
- Execution policy: source and local-only. This session cannot enforce an empty allowlisted environment, network isolation, read-only target/toolchain mounts, or OS-level resource limits. It also lacks race-safe descriptor-based artifact promotion. Target-controlled execution is therefore prohibited; decisive dynamic claims must be `needs_validation`.

## Product, principals, authority, and protected resources

SennaGrid is a browser-only spatial epidemic digital twin and constrained resource optimizer. `packages/engine` is a pure TypeScript ODE/mobility/optimizer package; `apps/web` is a React 19, Vite 6, MapLibre GL, Recharts, and Zustand SPA. Deployment is a static Vercel bundle (`vercel.json:1-6`); there is no backend, user account, tenant, payment, or privileged server-side action.

The browser user is the only ordinary actor. By design they may select a bundled preset, alter simulation parameters, run the optimizer in a dedicated worker, inspect results, and download CSV/JSON. The Web Worker is a data-only compute boundary, not an authenticated peer. Protected resources are simulation and policy-gate integrity, operational export contents, browser-origin persistence, static deployment integrity, and CI/release integrity. The product is anonymous by design, so missing authentication is not itself a defect.

## Source-visible deployment and entry paths

- Browser entry: `apps/web/src/main.tsx` -> `apps/web/src/App.tsx` -> React components and Zustand store.
- Engine entry: `packages/engine/src/index.ts`; public callers include the web worker.
- External HTTP: `apps/web/src/services/weather.ts:74-129` performs a fixed-host Open-Meteo GET and parses JSON. Remote MapLibre style JSON and Google Fonts are also loaded by the browser (`apps/web/src/components/simulator/SplitMapView.tsx:25-27`, `apps/web/index.html:18-23`).
- Worker message: `apps/web/src/workers/optimizerClient.ts:23-89` -> `apps/web/src/workers/optimizer.worker.ts:9-30` -> `packages/engine/src/optimizer.ts:386`.
- Browser persistence: theme only, in `apps/web/index.html:10-17` and `apps/web/src/store/useSimulationStore.ts:27-47`.
- Downloads: `apps/web/src/components/schedule/DispatchSchedule.tsx` -> `apps/web/src/services/export.ts:11-114`.
- Build/CI: `package.json:10-21`, `package-lock.json`, `.github/workflows/ci.yml:1-38`; pull requests run `npm ci`, repository scripts, tests, and build without deployment or explicit secrets.

No file import, plugin, RPC server, cloud event, native bridge, local daemon, or local IPC surface exists. Bundled region GeoJSON is generated at build/runtime by deterministic TypeScript (`apps/web/src/data/regions/meshBuilder.ts`), not uploaded or parsed from an untrusted file.

## Trust boundaries and strongest controls

1. **User -> simulation configuration -> engine.** Presets constrain district identity; UI/store clamps budget; solver normalizes ICU rate, mobility outflow, efficacy, and horizon-sensitive values. This is same-principal integrity, not authorization.
2. **Main thread -> Web Worker.** Typed, data-only `WorkerRunRequest`; request IDs and store tokens reject stale results. The worker uses no network, DOM, storage, filesystem, or dynamic evaluation.
3. **Open-Meteo response -> climate engine.** Fixed URL host and preset coordinates; response arrays are length-checked, numeric values are sanitized, malformed data falls back to bundled climatology.
4. **Engine result -> UI/map/export.** React escapes rendered text; MapLibre receives GeoJSON and feature state; marker labels use `textContent`; CSV cells are quoted; JSON is serialized from typed output. No unsafe HTML sink was found in reconnaissance.
5. **Browser storage -> document theme.** Storage value is allowlisted to `dark`/`light`; no sensitive or authorization state is stored.
6. **Repository/PR -> CI.** Pull-request code runs in GitHub Actions after `npm ci`; workflow declares no secrets, write permissions, deployment, package publication, or release signing.

## Offline build/test limits and comparable baseline

Local dependencies are present, and `npm run typecheck`, `npm run test`, `npm run build`, and `npm run check:docs` are the relevant offline commands, but the required OS-enforced sandbox is unavailable, so this audit does not execute them. No source-grounded comparable product with a meaningful security trade-off is present; Open-Meteo and MapLibre are providers/libraries, not architectural baselines.

## Starting paths and companion selection

Start at `packages/engine/src/index.ts`, `packages/engine/src/{solver,mobility,climate,optimizer,gates}.ts`, `apps/web/src/{main.tsx,App.tsx}`, `apps/web/src/store/useSimulationStore.ts`, `apps/web/src/services/{weather,export}.ts`, `apps/web/src/workers/`, `apps/web/src/components/simulator/SplitMapView.tsx`, `apps/web/src/data/regions/`, `apps/web/index.html`, `.github/workflows/ci.yml`, package manifests, and the lockfile.

`CLIENT-SIDE.md` is selected for DOM/map rendering and browser-storage boundaries. `SUPPLY-CHAIN-AND-RELEASE.md` is selected for CI and dependency-resolution boundaries. Web protocol/auth and cloud/deployment companions are excluded because the repository has no server session, identity provider, API, infrastructure code, or privileged runtime configuration. Protocol/RPC, data-isolation/lifecycle, desktop/mobile/local-IPC, and memory-safety companions are excluded because their source-visible preconditions do not exist.
