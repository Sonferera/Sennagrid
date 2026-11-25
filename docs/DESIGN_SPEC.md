# SennaGrid Design Specification

**Document:** `DESIGN_SPEC.md`  
**Project:** SennaGrid  
**Scope:** UI/UX Design & Interaction Specification  
**Status:** Approved  
**Related documents:** [BLUEPRINT.md](./BLUEPRINT.md), [HANDOFF.md](./HANDOFF.md), [PRD.md](./PRD.md)

---

## 1. Overview

### 1.1 Purpose

This document defines the visual design, information architecture, interaction behavior, responsive behavior, and accessibility standards for the SennaGrid application. It is the primary UI/UX reference for implementation and review.

### 1.2 Product Context

SennaGrid is a client-side spatial epidemic digital twin and constrained resource optimizer for public health planners, epidemiologists, and technical evaluators.

The interface must allow users to:

- Understand simulation outcomes quickly.
- Compare Reactive Baseline against SennaGrid Optimized.
- Explore epidemic conditions through interactive maps.
- Inspect district-level conditions and interventions.
- Control simulation playback and parameters.
- Review and export operational dispatch schedules.
- Understand optimization methodology and policy verification results.

### 1.3 Design Principles

1. **Clarity first:** Prioritize understandable information over decoration.
2. **Data integrity:** Do not fabricate, reinterpret, or independently recalculate engine metrics.
3. **Operational focus:** Prioritize information that supports analysis and decisions.
4. **Consistent interaction:** Use predictable controls and interaction patterns.
5. **Responsive by design:** Maintain usability across desktop, tablet, and mobile.
6. **Accessibility:** Support keyboard navigation, readable contrast, and reduced motion.
7. **Performance conscious:** Avoid unnecessary animations, rendering, and layout shifts.

---

## 2. Visual Identity

### 2.1 Design Direction

**Spatial Epidemic Digital Twin & Scientific Telemetry Workbench**

SennaGrid uses a dark scientific Emergency Operations Center (EOC) aesthetic. The visual language communicates technical credibility, analytical precision, operational readiness, and scientific transparency.

### 2.2 Design Characteristics

| Property | Specification |
| :--- | :--- |
| Theme | Dark |
| Visual style | Scientific telemetry workbench |
| Density | Balanced |
| Motion | Restrained |
| Layout | Structured analytical sections |
| Decoration | Minimal |
| Iconography | Lucide icons |
| UI language | English |

Avoid unnecessary gradients, decorative illustrations, excessive glassmorphism, oversized typography, and decorative dashboard cards.

---

## 3. Design System

### 3.1 Color Palette

#### Foundation

| Token | Hex | Usage |
| :--- | :--- | :--- |
| Canvas | `#090d16` | Main application background |
| Surface | `#0f172a` | Primary panels and cards |
| Inset | `#162033` | Nested surfaces |
| Border Subtle | `#1e293b` | Decorative separators |
| Border Control | `#64748b` | Interactive control boundaries |

#### Semantic Colors

| Token | Hex | Meaning |
| :--- | :--- | :--- |
| Reactive Rose | `#fb7185` | Reactive Baseline |
| SennaGrid Cyan | `#22d3ee` | SennaGrid optimization |
| Emerald | `#34d399` | Verified PASS |
| Amber | `#fbbf24` | Warning and trade-off |
| Primary Text | `#f1f5f9` | Main content |
| Secondary Text | `#cbd5e1` | Supporting content |
| Muted Text | `#94a3b8` | Labels and metadata |

### 3.2 Semantic Color Rules

- Rose always represents Reactive Baseline.
- Cyan always represents SennaGrid optimization.
- Emerald represents successful verification or positive status.
- Amber represents warnings, trade-offs, or conditions requiring attention.
- Neutral slate colors represent structural and informational elements.
- Never communicate status using color alone; include text labels, icons, or other visual indicators.

### 3.3 Interactive Borders

- Use `#64748b` or a higher-contrast color for interactive borders (`>= 3:1` non-text contrast).
- Do not use `#475569` on `#0f172a` (`2.36:1`) for interactive control boundaries.
- Decorative separators may use `#1e293b`.

### 3.4 Typography

| Font | Usage |
| :--- | :--- |
| IBM Plex Sans | General UI, headings, labels, descriptions |
| IBM Plex Mono | Metrics, coordinates, counters, formulas, and numerical values |

Typography rules:

- Use tabular numbers (`tabular-nums`) for changing numerical values.
- Maintain a consistent heading hierarchy.
- Keep labels concise and descriptive.
- Use monospace typography for technical values and data tables.

### 3.5 Iconography

- Use Lucide icons with consistent stroke weight (16 to 18px).
- Icons support meaning, never replace labels.
- Zero decorative emojis.

---

## 4. Information Architecture

```text
SennaGrid
├── Application Header
│   ├── Brand
│   ├── Weather Status
│   ├── Policy Gate Status
│   └── Guided Tour
├── Simulation Controls
│   ├── Scenario Selector
│   ├── Disease Model
│   ├── Weekly Budget
│   └── Advanced Parameters (Collapsible)
├── Workspace Navigation
│   ├── Simulator
│   ├── Dispatch Schedule
│   └── Methodology & Math
├── Main Content
│   ├── Simulator (KPIs, Dual Maps, District Inspector, Timeline Player, Charts)
│   ├── Dispatch Schedule (Summary, Filters, Responsive Cards/Table, Export, Swap Trace)
│   └── Methodology & Math (Policy Gates, Mathematical Models, Limitations)
└── Application Footer
    └── Synthetic Benchmark Disclaimer
```

---

## 5. Simulator View & Engine Contract Reconciliation

1. **KPI Overview:** Four cards reading strictly from `OptimizationOutput`:
   - *Hospital Collapse Days*: `Reactive: Xd -> SennaGrid: Yd`
   - *Peak ICU Overflow*: Peak overflow in **`beds`** separated clearly from cumulative total overflow in **`bed-days`**.
   - *Cumulative Cases Impact*: `Cases Averted` when non-negative; `Mild-Case Trade-off` in Amber with context when negative.
   - *Solver & Policy Readiness*: Objective cost reduction, evaluation count, solve latency, and clickable Policy Gate readiness pill.
2. **Spatial Comparison (`SplitMapView`):** Synchronized MapLibre GL v5 maps using the documented engine stress formula `stress = icuDemand / icuBeds` (`< 60%` Safe, `60 to 99%` Strained, `>= 100%` ICU Overflow) with offline dark canvas fallback, `Camera Sync` toggle, `Reset View`, hover tooltip, and a keyboard-accessible district selector.
3. **District Inspector:** Explicit empty state when no district is selected; side-by-side Reactive vs SennaGrid day snapshot and 91-day peak comparison from `output.impactSummary.districtImpacts`; dismissible via button or `Escape`.
4. **Timeline Player:** Derives `maxDay` and `totalWeeks` dynamically from `OptimizationOutput` (`Day 0..91`, `92` snapshots, `13` weeks, Day `91` labeled `End of Week 13`), with `Play/Pause`, `Previous/Next Day`, `Jump to Peak`, and `1x / 2x / 4x` speeds.
5. **Epidemic Charts:** Active Infections, City-Wide ICU Demand vs Capacity (with local district overflow surfaced in tooltips), and 5-axis engine-owned Impact Radar (`0..100`, zero fabricated comparison polygon or arbitrary benchmark line).

---

## 6. Dispatch Schedule, Methodology, & Guided Tour

- **Dispatch Schedule:** Filterable by Week, Zone Type, Rationale, and District Search; stacked assignment cards on mobile (`< 720px`) and 8-column table on tablet/desktop (`>= 720px`); `Export Plan (CSV)` and `Export Full Run (JSON)` with accessible success and failure feedback; Stage 2 `SwapTracePanel` with empty state.
- **Methodology & Math:** Live 5-gate `PolicyGatesPanel` (`PASS / REVIEW / FAIL`), structured formula sections synced with `EPIDEMIC_CONSTANTS`, and explicit synthetic benchmark / non-clinical disclaimer.
- **Guided Tour:** Optional 4-step walkthrough launched from the header (`control-bar`, `split-map`, `timeline-player`, `dispatch-export`), closed by default, keyboard-navigable (`ArrowLeft`, `ArrowRight`, `Escape`), and reduced-motion aware.

---

## 7. Interaction, Responsive, & Accessibility Standards

- **Non-Blocking Startup:** Initial simulation launches immediately with deterministic fallback climatology and upgrades silently in the background if Open-Meteo responds with live weather.
- **Budget Slider:** `10%` to `40%` (step `5%`), immediate readout with controlled debounce / release trigger and explicit `Run Optimization` button.
- **Keyboard Shortcuts:** `Space` (Play/Pause), `ArrowLeft` / `ArrowRight` (Previous/Next Day when tour is closed; tour navigation when tour is open), `Escape` (close tour, advanced drawer, or inspector), safely ignored inside editable inputs/controls.
- **Breakpoints:** Mobile `< 720px` (single map toggle, stacked dispatch cards, `>= 44x44px` tap targets, zero horizontal overflow), Tablet `720px–1179px`, Desktop `>= 1180px`.
- **Accessibility & Copy:** WCAG 2.1 AA contrast verified (`>= 4.5:1` text, `>= 3.0:1` interactive borders), visible cyan focus rings, `prefers-reduced-motion` support, semantic landmarks, color-independent status indicators, English UI copy, zero emojis, zero em dashes.
