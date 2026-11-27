export type GuideTab = 'simulator' | 'schedule' | 'methodology';

export type GuideCategoryId =
  | 'workspace'
  | 'controls'
  | 'maps'
  | 'timeline_charts'
  | 'dispatch'
  | 'methodology';

export interface TourStepControlItem {
  label: string;
  detail: string;
}

export interface LiveTourStepSpec {
  id: string;
  stepNumber: number;
  target: string;
  tab: GuideTab;
  tabLabel: string;
  title: string;
  summary: string;
  controls: readonly TourStepControlItem[];
  tip: string;
}

export interface FeatureGuideItem {
  id: string;
  category: GuideCategoryId;
  tab: GuideTab;
  tabLabel: string;
  tourTarget: string;
  tourStepIndex: number;
  title: string;
  summary: string;
  capabilities: readonly string[];
  keywords: readonly string[];
}

export interface GuideCategorySpec {
  id: GuideCategoryId;
  label: string;
}

export interface KeyboardShortcutSpec {
  keys: string;
  action: string;
  context: string;
}

export const GUIDE_CATEGORIES: readonly GuideCategorySpec[] = [
  { id: 'workspace', label: 'Workspace & Theme' },
  { id: 'controls', label: 'Controls & Engine' },
  { id: 'maps', label: 'Maps & Inspector' },
  { id: 'timeline_charts', label: 'Timeline & Charts' },
  { id: 'dispatch', label: 'Dispatch & Exports' },
  { id: 'methodology', label: 'Methodology & Gates' },
];

export const LIVE_TOUR_STEPS: readonly LiveTourStepSpec[] = [
  {
    id: 'header-workspace',
    stepNumber: 1,
    target: 'header-bar',
    tab: 'simulator',
    tabLabel: 'Global Header',
    title: '1. Navigation, Theme Switch & Verification Bar',
    summary:
      'Switch between SennaGrid views, flip between Obsidian Dark and Warm Paper Light themes, open the full Feature Guide, or verify solver health in one click.',
    controls: [
      {
        label: 'Simulator | Weekly Plan | Methodology',
        detail: 'Switch between spatial replay, the 13-week deployment plan, and ODE/gate proofs.',
      },
      {
        label: 'Dark / Light Toggle',
        detail: 'Persists theme choice and dynamically swaps Carto Dark Matter and Positron basemaps.',
      },
      {
        label: 'Gates Status Button',
        detail: 'Shows live 5-gate readiness (Pass, Review, or Fail) and jumps to detailed verification.',
      },
    ],
    tip: 'Your selected scenario, budget, and active simulation state stay synchronized whenever you switch tabs.',
  },
  {
    id: 'control-rail',
    stepNumber: 2,
    target: 'control-bar',
    tab: 'simulator',
    tabLabel: 'Simulator',
    title: '2. Scenarios, Weekly Quota & Model Parameters',
    summary:
      'Configure urban topology, transmission mechanics, weekly team capacity, and epidemiological sensitivity. Every run executes locally inside a browser Web Worker.',
    controls: [
      {
        label: 'City Scenario & Disease Model',
        detail: 'Compare Metro Tropica (18 wards) vs Harbor Corridor (16 wards) in Dengue or Respiratory mode.',
      },
      {
        label: 'Budget Slider (10% to 40%)',
        detail: 'Fixes identical weekly team quota K for both Reactive Baseline and SennaGrid.',
      },
      {
        label: 'Climate Forcing & Parameters',
        detail: 'Toggle Peak Season vs Live Open-Meteo weather, or tune ICU Rate, Commuter Outflow, and Team Efficacy.',
      },
    ],
    tip: 'Tight budgets (15% to 20%) reveal the steepest gap between reactive chasing and hub preemption.',
  },
  {
    id: 'kpi-strip',
    stepNumber: 3,
    target: 'kpi-strip',
    tab: 'simulator',
    tabLabel: 'Simulator',
    title: '3. 91-Day Impact Comparison Strip',
    summary:
      'Compare reactive status quo (rose strikethrough) against SennaGrid predictive dispatch (teal) under the exact same operational budget.',
    controls: [
      {
        label: 'Hospital Collapse',
        detail: 'Counts total days where any ward exceeds 100% of its dedicated ICU bed capacity.',
      },
      {
        label: 'Peak ICU Overflow',
        detail: 'Separates worst-day bed shortage from cumulative 91-day severity in bed-days averted.',
      },
      {
        label: 'Policy Gates & Trade-off',
        detail: 'Reports gates passed and transparently flags any mild-case increase used to shield ICUs.',
      },
    ],
    tip: 'Click the passed gates headline in card 3 to jump straight to the Policy Gates & Math verification view.',
  },
  {
    id: 'split-map',
    stepNumber: 4,
    target: 'split-map',
    tab: 'simulator',
    tabLabel: 'Simulator',
    title: '4. Synchronized Split Maps, Watchlist & Inspector',
    summary:
      'Inspect spatial stress side by side between Without SennaGrid (left) and With SennaGrid (right), switch to a ranked Watchlist table, or click any district to compare ward metrics.',
    controls: [
      {
        label: 'Map | Watchlist Switch',
        detail: 'Toggle between interactive polygons and a ranked table of peak ward ICU utilization.',
      },
      {
        label: 'Labels, Flows, Sync Pan & Reset',
        detail: 'Cycle Key Wards / All Wards / Off badges, toggle commuter corridors, or lock dual-map cameras.',
      },
      {
        label: 'Inspect Ward / Polygon Click',
        detail: 'Click any polygon, row, or dropdown entry to inspect active cases, ICU stress %, and active team status.',
      },
    ],
    tip: 'Teal outlined wards on the right map show teams deployed during the active timeline week.',
  },
  {
    id: 'timeline-player',
    stepNumber: 5,
    target: 'timeline-player',
    tab: 'simulator',
    tabLabel: 'Simulator',
    title: '5. 91-Day Timeline Scrubber & Peak Surge Jump',
    summary:
      'Replay outbreak progression across Days 0 to 91 (Weeks 1 to 13) or isolate peak reactive collapse immediately.',
    controls: [
      {
        label: 'Play / Pause & Day Scrubber',
        detail: 'Drives 60 FPS GPU feature-state updates across every map polygon and chart cursor.',
      },
      {
        label: 'Jump: Peak (DX)',
        detail: 'Locks immediately onto the reactive crisis peak day so hospital stress contrasts stand out.',
      },
      {
        label: '1x / 2x / 4x Speeds',
        detail: 'Scales playback velocity, paired with Space and Left/Right arrow keyboard shortcuts.',
      },
    ],
    tip: 'Try playing from Day 0 at 2x speed to watch early commuter hubs get shielded before peripheral outbreaks spike.',
  },
  {
    id: 'epidemic-charts',
    stepNumber: 6,
    target: 'epidemic-charts',
    tab: 'simulator',
    tabLabel: 'Simulator',
    title: '6. Outbreak Trajectory & 5-Axis Strategy Fit',
    summary:
      'Track citywide daily ICU breaches or active infections alongside five normalized Strategy Fit bars computed directly by the engine.',
    controls: [
      {
        label: 'Overflow | Cases Toggle',
        detail: 'Switch between excess ICU beds above ward capacity and total citywide active cases.',
      },
      {
        label: 'Interactive Chart Scrubbing',
        detail: 'Click anywhere on the trajectory curve to move both split maps and timeline to that exact day.',
      },
      {
        label: 'Strategy Fit Bars',
        detail: 'Summarizes Collapse Prevention, Peak ICU Safety, Hub Containment, Cost Efficiency, and Cases Control.',
      },
    ],
    tip: 'Cases Control honestly displays 0 with the exact trade-off percentage when ICU-first sweeps save beds via small mild-case trade-offs.',
  },
  {
    id: 'dispatch-schedule',
    stepNumber: 7,
    target: 'dispatch-export',
    tab: 'schedule',
    tabLabel: 'Weekly Plan',
    title: '7. 13-Week Dispatch Matrix, Swap Trace & Exports',
    summary:
      'Turn optimization outputs into field operations: explore rationale badges across all 13 weeks, filter ward assignments, audit Stage 2 swaps, and export CSV or JSON files.',
    controls: [
      {
        label: 'Weekly Coverage Matrix (H / S / I)',
        detail: 'Color-codes Hub Containment (H), Surge Intercept (S), and ICU Shield (I). Click any badge to inspect that ward & week.',
      },
      {
        label: 'Field Assignments & Filters',
        detail: 'Filter rows by Week, Zone Type, Rationale tag, or search text with 10-row pagination.',
      },
      {
        label: 'Stage 2 Swap Trace & Exports',
        detail: 'Expand accepted block/1-swap reallocations and download RFC-4180 CSV dispatch sheets or full JSON payloads.',
      },
    ],
    tip: 'Clicking any H, S, or I tile inside the Weekly Matrix jumps straight to that ward and week on the Simulator map.',
  },
  {
    id: 'methodology-gates',
    stepNumber: 8,
    target: 'methodology-gates',
    tab: 'methodology',
    tabLabel: 'Methodology',
    title: '8. Policy Integrity Gates & Mathematical Pipeline',
    summary:
      'Audit the exact five deterministic guardrails, gravity kernel equations, compartmental RK4 solver specs, and two-stage optimizer boundaries.',
    controls: [
      {
        label: '5 Policy & Integrity Gates',
        detail: 'Verifies Mass Conservation (<1e-9), Weekly Budget Cap, Cost Dominance, Collapse Prevention, and Hub Coverage.',
      },
      {
        label: '3 Formulation Cards',
        detail: 'Displays Haversine Gravity weights W_ij, active Vector/Direct ODE equations, and min J(U) objective weights.',
      },
      {
        label: 'Execution Pipeline & Scope',
        detail:
          'Traces Geometry, Gravity Kernel, RK4 Trajectory, Policy Gates, and 13-Week Dispatch over synthetic research topologies.',
      },
    ],
    tip: 'Every figure on the entire site comes deterministically from the TypeScript engine without server calls or generative guessing.',
  },
];

export const FEATURE_GUIDE_ITEMS: readonly FeatureGuideItem[] = [
  {
    id: 'nav-tabs',
    category: 'workspace',
    tab: 'simulator',
    tabLabel: 'Global Header',
    tourTarget: 'header-bar',
    tourStepIndex: 0,
    title: 'Sticky Workspace Navigation & Gates Badge',
    summary:
      'Always-reachable 56px sticky bar separating spatial simulation, operational scheduling, and mathematical auditing while tracking live verification health.',
    capabilities: [
      'Simulator tab: interactive split-screen map, sidebar parameters, impact KPIs, playback bar, and trajectory charts.',
      'Weekly Plan tab: 13-week H/S/I coverage matrix, filterable ward dispatch table, Stage 2 swap log, and CSV/JSON exports.',
      'Methodology tab: 5 deterministic Integrity & Policy Gates, mathematical equations, and 5-step Web Worker pipeline.',
      'Gates indicator pill (e.g. 5/5 Gates Pass): dynamically updates between Pass, Review, and Fail and links directly to Methodology.',
    ],
    keywords: ['navbar', 'header', 'tabs', 'simulator', 'weekly plan', 'methodology', 'gates', 'sticky'],
  },
  {
    id: 'theme-switch',
    category: 'workspace',
    tab: 'simulator',
    tabLabel: 'Global Header',
    tourTarget: 'header-bar',
    tourStepIndex: 0,
    title: 'Obsidian Dark Default & Warm Paper Light Theme',
    summary:
      'Toggles the entire interface, chart palette, and MapLibre basemaps between high-legibility Obsidian Dark and glare-free Warm Paper Light.',
    capabilities: [
      'Defaults to Obsidian Dark (#121110 canvas, #1a1917 cards) with pre-paint persistence in browser localStorage.',
      'Warm Paper Light uses archival cream (#f5f2eb) surfaces and switches basemaps smoothly to Carto Positron.',
      'Carto Dark Matter tiles load automatically in Dark mode and abort cleanly on rapid toggles without false offline alerts.',
    ],
    keywords: ['dark mode', 'light mode', 'theme', 'obsidian', 'warm paper', 'carto', 'basemap'],
  },
  {
    id: 'city-disease-controls',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'control-bar',
    tourStepIndex: 1,
    title: 'City Scenarios & Dual Transmission Models',
    summary:
      'Switches urban commuter networks and switches between vector-borne arbovirus dynamics and human-to-human respiratory spread.',
    capabilities: [
      'Metro Tropica (18 wards): dense tropical basin defaulting to climate-coupled Vector-Borne SEIR-SEI (Dengue).',
      'Harbor Corridor (16 wards): coastal transit bottleneck topology defaulting to Direct-Contact SEIR (Respiratory).',
      'Override disease mode independently on either city to test how vector vs direct transmission reshapes optimal schedules.',
      'Clear stale ward selection cleanly when changing cities and re-focus on the peak crisis surge day.',
    ],
    keywords: ['metro tropica', 'harbor corridor', 'dengue', 'respiratory', 'seir', 'vector', 'scenario'],
  },
  {
    id: 'budget-solver-params',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'control-bar',
    tourStepIndex: 1,
    title: 'Weekly Quota Slider, Climate Forcing & Parameters',
    summary:
      'Tunes intervention capacity, weather inputs, hospitalization severity, commuter mobility, and team efficacy inside the always-visible parameter rail.',
    capabilities: [
      'Budget slider (10% to 40%, 5% steps): enforces identical weekly quota K = max(1, floor(B * N)) wards/week on both strategies.',
      'Climate Forcing toggle: Peak Season uses bundled seasonal weather; Live Weather fetches 14-day + forecast Open-Meteo metrics (3s offline fallback).',
      'Model Parameters: ICU Rate (0.5% to 3.5%), Commuter Outflow (0% to 40%), Team Efficacy (30% to 90%), plus one-click Reset Defaults.',
      'Run Optimization CTA executes Reactive Baseline + Stage 1 multi-seed + up to 250 Stage 2 swaps in a background Web Worker.',
    ],
    keywords: ['budget', 'quota', 'climate', 'open-meteo', 'icu rate', 'mobility', 'efficacy', 'reset', 'worker'],
  },
  {
    id: 'impact-kpi-strip',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'kpi-strip',
    tourStepIndex: 2,
    title: '91-Day Impact Comparison KPI Strip',
    summary:
      'Surfaces engine-computed outcomes comparing Without SennaGrid against With SennaGrid across three hairline-separated summary metrics.',
    capabilities: [
      'Hospital Collapse: contrasts total days with breached ward ICUs across the 91-day horizon.',
      'Peak ICU Overflow: distinguishes worst-day simultaneous bed shortfall (beds) from cumulative bed-days saved across all 13 weeks.',
      'Policy Gates & Trade-off: reports verification pass ratio and explicitly reveals mild-case trade-offs when shielding ICUs.',
    ],
    keywords: ['kpi', 'hospital collapse', 'icu overflow', 'bed-days', 'trade-off', 'reactive'],
  },
  {
    id: 'split-screen-maps',
    category: 'maps',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'split-map',
    tourStepIndex: 3,
    title: 'Synchronized Dual Maps & Ward Stress Encoding',
    summary:
      'Side-by-side MapLibre GL JS v5 maps updating district stress colors at 60 FPS via feature-state without regenerating GeoJSON geometry.',
    capabilities: [
      'Left pane (Without SennaGrid) tracks reactive case-chasing; Right pane (With SennaGrid) tracks predictive containment.',
      'Uniform 3-tier severity encoding: <60% Safe, 60% to 99% Strained, and >=100% ICU Overflow.',
      'Teal active outlines highlight wards receiving intervention teams during the current timeline week.',
      'On screens narrower than 720px, switches cleanly into a responsive Without / With SennaGrid toggle.',
    ],
    keywords: ['map', 'split screen', 'maplibre', 'stress', 'safe', 'strained', 'overflow', 'heatmap'],
  },
  {
    id: 'map-toolbar-inspector',
    category: 'maps',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'split-map',
    tourStepIndex: 3,
    title: 'Map Toolbar, Watchlist Table & Ward Inspector',
    summary:
      'Fine-tune map overlays, switch to a sortable tabular watchlist, or inspect any district under both strategies side by side.',
    capabilities: [
      'Labels button cycles non-overlapping Key Wards ICU badges, All Wards badges, or Off.',
      'Commuter Flows button toggles gravity-weighted transit corridor lines (W_ij) between hubs and outer wards.',
      'Sync Pan locks pan, zoom, and bearing across maps; Reset Framing restores full-city framing.',
      'Map | Watchlist switch opens a ranked ward stress table; clicking any polygon, watchlist row, or Inspect Ward dropdown opens District Inspector.',
    ],
    keywords: ['labels', 'commuter flows', 'sync pan', 'reset framing', 'watchlist', 'inspect ward', 'inspector'],
  },
  {
    id: 'timeline-playback',
    category: 'timeline_charts',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'timeline-player',
    tourStepIndex: 4,
    title: '91-Day Interactive Timeline & Peak Surge Jump',
    summary:
      'Scrub any day from Day 0 to Day 91, animate multi-week containment waves, or snap directly to the peak reactive ICU crisis day.',
    capabilities: [
      'Play / Pause button drives smooth animation at 1x, 2x, or 4x speed across all 13 weeks.',
      'Day scrubber updates map polygons, hover tooltips, ward inspector cards, and trajectory reference cursor simultaneously.',
      'Jump: Peak (DX) jumps immediately to the reactive peak ICU surge day.',
      'Keyboard accessible: Space toggles playback and Left/Right arrow keys step Day -1/+1.',
    ],
    keywords: ['timeline', 'playback', 'jump to peak', 'scrubber', 'speed', '1x', '2x', '4x', 'play'],
  },
  {
    id: 'trajectory-strategy-fit',
    category: 'timeline_charts',
    tab: 'simulator',
    tabLabel: 'Simulator',
    tourTarget: 'epidemic-charts',
    tourStepIndex: 5,
    title: 'ICU & Infection Trajectories + 5-Axis Strategy Fit',
    summary:
      'Visualizes 91-day outbreak curves alongside five deterministic Strategy Fit performance scores normalized against Reactive Baseline.',
    capabilities: [
      'Overflow | Cases chart toggle switches between excess ICU demand above local ward beds and total active infections.',
      'Compact y-axis k-notation keeps large Respiratory surges readable without clipping.',
      'Click any point on the chart area to scrub the timeline directly to that day.',
      'Strategy Fit ranks Collapse Prevention, Peak ICU Safety, Hub Containment, Cost Efficiency, and Cases Control from 0 to 100.',
    ],
    keywords: ['charts', 'trajectory', 'overflow', 'cases', 'strategy fit', 'recharts', 'radar'],
  },
  {
    id: 'weekly-coverage-matrix',
    category: 'dispatch',
    tab: 'schedule',
    tabLabel: 'Weekly Plan',
    tourTarget: 'dispatch-export',
    tourStepIndex: 6,
    title: '13-Week H / S / I Dispatch Matrix & Field Table',
    summary:
      'Translates optimizer output into an actionable 13-week schedule explaining why every district was selected each week.',
    capabilities: [
      'H (Hub Containment, teal): targets high-centrality commuter hubs early to block downstream spread.',
      'S (Surge Intercept, amber): intercepts rapidly accelerating outbreaks before hospital beds saturate.',
      'I (ICU Shield, rose): prioritizes low-bed wards projected to breach local ICU capacity.',
      'Click any H/S/I cell or Field Assignments ward link to open that exact district and week back on the Simulator map.',
    ],
    keywords: ['matrix', 'dispatch', 'schedule', 'h', 's', 'i', 'hub', 'surge', 'shield', 'filter', 'pagination'],
  },
  {
    id: 'swap-trace-exports',
    category: 'dispatch',
    tab: 'schedule',
    tabLabel: 'Weekly Plan',
    tourTarget: 'dispatch-export',
    tourStepIndex: 6,
    title: 'Stage 2 Swap Trace Audit Log & CSV/JSON Exports',
    summary:
      'Audits every local-search reallocation step and downloads deployment sheets or complete machine-readable simulation runs.',
    capabilities: [
      'Multi-Filter Bar filters assignments by Week (W01–W13), Zone Type, Rationale tag, or district name with 10-row paging.',
      'Collapsible Stage 2 Swap Trace logs iteration, pass number, swapped district pair, overflow saved, and objective cost delta.',
      'Export CSV downloads RFC-4180 field schedules ready for municipal distribution.',
      'Export JSON captures parameters, weather series, 91-day curves, KPIs, Strategy Fit scores, gates, and full swap history.',
    ],
    keywords: ['swap trace', 'csv', 'json', 'export', 'stage 2', 'block swap', 'download'],
  },
  {
    id: 'policy-gates-math',
    category: 'methodology',
    tab: 'methodology',
    tabLabel: 'Methodology',
    tourTarget: 'methodology-gates',
    tourStepIndex: 7,
    title: '5 Policy Gates, Equations & Runtime Pipeline',
    summary:
      'Audits numerical rigor and displays exact formulas used inside @sennagrid/engine with zero hidden black-box steps.',
    capabilities: [
      '5 Integrity Gates: ODE Mass Conservation (<1e-9), Weekly Budget Cap, Objective Dominance, ICU Collapse Prevention, and Early Hub Coverage.',
      'Spatial Gravity Kernel computes pairwise Haversine commuter weights W_ij across districts.',
      'Compartmental RK4 ODE Solver integrates step dt = 0.25d over Float64Array buffers for 91 days.',
      'Two-Stage Constrained Optimizer combines receding-horizon initialization with ICU-overflow-first local swaps and Hospital Safety Guardrail.',
    ],
    keywords: ['policy gates', 'math', 'equations', 'rk4', 'gravity', 'optimizer', 'guardrail', 'conservation'],
  },
];

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcutSpec[] = [
  {
    keys: 'Space',
    action: 'Play / Pause 91-day timeline animation',
    context: 'Simulator tab',
  },
  {
    keys: 'Left / Right',
    action: 'Step timeline -1 / +1 day, or step Live Tour',
    context: 'Simulator or Live Tour',
  },
  {
    keys: 'Escape',
    action: 'Close Guide / Tour, or clear selected Ward Inspector',
    context: 'Anywhere',
  },
];

export function filterFeatureGuideItems(
  category: GuideCategoryId | 'all',
  searchQuery: string,
): FeatureGuideItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return FEATURE_GUIDE_ITEMS.filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      item.title,
      item.summary,
      item.tabLabel,
      ...item.capabilities,
      ...item.keywords,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function getLiveTourStepCount(): number {
  return LIVE_TOUR_STEPS.length;
}

export function getLiveTourTabForStep(step: number): GuideTab {
  const safeIdx = Math.max(0, Math.min(LIVE_TOUR_STEPS.length - 1, Math.round(step)));
  return LIVE_TOUR_STEPS[safeIdx]?.tab ?? 'simulator';
}
