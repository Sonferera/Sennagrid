# Update: Obsidian Dark Default Theme, Sticky Navbar & Grounded Web Footer

- **Date:** 2026-11-25
- **Author / Role:** Irfan & Pradipta Arya (Minimalist UI Redesign v5)
- **Scope:** `apps/web` | `docs`
- **Related Commits / PR:** Branch `feat/ui-stitch-precision`

## Summary

Applied the approved Stitch **Dark v5** design system across `@sennagrid/web`, making the glare-free **Obsidian Dark** palette the default theme while preserving **Warm Paper Light** as an instant persisted toggle, pinning the top `HeaderBar` during vertical scroll (`sticky top-0 z-40`), and replacing the old single-line caption with a structured 3-column web `Footer`.

## Changes

- **Obsidian Dark Default & Pre-Paint Theme Store (`index.html`, `index.css`, `useSimulationStore.ts`, `useSimulationStore.test.ts`):**
  - Added semantic CSS custom properties (`--sg-*`) in `index.css` defining Obsidian Dark (`#121110` canvas, `#1a1917` surface, `#161513` footer, `#24221f` inset wells, `#f3efe6` / `#a8a29e` ink, `#2dd4bf` teal, `#fb7185` rose, `#fbbf24` amber) as `:root` default and Warm Paper Light under `html[data-theme="light"]`.
  - Added pre-paint `<script>` hydration in `index.html` plus `theme`, `setTheme`, and `toggleTheme` in `useSimulationStore.ts` (persisted safely under `localStorage['sennagrid-theme']`) with Vitest coverage in `useSimulationStore.test.ts`.
- **Sticky Navigation Bar & 3-Column Editorial Web Footer (`HeaderBar.tsx`, `Footer.tsx`, `App.tsx`):**
  - Pinned `HeaderBar` at the top viewport edge (`sticky top-0 z-40 backdrop-blur-md`) with a tactile `Dark / Light` theme toggle button alongside `? Tour` and `5/5 Gates Pass`.
  - Created `apps/web/src/components/layout/Footer.tsx` featuring the SennaGrid summary, `Engine & Scope` metadata, vertical `Workspace` buttons wired to `setActiveTab` and `openTour`, and the MIT License + synthetic benchmark research scope bar.
- **Dark-Calibrated Cartography, Charts & Subviews (`SplitMapView.tsx`, `EpidemicCharts.tsx`, `ControlBar.tsx`, `KpiStrip.tsx`, `DistrictInspector.tsx`, `TimelinePlayer.tsx`, `DispatchSchedule.tsx`, `SwapTracePanel.tsx`, `PolicyGatesPanel.tsx`, `MethodologyView.tsx`, `InteractiveTour.tsx`):**
  - Updated `SplitMapView.tsx` to use Carto Dark Matter tiles (`dark-matter-gl-style`) and calibrated dark choropleth/outline colors in Dark mode while switching dynamically to Carto Positron in Light mode without breaking district feature states or markers.
  - Updated `EpidemicCharts.tsx` SVG gridlines, axis strokes, tick labels, and area strokes/fills to adapt cleanly between Dark and Light modes, and converted all workspace components to `--sg-*` theme tokens.

## Verification

- Contrast ratio audit via `contrast-check.py`: all Obsidian Dark text pairings >= `4.77:1` WCAG AA PASS (`#f3efe6` on `#1a1917` = `15.31:1`, `#a8a29e` on `#161513` = `7.24:1`, `#2dd4bf` on `#1a1917` = `9.44:1`), interactive borders `#756e65` on `#1a1917` = `3.49:1` WCAG 1.4.11 PASS.
- `npm run check:docs`: PASS
- `npm run test`: PASS (see verification log)
- `npm run build`: PASS (typecheck + Vite production bundle)
- Live browser QA (`http://localhost:5173/`): verified Obsidian Dark default rendering, sticky header scroll pinning, Carto Dark Matter choropleth & priority badges, 3-column `Footer` navigation links, Light/Dark live theme toggle across Simulator / Weekly Plan / Methodology tabs, Tablet (`900x800`) and Mobile (`390x844`) responsiveness, `0` horizontal overflow, and `0` console errors.
