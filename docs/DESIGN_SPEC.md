# SennaGrid Design Specification

**Document:** `DESIGN_SPEC.md`  
**Project:** SennaGrid  
**Scope:** UI/UX Design & Cartographic Interaction Specification  
**Status:** Approved (v3 Minimalist Spatial Workbench)
**Related documents:** [BLUEPRINT.md](./BLUEPRINT.md), [HANDOFF.md](./HANDOFF.md), [PRD.md](./PRD.md)

---

## 1. Visual Direction: Precision Editorial Light

Following team design reviews in Google Stitch (`v3`), SennaGrid uses a calm, high-legibility light spatial interface inspired by public-health telemetry journals (*Our World in Data*) and precision analytical tools:
- **Canvas & Surfaces:** Cool alabaster canvas (`#f8fafc`), flat white cards (`#ffffff`) framed by `1px solid #e2e8f0` hairline dividers, and muted controls (`#64748b` >= `4.76:1` WCAG AA).
- **Semantic Strategy Colors:**
  - **SennaGrid Optimized:** Deep Clinical Teal (`#0f766e` / `#0d9488`, `#115e59` on `#f0fdfa`).
  - **Reactive Baseline:** Urgent Crimson Rose (`#be123c` / `#e11d48`, `#9f1239` on `#ffe4e6`).
  - **Caution / Strained / Trade-off:** Warm Amber (`#b45309`, `#92400e` on `#fef3c7`).
  - **Verified Pass:** Emerald (`#065f46` on `#ecfdf5`).
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
