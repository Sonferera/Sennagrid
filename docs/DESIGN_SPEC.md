# SennaGrid Design Specification

**Document:** `DESIGN_SPEC.md`  
**Project:** SennaGrid  
**Scope:** UI/UX Design & Cartographic Interaction Specification  
**Status:** Approved (v5 Obsidian Dark Default + Sticky Navigation & Editorial Footer)  
**Related documents:** [BLUEPRINT.md](./BLUEPRINT.md), [HANDOFF.md](./HANDOFF.md), [PRD.md](./PRD.md)

---

## 1. Visual Direction: Obsidian Dark (Default) & Warm Editorial Paper

Following team design reviews in Google Stitch (`v5`), SennaGrid defaults to a glare-free **Obsidian Dark** theme (`data-theme="dark"`) with an instant persisted **Warm Paper Light** switch (`data-theme="light"`), paired with generous readability (`14px`–`16px` UI prose, `16px` card headings, `32px`–`36px` impact figures):

- **Obsidian Dark (Default, `:root` / `data-theme="dark"`):**
  - **Canvas & Surfaces:** Warm obsidian canvas (`#121110`), charcoal cards & sticky navbar (`#1a1917`), grounded footer (`#161513`), inset wells (`#24221f`), hairline stone borders (`#2f2c27`), interactive control borders (`#756e65`), and Carto Dark Matter basemaps.
  - **Typography Ink:** Soft parchment primary ink (`#f3efe6`, `15.31:1` on `#1a1917`), warm ivory secondary (`#d6d0c4`, `11.44:1`), and warm stone muted text (`#a8a29e`, `6.97:1`).
  - **Semantic Strategy Colors:** Seafoam Teal (`#2dd4bf` accent ink, `#0f766e` CTA fill), Coral Rose (`#fb7185`), Warm Amber (`#fbbf24`), and Safe Emerald (`#34d399` dot / `#6ee7b7` ink).
- **Warm Paper Light (`data-theme="light"`):**
  - Archival paper canvas (`#f5f2eb`), soft ivory cards (`#fbf9f5`), linen-sand inset wells & footer (`#eee9df`), warm charcoal ink (`#1c1917`), Carto Positron basemaps with soft sepia toning, and Clinical Teal (`#0f766e`) / Crimson Rose (`#be123c`) / Amber (`#b45309`).
- **Typography:** `Plus Jakarta Sans` for headings and interactive labels paired with `IBM Plex Mono` (`tabular-nums`) for metrics, equations, and schedules. Zero decorative emojis, zero em dashes, and zero raw ASCII arrows.

---

## 2. Information Architecture & Restraint

1. **Sticky Top Navbar (`HeaderBar` + `TabNav`):** `56px` sticky header (`sticky top-0 z-40` with translucent blur) paired with custom 2x2 SVG favicon (`apps/web/public/favicon.svg`), featuring the `SennaGrid` 2x2 wordmark, underline workspace tabs (`Simulator`, `Weekly Plan`, `Methodology`), **Obsidian Dark / Warm Paper Light** theme toggle button, `Guide` (full searchable 14-card feature & scenario reference modal), `Live Tour` (10-step cross-tab precision spotlight walkthrough), and direct `5/5 Gates Pass` verification link.
2. **Focused Full-Height Left Control Rail (`ControlBar`, `284px` desktop):** Stretches cleanly alongside the right workspace (`lg:items-stretch`) so both columns align at the bottom edge, presenting `City Scenario` (4 calibrated urban presets plus `Simulate Any City` global Open-Meteo geocoding search with transparent normalized-grid caption), `Dengue | Respiratory`, `Budget` slider, `Run Optimization`, always-visible `Model Parameters` (`Climate Forcing`, `ICU Rate`, `Commuter Outflow`, `Team Efficacy`, `Reset Defaults`), and an anchored run summary block (`Horizon`, `Solver`, `City Beds`).
3. **Unified 3-Column Impact Strip (`KpiStrip`):** Hairline-divided readout of `Hospital Collapse`, `Peak ICU Overflow`, and `Policy Gates & Trade-off`.
4. **Spacious Spatial Stage (`SplitMapView` + contextual `DistrictInspector` + `TimelinePlayer`):**
   - Full-width dual synchronized map panes (`Without SennaGrid` vs `With SennaGrid`) switching dynamically between Carto Dark Matter (`dark`) and Carto Positron (`light`), non-overlapping priority key-ward badges (`Key Wards | All Wards | Off`), `Map | Watchlist` table switcher, click-to-inspect contextual `DistrictInspector` strip, tactile map toolbar buttons, and slim attached playback bar (`Play/Pause`, Day scrubber, `Jump: Peak`, `1x / 2x / 4x`).
5. **Trajectory & Strategy Fit (`EpidemicCharts`):** Bounded `min-w-0` / `overflow-hidden` `ICU Overflow Trajectory` (`Overflow | Cases`) beside five horizontal `Strategy Fit (vs Reactive Baseline)` progress bars calibrated to dark & light chart strokes.
6. **Weekly Plan & Methodology:** Theme-calibrated pastel `H / S / I` 13-week coverage matrix, paginated 5-column field assignment table with CSV/JSON exports, collapsed-by-default `SwapTracePanel` accordion, hairline 5-gate summary, 3 formula cards, and 5-step execution pipeline.
7. **Grounded 3-Column Web Footer (`Footer`):** Distinct `#161513` (`#eee9df` light) surface anchored below `<main>` presenting the SennaGrid summary, `Engine & Scope` metadata, vertical `Workspace` buttons (jumping directly to tabs or Guided Tour), and the bottom MIT License + research scope baseline bar.
