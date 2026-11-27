# SennaGrid Security Audit Report

## 1. Run identity, scope, and execution boundary

| Item | Value |
| --- | --- |
| Repository | `Sonferera/Sennagrid` |
| Source ref | commit `5b66aeacfe0af1c3febee938330f2365bdc7ea04`, branch `main`, clean worktree (verified again after the audit) |
| Profile | `standard` |
| Agent budget | none set |
| Companion attack files | `CLIENT-SIDE.md`, `SUPPLY-CHAIN-AND-RELEASE.md` |
| Prior audit ledger | none compatible; no carried same-source confirmations, no changed-source revalidations, no prior needs-validation leads |
| Run status | `complete` |

**Scope reviewed.** `packages/engine/src`, `apps/web/src`, `packages/engine/package.json`, `apps/web/package.json`, `package.json`, `package-lock.json`, `scripts`, `README.md`, `docs/BLUEPRINT.md`, `docs/HANDOFF.md`, plus `.github/workflows/ci.yml`, `.gitignore`, `apps/web/index.html`, and `vercel.json` as entry surfaces referenced from those paths.

**Publication.** This report and its companion artifacts were copied into the repository at `docs/security-audit/2026-11-27/` after the run finished, at the repository owner's request. The audit itself changed nothing under `packages/` or `apps/`; the publication step only adds files under `docs/`.

**Execution boundary (source-and-local-only, not sandboxed).** This session could not enforce the skill's required OS sandbox: no empty allowlisted environment, no external-network denial, no read-only target/toolchain mounts, no OS resource or wall-clock caps, and no race-safe descriptor-based artifact promotion. No WSL or container runtime was available. Therefore **no target-controlled code was executed**: every check in the ledger is `method: "source"` with `artifact: null`. No deployed endpoint was probed, no credentials were used, no external or shared service was contacted, and the target repository was not modified. `npm run typecheck`, `npm run test`, `npm run build`, and `npm run check:docs` were therefore **not** run by this audit, so the repository's own build and test suite is outside this run's evidence.

**Platform adaptation.** The skill's validators refuse to open inputs on Windows because `fs.constants.O_NOFOLLOW` and `O_NONBLOCK` are unavailable there. The parent ran an equivalent Windows-safe wrapper (`validate-windows.cjs`) that opens only parent-owned regular files, rejects symlinks, verifies path containment and stable file identity, and then calls the validators' own exported `validateDocument` / `preflightJsonText` functions. The skill files themselves were not modified.

**Agents spent versus planned.** 19 agent sessions were used: 4 reconnaissance (product/stack, trust boundaries, entry surfaces, local execution and deployment visibility), 5 hunters (4 in wave 1 covering 15 units, 1 in wave 2 covering 3 reassigned units), 3 coverage critics (post-wave 1, post-wave 2, final-clean), and 7 candidate verifiers. No Phase-5 record verifier was required, because no record was retained as `confirmed` or `needs_validation`.

**Verifier payloads discarded, not repaired.** Four verifier payloads were discarded as malformed or non-conforming and re-run with fresh verifier sessions: `verifier_1` (severity shape did not match the confirmed branch), `verifier_2` (rejected record missing `verdict`/`reason` and carrying forbidden fields), `verifier_3` (schema-valid but its own record called the behavior intentional and proposed a behavior-preserving fix), and `verifier_5` (multi-step trace ended with `propagation` instead of `sink`). The accepted independent validations are `verifier_4`, `verifier_6`, and `verifier_7`.

**Deferred and out-of-scope coverage.** No unit was deferred, blocked, or marked out of scope. Excluded by construction: web protocol/auth and cloud/deployment companions (no server session, identity provider, API, infrastructure code, or privileged runtime configuration exists), protocol/RPC, data-isolation/lifecycle, desktop/mobile/local-IPC, and memory-safety companions (their source-visible preconditions do not exist). Third-party provider internals (Open-Meteo, MapLibre GL, Google Fonts) and the Vercel/GitHub hosting platforms themselves were not audited.

## 2. Security posture summary

SennaGrid is a browser-only, anonymous, client-side simulator whose attack surface is small and well-bounded: one fixed-host weather request, one typed data-only Web Worker, one theme value in `localStorage`, local CSV/JSON downloads, and a pull-request CI workflow with no secrets or deployment. Across 15 coverage units and 40 source checks, no security invariant failure was established. The three candidate leads raised in wave 1 were re-reviewed by a fresh owner and then independently refuted by fresh verifiers against source-visible preventing layers or documented intended behavior.

## 3. Confirmed findings

**None.** No source-grounded vulnerability survived independent validation, so no severity, affected principal, reproduction, or remediation is reported here.

| Severity | Title | Affected boundary | Observed result |
| --- | --- | --- | --- |
| — | — | — | — |

## 4. Needs-validation leads

**None.** No candidate remained blocked on a decisive deployment or runtime fact: every lead was resolvable from repository source alone, and each resolved to a rejection.

| Lead | Repository trace | Exact blocker | Bounded local next step | Owner-observed deployment check |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

## 5. Rejected leads (coverage decisions, not findings)

These fingerprints are listed only because they explain the wave-1 → wave-2 coverage decision. None is a finding.

| Fingerprint | Raised by | Disposition | Source-grounded reason |
| --- | --- | --- | --- |
| `clampbudget_nan_invariant` | `hunter_2` (wave 1) | rejected by `verifier_4` | `clampBudget` does lack a finite-number guard, but the only caller of `setBudgetRatio` is the `ControlBar` range input (`min=10`, `max=40`, `step=5`, `apps/web/src/components/layout/ControlBar.tsx:228-238`), the store signature is typed `number` (`apps/web/src/store/useSimulationStore.ts:84`), and the engine neutralizes any non-finite value with `Number.isFinite(params.budgetRatio)` at `packages/engine/src/optimizer.ts:392`. |
| `engine-dep-workspace-eval` | `hunter_4` (wave 1) | rejected by `verifier_7` | The wildcard range in `apps/web/package.json:15` does not override the recorded resolution: `package-lock.json:1368-1371` binds `@sennagrid/engine` to `packages/engine` with `"link": true`, and CI installs with `npm ci` (`.github/workflows/ci.yml:25`), which installs the locked resolution. |
| `policygate_overallstatus_invariant` | `hunter_2` (wave 1) | rejected by `verifier_6` | The tri-status rule in `packages/engine/src/gates.ts:127-132` (PASS requires cost dominance; REVIEW otherwise) is the documented intended behavior (`docs/BLUEPRINT.md:355-362`), and the proposed fix in the earlier record preserved the same outcome, so no invariant failure was demonstrated. |

## 6. Hardening notes

These are non-finding recommendations recorded by hunters and the parent in the coverage ledger.

1. **CI permissions (hunter_4).** The workflow declares no explicit `permissions:` block, so repository defaults apply. No repository secrets are used today, so the exposure is theoretical unless secrets are added later.
2. **Action pinning (parent).** `.github/workflows/ci.yml:14,20` references `actions/checkout@v4` and `actions/setup-node@v4` by mutable major-version tag. Pinning full commit SHAs would reduce tag-movement risk in a privileged workflow.
3. **Deployment install command (parent).** `vercel.json:3` sets `installCommand` to `npm install` rather than `npm ci`, so a deployment build may update the lockfile instead of installing exactly the audited resolution.
4. **Repository hygiene (hunter_4).** No secret or debug files are tracked, and `.gitignore` covers the standard patterns; no credential exposure exists today.
5. **Parameter normalization (hunter_5).** `icuRate` is clamped to ≥ 0, `interventionEfficacy` to `[0,1]` or the mode default, and `budgetRatio` to `[0.1, 0.4]` before the engine consumes it.
6. **Dependency resolution (hunter_5).** Workspace links resolve locally; no unbounded registry references were found in the audited manifests.
7. **Policy-gate schema (hunter_5).** The five gates carry explicit thresholds and a weighted readiness score consistent with `docs/BLUEPRINT.md`.

## 7. Positive source patterns

- **Outbound HTTP is pinned and parsed defensively.** The weather request targets a fixed `api.open-meteo.com` host with numeric parameters encoded through `URLSearchParams` (`apps/web/src/services/weather.ts`), and the response path length-checks arrays, sanitizes values to finite non-negative numbers, and falls back to bundled climatology on malformed data.
- **The worker boundary is data-only.** `WorkerRunRequest` carries typed data only; the worker uses no network, DOM, storage, filesystem, or dynamic evaluation, and stale results are rejected through request IDs and run tokens (`apps/web/src/workers/optimizerClient.ts`, `apps/web/src/workers/optimizer.worker.ts`).
- **No unsafe rendering sink was found.** React escapes rendered text, map markers are written with `textContent`, and MapLibre receives GeoJSON and feature state rather than HTML (`apps/web/src/components/simulator/SplitMapView.tsx`).
- **Exports are scoped and escaped.** CSV cells are quoted with embedded quote doubling and JSON is serialized from typed engine output; downloads contain only the current local run (`apps/web/src/services/export.ts`).
- **Browser storage holds no sensitive or authorization state.** Only the theme is persisted, and the value is allowlisted to `dark`/`light` with try/catch around storage access.
- **CI is narrow and secret-free.** The workflow runs `npm ci`, documentation checks, tests, and a build, with no deployment, publication, signing, or secret usage, and it runs on `push`/`pull_request` for `main` only.
- **The engine defends its own inputs.** `optimizeResourceAllocation` normalizes a non-finite `budgetRatio` to the default and the solver normalizes ICU rate, efficacy, and horizon-sensitive values before simulation.

## 8. Coverage summary

| Metric | Count |
| --- | --- |
| Coverage units | 15 |
| Covered | 15 |
| Candidate (unresolved) | 0 |
| Blocked | 0 |
| Deferred / out of scope | 0 |
| Archived wave-1 attempts | 3 |
| Source checks recorded | 40 |
| Distinct repository paths reviewed | 25 |
| Confirmed findings | 0 |
| Needs-validation leads | 0 |
| Rejected leads | 3 |

**Wave history.** Wave 1 (four hunters) closed all 15 units and produced three candidate leads. The post-wave critic requested reassignment of exactly those three units, so their wave-1 terminal records were archived in the ledger's `attempts` and the units were re-run by a fresh owner in wave 2 (`hunter_5`), which closed all three as covered with no new candidates. The post-wave-2 critic returned `stop: true` with no missing units and no reassignments, and the distinct final-clean critic independently returned `stop: true` with no missing units and no reassignments. Coverage is therefore complete within the declared scope: **no source-visible surface, lifecycle mode, selected companion class, or fallback path was left uncovered**, and no excluded companion domain had a source-visible precondition in this repository.
