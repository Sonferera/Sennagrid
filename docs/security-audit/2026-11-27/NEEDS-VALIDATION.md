# Needs Validation

Prioritized leads whose decisive validation was blocked, each with its source trace, verified evidence, exact blocker, affected boundary, and bounded resolution plan.

**No unresolved lead remains.** The independent validation pass produced no `needs_validation` record (see `REPORT.md` §4). All three leads raised in wave 1 were resolvable from repository source alone and were independently rejected rather than parked as unresolved leads:

| Fingerprint | Affected boundary | Resolution outcome |
| --- | --- | --- |
| `clampbudget_nan_invariant` | `apps/web/src/store/useSimulationStore.ts#setBudgetRatio` -> `packages/engine/src/optimizer.ts#safeBudgetRatio` | Rejected: the only caller supplies a bounded numeric range value, and the engine applies a finite-number fallback. |
| `engine-dep-workspace-eval` | `apps/web/package.json#dependencies.@sennagrid/engine` -> `package-lock.json#node_modules/@sennagrid/engine` | Rejected: the lockfile binds the package to the local workspace with `"link": true`, and CI installs with `npm ci`. |
| `policygate_overallstatus_invariant` | `packages/engine/src/gates.ts#evaluatePolicyGates` -> `packages/engine/src/optimizer.ts#evaluatePolicyGates call` | Rejected: the tri-status rule matches the documented intended behavior in `docs/BLUEPRINT.md`. |

No owner-observed deployment check is requested, because no remaining claim depends on a deployment, configuration, or runtime fact that source cannot settle.
