# Update: Custom Browser Favicon, Searchable Feature Guide, and 8-Step Live Tour

- **Date:** 2026-11-27
- **Author / Role:** Irfan (`Sonferera`) / Owner B UI & Onboarding
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** `feat/favicon-and-feature-guide`

## Summary

Added a sharp 2x2 SennaGrid browser tab favicon and redesigned the onboarding experience into two synchronized tools: a searchable **Feature & Function Guide** (`FeatureGuideModal.tsx`) documenting every tool, control, chart, export, equation, and shortcut in SennaGrid, paired with an upgraded **8-Step Interactive Live Tour** (`InteractiveTour.tsx`) that highlights every workspace panel across all three tabs.

## Changes

- Created crisp vector favicon `apps/web/public/favicon.svg` matching the 2x2 SennaGrid `#0f766e` / `#fbf9f5` / `#5eead4` mark and linked it in `apps/web/index.html` alongside `<meta name="theme-color" content="#121110" />`.
- Authored unified metadata catalog `apps/web/src/components/onboarding/guideCatalog.ts` defining 8 ordered `LIVE_TOUR_STEPS` (`header-bar`, `control-bar`, `kpi-strip`, `split-map`, `timeline-player`, `epidemic-charts`, `dispatch-export`, `methodology-gates`), 12 `FEATURE_GUIDE_ITEMS` across 6 workspace categories, `KEYBOARD_SHORTCUTS`, and search/filter helpers.
- Built `apps/web/src/components/onboarding/FeatureGuideModal.tsx` with category tabs, live keyword search, empty reset state, plain-language workflow overview (`Without SennaGrid` vs `With SennaGrid`), direct `Open on Workspace` flash navigation, `Spotlight Step` deep-links, and keyboard shortcuts reference.
- Upgraded `apps/web/src/components/onboarding/InteractiveTour.tsx` from 4 steps to 8 cross-tab spotlight steps with clickable progress pills (`1..8`), per-panel control breakdowns, pro tips, sticky-header-safe `scroll-mt-20` scroll positioning, and one-click `Full Guide` switch.
- Extended `useSimulationStore.ts` (`guideOpen`, `openGuide`, `closeGuide`, step-indexed `openTour(initialStep?)`, 8-step `setTourStep` auto tab routing), exposed `Guide` and `Live Tour` buttons in `HeaderBar.tsx` and `Footer.tsx`, wired `data-tour` + `scroll-mt-20` targets across components, and updated `App.tsx` keyboard handlers (`Escape` closing Guide cleanly).
- Added unit tests in `apps/web/src/components/onboarding/__tests__/guideCatalog.test.ts` and `apps/web/src/store/__tests__/useSimulationStore.test.ts`.

## Verification

- `npm run check:docs`: PASS (and `node scripts/check-docs.mjs --base origin/main`: PASS)
- `npm run test`: 76/76 PASS (`43` `@sennagrid/engine` across 5 files + `33` `@sennagrid/web` across 6 files, including `guideCatalog.test.ts` and `useSimulationStore.test.ts` Guide/Tour orchestration)
- `npm run build`: PASS (`tsc --noEmit` across `@sennagrid/engine` & `@sennagrid/web` + Vite production build in `6.84s`)
- Catatan pengujian manual / browser: Verified live at `http://127.0.0.1:5173/` across Desktop (`1440x900`) and Mobile (`390x844`) with 0 console/page errors, `/favicon.svg` returning HTTP 200 with 2x2 SVG markup, Feature Guide category/search filtering + reset empty state + workspace cross-navigation, 8-step Live Tour cross-tab spotlighting (`Simulator` -> `Weekly Plan` -> `Methodology`) + symmetric mobile `16px` dialog margins (`leftMargin = 16px`, `rightMargin = 16px`), and Obsidian Dark / Warm Paper Light theme compatibility.
