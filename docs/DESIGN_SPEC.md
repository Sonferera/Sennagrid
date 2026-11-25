# SennaGrid Design Specification

**Document:** `DESIGN_SPEC.md`  
**Project:** SennaGrid  
**Scope:** UI/UX Design & Cartographic Interaction Specification  
**Status:** Approved (v3 Minimalist Spatial Workbench)
**Related documents:** [BLUEPRINT.md](./BLUEPRINT.md), [HANDOFF.md](./HANDOFF.md), [PRD.md](./PRD.md)

---

## 1. Visual Direction: Warm Editorial Paper

Following team design reviews in Google Stitch (`v3`) and readability refinements, SennaGrid uses a calm, glare-free **Warm Paper** spatial interface with large, comfortable typography (`14px`–`16px` UI prose, `16px` card headings, `32px`–`36px` impact figures):
- **Canvas & Surfaces:** Warm archival paper canvas (`#f5f2eb`), soft ivory cards (`#fbf9f5`), linen-sand inset wells (`#eee9df`), hairline warm stone borders (`#e0dbd0`), and soft-sepia MapLibre canvas toning (`.maplibregl-canvas`) to eliminate white-screen glare.
- **Typography Ink:** Warm deep charcoal (`#1c1917`, `16.63:1` on `#fbf9f5`), secondary stone (`#44403c`), and muted stone (`#57534e`, `7.26:1` on `#fbf9f5`).
- **Semantic Strategy Colors:**
  - **SennaGrid Optimized:** Deep Clinical Teal (`#0f766e` / `#0d9488`, `#115e59` on `#edf6f4`).
  - **Reactive Baseline:** Urgent Crimson Rose (`#be123c` / `#e11d48`, `#9f1239` on `#fbe3e7`).
  - **Caution / Strained / Trade-off:** Warm Amber (`#b45309`, `#92400e` on `#faecc8`).
  - **Verified Pass:** Emerald (`#065f46` on `#e9f5ef`).
- **Typography:** `Plus Jakarta Sans` for headings and interactive labels paired with `IBM Plex Mono` (`tabular-nums`) for metrics, equations, and schedules. Zero decorative emojis, zero em dashes, and zero raw ASCII arrows.

---

## 2. Information Architecture & Restraint

1. **Slim Top Bar (`HeaderBar` + `TabNav`):** `SennaGrid` wordmark with 2x2 mark, underline workspace tabs (`Simulator`, `Weekly Plan`, `Methodology`), `Tour`, and direct `5/5 Gates Pass` verification link.
2. **Focused Left Control Rail (`ControlBar`, `256px` desktop):** Exposes only the three primary decisions (`City Scenario`, `Dengue | Respiratory`, `Budget` slider + `Run Optimization`), tucking `Climate Forcing` (`Peak Season` vs `Live Open-Meteo`), `ICU Rate`, `Commuter Outflow`, `Team Efficacy`, and `Reset Defaults` cleanly inside the expandable `Parameters` disclosure.
3. **Unified 3-Column Impact Strip (`KpiStrip`):** Hairline-divided readout of `Hospital Collapse`, `Peak ICU Overflow`, and `Policy Gates & Trade-off` (with honest amber mild-case framing when present).
4. **Spacious Spatial Stage (`SplitMapView` + contextual `DistrictInspector` + `TimelinePlayer`):**
   - Full-width dual Carto Positron map panes (`Without SennaGrid` vs `With SennaGrid`) with non-overlapping priority key-ward badges (`Key Wards | All Wards | Off`), `Map | Watchlist` table switcher, click-to-inspect contextual `DistrictInspector` drawer strip, and slim attached playback bar (`Play/Pause`, Day scrubber, `Jump: Peak`, `1x / 2x / 4x`).
5. **Trajectory & Strategy Fit (`EpidemicCharts`):** Toggleable `ICU Overflow Trajectory` (`Overflow | Cases`) beside five horizontal `Strategy Fit (vs Reactive Baseline)` progress bars displaying exact engine scores.
6. **Weekly Plan & Methodology:** Calm pastel `H / S / I` 13-week coverage matrix (active wards default + toggle for all wards), paginated 5-column field assignment table with CSV/JSON exports, collapsed-by-default `SwapTracePanel` accordion, hairline 5-gate summary, 3 formula cards, and 5-step execution pipeline.
