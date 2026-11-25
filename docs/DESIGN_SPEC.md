# SennaGrid Design Specification

**Document:** `DESIGN_SPEC.md`  
**Project:** SennaGrid  
**Scope:** UI/UX Design & Cartographic Interaction Specification  
**Status:** Approved (v2 Clean Editorial Spatial Workbench)  
**Related documents:** [BLUEPRINT.md](./BLUEPRINT.md), [HANDOFF.md](./HANDOFF.md), [PRD.md](./PRD.md)

---

## 1. Visual Direction: Clean Editorial Spatial Workbench

Following team review, SennaGrid uses a **Clean Editorial Light** spatial analytics language inspired by modern public-health journalism (*Our World in Data*) and cloud GIS (*Felt*):
- **Canvas & Surfaces:** Cool alabaster canvas (`#f8fafc`), pure crisp white cards (`#ffffff`), subtle `#e2e8f0` dividers, and `#64748b` (`4.76:1` WCAG AA) interactive control borders.
- **Semantic Strategy Colors:**
  - **SennaGrid Optimized:** Deep Clinical Teal (`#0f766e` / `#0d9488`, `#115e59` on `#f0fdfa`).
  - **Reactive Baseline:** Urgent Crimson Rose (`#be123c` / `#e11d48`, `#9f1239` on `#fff1f2`).
  - **Caution / Trade-off:** Warm Amber (`#b45309`, `#92400e` on `#fffbeb`).
  - **Verified Pass:** Emerald (`#065f46` on `#ecfdf5`).
- **Typography:** `Plus Jakarta Sans` for approachable, high-legibility headings and labels paired with `IBM Plex Mono` (`tabular-nums`) strictly for metrics, formulas, and counters. Zero decorative emojis, zero em dashes, and zero raw ASCII `->` arrows.

---

## 2. Information Architecture & Immediate Comprehension

1. **Unified Top Header & Scenario Ribbon:** Combines brand identity, workspace navigation (`Simulator`, `Dispatch Plan`, `Model & Gates`), Policy Gate status, Guided Tour, and single-ribbon controls (`City Scenario`, `Transmission Model`, `Climate Forcing`: `Peak Season` vs `Live Weather`, `Weekly Team Quota`, `Tune`, and `Optimize`).
2. **Plain-Language Executive Takeaway + Visual Comparison KPIs:**
   - Top banner states the headline public-health result in one clear human sentence derived deterministically from `OptimizationOutput`.
   - Four white KPI cards pair numbers with visual Reactive-vs-SennaGrid comparison bars, separating peak overflow (`beds`) from cumulative total overflow (`bed-days`) and framing case deltas honestly (`Cases Averted` vs `Mild-Case Trade-off`).
3. **Cohesive 12-Column Spatial Stage (Fits Laptop Screens Cleanly):**
   - **Left 9 Columns (`SplitMapView` + attached `TimelinePlayer`):**
     - Carto Positron light basemap (`fitBounds` framed tightly around organic subdivided ward boundaries) with offline light fallback (`#eef2f6`).
     - Active week's dispatched ward names displayed as clickable chips directly above each map.
     - On-map clickable ward short-code & live ICU `%` badges, toggleable gravity commuter flow corridors, and non-overlapping selection halos beneath active dispatch borders.
     - Auto-focuses timeline on the **Peak Surge Day** (`findCrisisFocusDay`) on load so spatial contrast is immediately visible, with `Replay D0` and `Peak Surge` buttons right below the maps.
   - **Right 3 Columns (`DistrictInspector`):**
     - Defaults to a ranked **District ICU Watchlist** sorted by peak baseline ICU stress; clicking any ward on the map or watchlist opens the side-by-side district comparison and 91-day horizon peak summary.
4. **Analytical Charts & Scorecard:**
   - Toggleable **Hospital ICU Overflow (`beds`) / City-Wide ICU Demand** `AreaChart`, **Active Infections Trajectory** `AreaChart`, and **5-Axis Strategy Scorecard** pairing the engine-owned `0..100` `RadarChart` with explicit horizontal score bars.
5. **Dispatch Plan (`DispatchSchedule` & `SwapTracePanel`):**
   - **13-Week Spatial Deployment Matrix** (`Districts x W1..W13`) color-coded by deterministic rationale (`Mobility Hub Containment`, `Pre-emptive Surge Intercept`, `ICU Capacity Shield`), followed by filterable cards (mobile `< 720px`) / table (`>= 720px`), CSV/JSON exports with status feedback, and Stage 2 coordinate-descent swap audit log.
6. **Model & Gates (`MethodologyView` & `PolicyGatesPanel`):**
   - Five deterministic Policy Gate cards (`PASS / REVIEW / FAIL`) + clean typographic equations ($G_{ij}, W_{ij}, \phi_T, J(U)$) + explicit synthetic benchmark disclaimer.
