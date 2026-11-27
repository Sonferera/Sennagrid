# Update: Smooth 60 FPS Map Color Transitions, Spread Cascade & Fade-In/Fade-Out Dispatch Boxes

- **Date:** 2026-11-28
- **Author / Role:** Irfan (`Sonferera`) / Full-Stack Engine & UI
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** `feat/balekerta-map-and-spread-animation`

## Summary

Preserved SennaGrid's high-legibility Carto Dark Matter / Carto Positron split maps while upgrading map motion to smooth 60 FPS spread-only color transitions, deterministic ring-by-ring epicenter spread cascades, one-click `Replay D0`, and smooth opacity fade-in/fade-out on active rose/teal dispatch outline boxes across weekly schedule shifts.

## Changes

- `apps/web/src/lib/viewModels.ts`: added `DistrictSpreadCell`, `DistrictSpreadWavePlan`, and `buildDistrictSpreadWavePlan` computing deterministic epicenter-outward ring order (`hop 0..maxHop`) from `@sennagrid/engine` daily stress and gravity coupling `W_ij`.
- `apps/web/src/components/simulator/SplitMapView.tsx`:
  - Kept the clean original Carto Dark Matter (Dark) and Carto Positron (Light) basemaps, calibrated stress color ramps, offline fallback, tooltips, and `Commuter Flows: On / Off` toggle.
  - Added 60 FPS smooth color gliding (`tau = 185ms`) during timeline playback and day scrubbing plus one-shot staggered ring-by-ring spread cascades (`outQuad`) on city switches, optimization runs, and large jumps, with subtle arrival highlights when wards climb severity tiers.
  - Upgraded active rose (`Without SennaGrid`) and teal (`With SennaGrid`) dispatch marker boxes from instant snapping to gentle opacity fade-in and fade-out (`treatedWeight`, `tau = 250ms`) with matching soft glow halos (`districts-treated-glow` + `districts-treated-outline`).
  - Automatically sleeps the animation loop (`0%` idle CPU) as soon as colors, flashes, and fades settle, and snaps statically under `prefers-reduced-motion: reduce`.
- `apps/web/src/components/simulator/TimelinePlayer.tsx`: added one-click `Replay D0` button and auto-restart from Day 0 when pressing Play at Day 91.
- `apps/web/src/index.css`, `apps/web/src/components/onboarding/guideCatalog.ts`, `apps/web/src/lib/__tests__/viewModels.test.ts`, `docs/CHANGELOG.md`, and `docs/DESIGN_SPEC.md`: added smooth CSS color/border transitions on `.sg-ward-marker`, synchronized Guide & 10-step Live Tour copy, added unit tests for spread ring ordering, and updated specifications.

## Verification

- `npm run check:docs` and `node scripts/check-docs.mjs --base origin/main`: PASS (zero em-dashes in source files)
- `npm run test`: PASS (`81/81` tests passed: `@sennagrid/engine` `43/43` in `7.71s`, `@sennagrid/web` `38/38` in `8.63s`, including `buildDistrictSpreadWavePlan` ring-order unit coverage)
- `npm run build`: PASS (`tsc --noEmit` clean for both workspaces + `vite build` finished in `6.76s`)
- Catatan pengujian manual / browser: Verified live on `http://localhost:5173/` across Desktop `1440x900` (Obsidian Dark `Metro Tropica` + Warm Paper Light `Harbor Corridor`) and Mobile `390x844` (`0` horizontal overflow, `0` console errors, `0` uncaught page errors, `50/50` network requests OK). Confirmed clean Carto basemap readability, smooth 60 FPS color transitions and spread cascade on `Replay D0` and `Jump: Peak`, pure opacity fade-in/fade-out on rose/teal active team outline boxes with zero sliding boxes, `Commuter Flows` toggle, and hover tooltip clarity (`final_step_68.png`).
