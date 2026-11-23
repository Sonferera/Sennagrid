# SennaGrid Agent & Engineering Guidelines

Instruksi repositori ini berlaku untuk seluruh kontributor maupun coding agent yang bekerja pada workspace **SennaGrid**.

## 1. Architecture Boundaries
- `packages/engine` (`@sennagrid/engine`) **must remain pure TypeScript** with zero React, DOM, or browser API imports.
- `apps/web` (`@sennagrid/web`) runs 100% client-side with zero backend server or paid API key requirements.
- All numerical metrics, charts, map colors, and dispatch schedules must originate deterministically from `@sennagrid/engine`.

## 2. Mandatory Documentation Rule on Every Update
Every change touching `packages/` or `apps/` **must** include structured documentation updates before committing:
1. Update `docs/CHANGELOG.md` under `[Unreleased]`.
2. For feature additions, solver/optimizer adjustments, or architectural refactors, add a dated update note `docs/updates/YYYY-MM-DD-<kebab-case-slug>.md` using `docs/updates/TEMPLATE.md` with required headings: `## Summary`, `## Changes`, and `## Verification`.
3. Keep `docs/BLUEPRINT.md` and `docs/HANDOFF.md` synchronized whenever public types, equations, or service interfaces change.

## 3. Required Pre-Push Checks
Run and verify all checks before committing or pushing:
- `npm run check:docs`
- `npm run test`
- `npm run build`
