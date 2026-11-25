# Update: Enforce Hospital Safety Guardrail on Stage 2 Cost-Dominance Fallback

- **Date:** 2026-11-25
- **Author / Role:** SennaGrid Team (Owner A Audit)
- **Scope:** `packages/engine`, `docs`
- **Related Commits / PR:** Current commit

## Summary

Fixed a subtle Stage 2 fallback edge case in `packages/engine/src/optimizer.ts` discovered via out-of-distribution (OOD) testing on unseen synthetic cities: the `bestCostDomSchedule` fallback previously recorded cost-dominating swap candidates even when those candidates violated the Hospital Safety Guardrail.

## Changes

- Updated `packages/engine/src/optimizer.ts` to gate both ICU-first acceptance and `bestCostDomSchedule` fallback tracking with `withinSafetyGuardrail` (`cand.totalOverflow <= maxAllowedOverflow && cand.collapseDays <= maxAllowedCollapseDays`).
- Added a deterministic 10-city (20-scenario) OOD regression test in `packages/engine/src/__tests__/optimizer.test.ts` verifying zero guardrail violations across both disease modes on unseen synthetic city topologies.
- Updated `docs/CHANGELOG.md` under `[Unreleased]`.

## Verification

- `npm run check:docs`: PASS
- `npm run test`: All workspace Vitest suites pass including the new OOD guardrail regression test.
- `npm run build`: Strict TypeScript typecheck and Vite static build pass with 0 errors.
