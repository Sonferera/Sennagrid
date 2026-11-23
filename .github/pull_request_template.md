## Summary

<!-- Explain what this PR changes and why -->

## Changes

- 

## Mandatory Documentation Checklist

Every PR touching `packages/` or `apps/` must satisfy these items before merge:

- [ ] Updated `docs/CHANGELOG.md` under `[Unreleased]`
- [ ] Added a dated update note in `docs/updates/YYYY-MM-DD-<slug>.md` (for new features, solver/optimizer updates, or architecture changes)
- [ ] Synced `docs/BLUEPRINT.md` and `docs/HANDOFF.md` if public types, math equations, or service contracts changed

## Verification

- [ ] `npm run check:docs` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
