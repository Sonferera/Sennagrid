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
  tryIt: string;
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
  tryAction: string;
  keywords: readonly string[];
}

export interface GuideCategorySpec {
  id: GuideCategoryId;
  label: string;
}

export interface CityBenchmarkReferenceItem {
  name: string;
  wards: string;
  defaultModel: string;
  climateAnchor: string;
  focus: string;
}

export interface KeyboardShortcutSpec {
  keys: string;
  action: string;
  context: string;
}

export const GUIDE_CATEGORIES: readonly GuideCategorySpec[] = [
  { id: 'workspace', label: 'Workspace & Theme' },
  { id: 'controls', label: 'Scenarios & Engine' },
  { id: 'maps', label: 'Maps & Inspector' },
  { id: 'timeline_charts', label: 'Timeline & Charts' },
  { id: 'dispatch', label: 'Dispatch & Exports' },
  { id: 'methodology', label: 'Methodology & Gates' },
];

export const CITY_BENCHMARK_REFERENCE: readonly CityBenchmarkReferenceItem[] = [
  {
    name: 'Metro Tropica',
    wards: '18 wards · 1.39M pop',
    defaultModel: 'Dengue (Vector SEIR-SEI)',
    climateAnchor: 'Jakarta basin · 29.4°C peak',
    focus: 'Monsoon vector surge across high-density rail hubs and low-bed outer wards.',
  },
  {
    name: 'Harbor Corridor',
    wards: '16 wards · 681K pop',
    defaultModel: 'Respiratory (Direct SEIR)',
    climateAnchor: 'West Tokyo Bay inland · 18.2°C',
    focus: 'Linear commuter bottleneck linking port gateways, downtown hospitals, and suburbs.',
  },
  {
    name: 'Highland Ring',
    wards: '16 wards · 810K pop',
    defaultModel: 'Respiratory (Direct SEIR)',
    climateAnchor: 'Nairobi upland plateau · 22.6°C',
    focus: 'Landlocked radial plateau where 3 outer gateways feed two central referral cores.',
  },
  {
    name: 'Monsoon Delta',
    wards: '18 wards · 1.42M pop',
    defaultModel: 'Dengue (Vector SEIR-SEI)',
    climateAnchor: 'Bangkok river plain · 30.4°C',
    focus: 'Humid canal-belt delta testing vector preemption across central rail exchanges.',
  },
  {
    name: 'Simulate Any City',
    wards: '18 normalized wards',
    defaultModel: 'Auto: Dengue (|lat|<=23.5°) or Resp.',
    climateAnchor: 'Live Open-Meteo + latitude fallback',
    focus: 'Projects a cosine-scaled 18-ward benchmark onto any searched city worldwide.',
  },
];

export const LIVE_TOUR_STEPS: readonly LiveTourStepSpec[] = [
  {
    id: 'header-workspace',
    stepNumber: 1,
    target: 'header-bar',
    tab: 'simulator',
    tabLabel: 'Global Header',
    title: '1. Navigation, Theme Switch & Live Gates Pill',
    summary:
      'Switch between SennaGrid views, flip between Obsidian Dark and Warm Paper Light themes, open this searchable Feature Guide, or verify solver health in one click.',
    controls: [
      {
        label: 'Simulator | Weekly Plan | Methodology',
        detail:
          'Navigate across spatial replay, the 13-week field dispatch schedule, and deterministic ODE/gate proofs without losing active state.',
      },
      {
        label: 'Dark / Light Toggle',
        detail:
          'Persists theme preference in browser storage and seamlessly swaps Carto Dark Matter and Carto Positron vector basemaps.',
      },
      {
        label: 'Guide & Live Tour Buttons',
        detail:
          'Open the full searchable Feature Guide modal or restart this 10-step spotlight tour from any tab.',
      },
      {
        label: 'Gates Status Pill (e.g. 5/5 Gates Pass)',
        detail:
          'Displays live Pass, Review, or Fail readiness from the latest Web Worker run and jumps directly to Methodology verification.',
      },
    ],
    tryIt:
      'Click the Dark / Light toggle in the top right to see both interface surfaces and map tiles switch instantly.',
    tip: 'Your selected city, custom search result, budget quota, and active simulation day remain synchronized as you switch tabs.',
  },
  {
    id: 'city-scenarios-search',
    stepNumber: 2,
    target: 'city-scenarios',
    tab: 'simulator',
    tabLabel: 'Simulator · Scenarios',
    title: '2. 4 Calibrated Urban Presets & Global City Search',
    summary:
      'Test four reproducible inland urban benchmarks or search any real city worldwide using the free Open-Meteo Geocoding and Forecast APIs with zero backend server.',
    controls: [
      {
        label: '4 Built-In Calibrated Presets',
        detail:
          'Metro Tropica (18 wards, Dengue), Harbor Corridor (16 wards, Resp.), Highland Ring (16 wards, Resp.), and Monsoon Delta (18 wards, Dengue).',
      },
      {
        label: 'Simulate Any City (Open-Meteo)',
        detail:
          'Type any city (e.g. Surakarta, Surabaya, London, Tokyo, Nairobi) and click Find to center an 18-ward cosine-scaled grid on its coordinates.',
      },
      {
        label: 'Automatic Latitude Calibration',
        detail:
          'Tropical cities (|lat| <= 23.5°) auto-select Dengue with tropical ICU scaling; temperate cities (|lat| > 23.5°) auto-select Respiratory with respiratory ICU scaling.',
      },
      {
        label: 'Smart Peak Season Restore',
        detail:
          'Custom cities load live Open-Meteo weather by default; clicking back to any built-in preset automatically restores its calibrated Peak Season benchmark.',
      },
    ],
    tryIt:
      'Search "London" or "Surabaya" in Simulate Any City, select a match, and watch the map pan, weather update, and optimizer solve in under a second.',
    tip: 'If you are offline or geocoding times out after 3 seconds, built-in presets and latitude-band seasonal climatology keep the entire simulator functional.',
  },
  {
    id: 'model-parameters-controls',
    stepNumber: 3,
    target: 'model-controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Engine',
    title: '3. Disease Model, Weekly Quota & Model Parameters',
    summary:
      'Control transmission dynamics, weekly intervention capacity, climate forcing, and epidemiological stress assumptions. Every run executes locally in a dedicated Web Worker.',
    controls: [
      {
        label: 'Disease Model (Dengue vs Respiratory)',
        detail:
          'Switches between climate-modulated Vector SEIR-SEI (mosquito incubation & rainfall carrying capacity) and Direct-Contact SEIR corridor spread.',
      },
      {
        label: 'Budget Slider (10% to 40%, 5% steps)',
        detail:
          'Fixes identical weekly team quota K = max(1, floor(B * N)) wards per week for both Without SennaGrid and With SennaGrid.',
      },
      {
        label: 'Climate Forcing (Peak Season vs Live)',
        detail:
          'Toggle calibrated seasonal stress against real 14-day + forecast Open-Meteo temperature (°C) and precipitation (mm/d).',
      },
      {
        label: 'ICU Rate, Commuter Outflow & Team Efficacy',
        detail:
          'Tune severity (0.5% to 3.5%), cross-ward mobility (0% to 40%), and team suppression (30% to 90%), or click Reset Defaults to restore calibrated baselines.',
      },
      {
        label: 'Run Optimization & Solver Telemetry',
        detail:
          'Executes Reactive Baseline + Stage 1 multi-seed + up to 250 Stage 2 swaps and displays evaluated plan count, solve time, Horizon, RK4 dt=0.25d, and total City Beds.',
      },
    ],
    tryIt:
      'Drag Budget from 20% down to 15% and up to 30% to see how tight team scarcity widens the advantage of proactive hub preemption.',
    tip: 'Both strategies always share the exact same quota K per week, proving that better hospital survival comes from smarter spatial timing rather than extra funding.',
  },
  {
    id: 'kpi-strip',
    stepNumber: 4,
    target: 'kpi-strip',
    tab: 'simulator',
    tabLabel: 'Simulator · Impact',
    title: '4. 91-Day Impact Comparison Strip',
    summary:
      'Compare reactive case-chasing (rose strikethrough) directly against SennaGrid predictive dispatch (teal) across collapse duration, bed shortfalls, and verification trade-offs.',
    controls: [
      {
        label: 'Hospital Collapse (days)',
        detail:
          'Counts total days across the 91-day horizon where one or more wards exceed 100% of their dedicated ICU bed capacity.',
      },
      {
        label: 'Peak ICU Overflow (beds vs bed-days)',
        detail:
          'Headline shows worst single-day simultaneous shortage (beds); subtitle separates cumulative 91-day severity averted (bed-days, reactive vs optimized).',
      },
      {
        label: 'Policy Gates & Trade-off',
        detail:
          'Shows gates passed (clickable jump to Methodology) and honestly flags any mild-case trade-off percentage accepted to shield vulnerable ICUs.',
      },
    ],
    tryIt:
      'Click the "Passed" score in the third card to jump directly to the 5 Policy & Integrity Gates audit panel.',
    tip: 'Keeping peak simultaneous beds separate from cumulative bed-days prevents misleading double-counting during multi-week respiratory waves.',
  },
  {
    id: 'split-map',
    stepNumber: 5,
    target: 'split-map',
    tab: 'simulator',
    tabLabel: 'Simulator · Spatial Map',
    title: '5. Synchronized Split Maps, Watchlist & Ward Inspector',
    summary:
      'Compare ward-level ICU stress side by side on 60 FPS GPU-styled MapLibre GL JS v5 maps, switch to a ranked Watchlist table, or click any district for a head-to-head ward breakdown.',
    controls: [
      {
        label: 'Stress Ramp & Active Team Outlines',
        detail:
          'Polygons encode <60% Safe, 60-99% Strained, and >=100% Overflow. Rose outlines (left) and teal outlines (right) mark wards with active field teams in the current week.',
      },
      {
        label: 'Dynamic City & Weather Header Badge',
        detail:
          'Displays the active city name plus an explicit "Normalized grid + live weather" or "Normalized grid + seasonal weather" badge for searched cities.',
      },
      {
        label: 'Toolbar: Labels, Flows, Sync Pan & Reset',
        detail:
          'Cycle Labels (Key Wards / All Wards / Off), toggle gravity Commuter Flows (W_ij), lock dual-map Sync Pan, or click Reset Framing to refit all districts.',
      },
      {
        label: 'Map | Watchlist & Inspect Ward',
        detail:
          'Switch to Watchlist for a ranked ICU utilization table, hover any ward for a live tooltip, or click a polygon / Inspect Ward dropdown to open District Inspector.',
      },
    ],
    tryIt:
      'Click a teal-outlined ward on the right map to open District Inspector and compare its reactive vs SennaGrid active cases and ICU load.',
    tip: 'On mobile screens (<720px), the split pane automatically becomes a clean Without / With SennaGrid switcher with 44px touch targets.',
  },
  {
    id: 'timeline-player',
    stepNumber: 6,
    target: 'timeline-player',
    tab: 'simulator',
    tabLabel: 'Simulator · Playback',
    title: '6. 91-Day Timeline Scrubber & Peak Surge Jump',
    summary:
      'Replay the entire 13-week outbreak day by day at 60 FPS or snap straight to the reactive peak ICU crisis day.',
    controls: [
      {
        label: 'Play / Pause & Day Scrubber (Day 0 to 91)',
        detail:
          'Drives real-time MapLibre feature-state updates, ward tooltips, District Inspector figures, and chart day markers simultaneously.',
      },
      {
        label: 'Jump: Peak (DX)',
        detail:
          'Locks immediately onto the worst reactive ICU stress day so hospital capacity contrasts stand out clearly.',
      },
      {
        label: '1x / 2x / 4x Speed Selector',
        detail:
          'Scales animation playback velocity from 6 to 24 simulated days per second without dropping frames.',
      },
      {
        label: 'Keyboard Shortcuts',
        detail:
          'Press Space to play or pause, Left/Right arrows to step -1/+1 day, and Escape to clear ward inspection.',
      },
    ],
    tryIt:
      'Drag the scrubber to Day 0, select 2x speed, and press Play to watch SennaGrid intercept commuter hubs before peripheral wards breach.',
    tip: 'Every city change automatically focuses the timeline on its peak crisis day so you immediately see the highest-impact comparison.',
  },
  {
    id: 'epidemic-charts',
    stepNumber: 7,
    target: 'epidemic-charts',
    tab: 'simulator',
    tabLabel: 'Simulator · Analytics',
    title: '7. Outbreak Trajectory & 5-Axis Strategy Fit',
    summary:
      'Compare daily citywide ICU overflow or active case trajectories alongside five engine-normalized Strategy Fit scores against Reactive Baseline.',
    controls: [
      {
        label: 'Overflow | Cases Toggle',
        detail:
          'Switch between daily excess ICU beds above local ward limits (beds) and citywide active infections (compact k-notation for large respiratory surges).',
      },
      {
        label: 'Click-to-Scrub Area Chart',
        detail:
          'Click any day along the curve to move the vertical cursor, timeline scrubber, and both split maps to that exact day.',
      },
      {
        label: 'Dashed Rose vs Solid Teal Curves',
        detail:
          'Dashed rose tracks Without SennaGrid (Reactive); solid teal tracks With SennaGrid, with exact peak summaries in the header.',
      },
      {
        label: '5-Axis Strategy Fit Bars (0 to 100)',
        detail:
          'Quantifies Collapse Prevention, Peak ICU Safety, Hub Containment, Cost Efficiency, and Cases Control directly from engine outputs.',
      },
    ],
    tryIt:
      'Toggle from Overflow to Cases and click near the peak of the dashed rose curve to inspect that exact surge day on the maps above.',
    tip: 'When ICU-first optimization shields hospitals via a small mild-case trade-off, Cases Control honestly reports 0 with the exact +X.XX% trade-off rather than hiding it.',
  },
  {
    id: 'dispatch-matrix',
    stepNumber: 8,
    target: 'dispatch-matrix',
    tab: 'schedule',
    tabLabel: 'Weekly Plan · Schedule',
    title: '8. 13-Week H / S / I Dispatch Matrix & Field Assignments',
    summary:
      'Translate spatial optimization into an actionable 13-week municipal deployment roster showing exactly which wards receive teams each week and why.',
    controls: [
      {
        label: 'H (Hub Containment, teal)',
        detail:
          'Targets high-centrality commuter hubs early to choke off cross-district epidemic export before suburbs surge.',
      },
      {
        label: 'S (Surge Intercept, amber)',
        detail:
          'Intercepts fast-accelerating local clusters before active infections translate into ICU bed saturation.',
      },
      {
        label: 'I (ICU Shield, rose)',
        detail:
          'Protects capacity-constrained wards projected to breach 100% local ICU occupancy under baseline spread.',
      },
      {
        label: 'Click-to-Map & Multi-Filter Field Table',
        detail:
          'Click any H/S/I tile or ward link to jump back to that ward and week on the Simulator map; filter Field Assignments by Week, Zone Type, Rationale, or search query with 10-row paging.',
      },
    ],
    tryIt:
      'Click any H, S, or I cell inside Week 1 to jump straight to that ward on Day 0 of the Simulator map, or toggle "Show all wards" below the matrix.',
    tip: 'The matrix header enforces weekly quota transparency: every week deploys exactly K / K teams with zero hidden budget overruns.',
  },
  {
    id: 'swap-trace-exports',
    stepNumber: 9,
    target: 'swap-trace',
    tab: 'schedule',
    tabLabel: 'Weekly Plan · Audit & Export',
    title: '9. Stage 2 Swap Trace Audit Log & CSV/JSON Exports',
    summary:
      'Audit every accepted Stage 2 coordinate reallocation that improved ICU safety, and export operational CSV dispatch rosters or complete JSON simulation payloads.',
    controls: [
      {
        label: 'Expand Log (Stage 2 Swap Trace)',
        detail:
          'Reveals accepted block-swap and 1-swap reallocations with Iteration (#), multi-pass Pass (P1, P2...), Week (W), Removed -> Added District, Overflow Saved (bed-d), and Cost Delta.',
      },
      {
        label: 'Multi-Pass ICU-First Transparency',
        detail:
          'Proves how Stage 2 refines Stage 1 receding-horizon seeds under the 250-evaluation cap and Hospital Safety Guardrail.',
      },
      {
        label: 'Export CSV (Top of Weekly Plan)',
        detail:
          'Downloads an RFC-4180 field deployment spreadsheet with week, district, zone type, protocol, rationale, ICU load, capacity, hub centrality, and risk score.',
      },
      {
        label: 'Export JSON (Top of Weekly Plan)',
        detail:
          'Downloads the full deterministic run payload: parameters, 91-day climate series, daily curves, KPI summaries, Strategy Fit, 5 Policy Gates, and complete swap trace.',
      },
    ],
    tryIt:
      'Click "Expand Log" on Stage 2 Swap Trace to inspect individual ward swaps, or scroll to the top of Weekly Plan to download CSV / JSON.',
    tip: 'If Stage 1 already reached a locally optimal zero-overflow schedule, Swap Trace explicitly reports 0 swaps needed rather than fabricating steps.',
  },
  {
    id: 'methodology-gates',
    stepNumber: 10,
    target: 'methodology-gates',
    tab: 'methodology',
    tabLabel: 'Methodology · Proof',
    title: '10. Policy Integrity Gates, Equations & Pipeline Scope',
    summary:
      'Inspect all five automated verification guardrails, exact gravity and compartmental ODE equations, and the pure TypeScript client-side execution pipeline.',
    controls: [
      {
        label: '5 Deterministic Integrity & Policy Gates',
        detail:
          'Checks ODE Mass Conservation (<1e-9 error), Weekly Budget Cap (<= K/wk), Objective Dominance (J_opt <= J_ref), ICU Collapse Prevention, and Early Hub Coverage.',
      },
      {
        label: 'Spatial Gravity & RK4 ODE Cards',
        detail:
          'Shows Haversine gravity weights G_ij / W_ij, active Vector SEIR-SEI or Direct SEIR force-of-infection formula, and fixed-step RK4 (dt = 0.25d, 91d).',
      },
      {
        label: 'Two-Stage Optimizer & Safety Guardrail',
        detail:
          'Minimizes J(U) = Sum[25 * max(0, ICU_t - C_i) + I_t] with an automatic fallback ensuring SennaGrid never worsens collapse days or total overflow.',
      },
      {
        label: '5-Step Pipeline & Benchmark Scope',
        detail:
          'Documents Geometry & Beds -> Gravity Kernel -> RK4 Trajectory -> Policy Gates -> 13-Week Dispatch, clarifying synthetic research scope vs clinical directives.',
      },
    ],
    tryIt:
      'Switch between Dengue and Respiratory on Simulator, then return here to see the active ODE equation card and gate observations update deterministically.',
    tip: 'Zero backend servers, zero generative guessing, and zero hidden heuristics: every metric on the site originates from @sennagrid/engine.',
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
    title: 'Sticky Workspace Navigation & Live Gates Pill',
    summary:
      'Always-reachable 56px sticky bar separating spatial simulation, 13-week operational planning, and mathematical auditing while surfacing real-time verification status.',
    capabilities: [
      'Simulator tab: sidebar controls, 91-day KPI strip, dual MapLibre maps, Watchlist, Ward Inspector, playback bar, and trajectory charts.',
      'Weekly Plan tab: 13-week H/S/I coverage matrix, filterable ward dispatch table, Stage 2 Swap Trace log, and CSV/JSON exports.',
      'Methodology tab: 5 deterministic Integrity & Policy Gates, mathematical equation cards, and 5-step execution pipeline.',
      'Live Gates pill (e.g. 5/5 Gates Pass): dynamically reflects Pass, Review, or Fail readiness and jumps directly to Methodology.',
    ],
    tryAction: 'Click the Gates pill on the top right at any time to audit all 5 solver guardrails.',
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
      'Switches all UI surfaces, Recharts palettes, and MapLibre basemaps between high-legibility Obsidian Dark and glare-free Warm Paper Light.',
    capabilities: [
      'Defaults to Obsidian Dark (#121110 canvas, #1a1917 cards) with pre-paint persistence in browser localStorage.',
      'Warm Paper Light uses archival cream (#f5f2eb / #fbf9f5) surfaces and swaps basemaps smoothly to Carto Positron.',
      'Carto Dark Matter vector tiles load automatically in Dark mode and abort cleanly on rapid toggles without false offline alerts.',
      'Maintains WCAG AA text contrast and clear seafoam-teal, amber, and rose severity encoding in both themes.',
    ],
    tryAction: 'Toggle Dark / Light in the header to inspect coastline clarity on Carto Positron Light.',
    keywords: ['dark mode', 'light mode', 'theme', 'obsidian', 'warm paper', 'carto', 'basemap', 'contrast'],
  },
  {
    id: 'city-presets',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Scenarios',
    tourTarget: 'city-scenarios',
    tourStepIndex: 1,
    title: '4 Calibrated Inland Urban Benchmarks',
    summary:
      'Switch between four reproducible metropolitan topologies anchored cleanly on urban terrain to stress-test Dengue and Respiratory containment.',
    capabilities: [
      'Metro Tropica (18 wards, 1.39M pop, Dengue): dense tropical Jakarta basin with central hospital cores and rail hubs.',
      'Harbor Corridor (16 wards, 681K pop, Respiratory): linear urban corridor west of Tokyo Bay testing commuter bottlenecks.',
      'Highland Ring (16 wards, 810K pop, Respiratory): landlocked Nairobi upland plateau with 3 peripheral outbreak gateways.',
      'Monsoon Delta (18 wards, 1.42M pop, Dengue): humid Bangkok river plain linking canal blocks and intercity rail exchanges.',
    ],
    tryAction: 'Click across all 4 cards under City Scenario to compare how urban geometry changes hub dispatch.',
    keywords: [
      'metro tropica',
      'harbor corridor',
      'highland ring',
      'monsoon delta',
      'jakarta',
      'tokyo',
      'nairobi',
      'bangkok',
      'presets',
      'scenario',
    ],
  },
  {
    id: 'global-city-search',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Scenarios',
    tourTarget: 'city-scenarios',
    tourStepIndex: 1,
    title: 'Simulate Any City Worldwide (Open-Meteo Geocoding)',
    summary:
      'Search any real city globally without API keys, project a metric-scaled 18-ward benchmark onto its coordinates, and run with live local weather.',
    capabilities: [
      'Uses free Open-Meteo Geocoding (3s timeout, bounds validation, deduplication) and passes exact coordinates to Open-Meteo Forecast.',
      'Compensates east-west polygon width by 1 / cos(lat) so 18-ward grids stay geometrically proportional from the equator to high latitudes.',
      'Automatically pairs tropical cities (|lat| <= 23.5°) with Dengue + tropical bed scaling, and temperate cities (|lat| > 23.5°) with Respiratory + respiratory bed scaling.',
      'Falls back seamlessly to latitude-band climatology if offline, and automatically restores Peak Season when switching back to built-in presets.',
    ],
    tryAction: 'Type "Surakarta", "Surabaya", or "London" into Simulate Any City and press Find.',
    keywords: [
      'custom city',
      'search city',
      'simulate any city',
      'geocoding',
      'open-meteo',
      'london',
      'surabaya',
      'surakarta',
      'worldwide',
      'latitude',
      'cosine',
    ],
  },
  {
    id: 'disease-budget-cta',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Engine',
    tourTarget: 'model-controls',
    tourStepIndex: 2,
    title: 'Disease Models, Weekly Budget Quota & Worker Telemetry',
    summary:
      'Configure pathogen mechanics and scarce weekly team capacity while ensuring an exact head-to-head fairness constraint between strategies.',
    capabilities: [
      'Dengue (Vector SEIR-SEI): models coupled human-mosquito compartments modulated by temperature (phi_T) and 7-day rolling rainfall (phi_R).',
      'Respiratory (Direct-Contact SEIR): models rapid corridor transmission through Haversine commuter coupling W_ij.',
      'Budget slider (10% to 40%, 5% steps): fixes identical weekly quota K = max(1, floor(B * N)) wards/week for both Reactive and SennaGrid.',
      'Run Optimization CTA executes inside a non-blocking Web Worker (latest-request-wins) and displays evaluated plans, solve time, Horizon, RK4 dt, and total City Beds.',
    ],
    tryAction: 'Try Budget 15% vs 30% on Harbor Corridor or London to see collapse days drop as team quota grows.',
    keywords: ['dengue', 'respiratory', 'seir', 'vector', 'budget', 'quota', 'worker', 'run optimization'],
  },
  {
    id: 'climate-model-params',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Engine',
    tourTarget: 'model-controls',
    tourStepIndex: 2,
    title: 'Climate Forcing & Epidemiological Sensitivity Sliders',
    summary:
      'Stress-test dispatch robustness across live weather anomalies, clinical severity shifts, mobility levels, and intervention efficacy.',
    capabilities: [
      'Climate Forcing toggle: Peak Season uses bundled seasonal climatology; Live Weather fetches 7-day past rain + 14-day forecast from Open-Meteo.',
      'ICU Rate slider (0.5% to 3.5%): adjusts the fraction of active infections requiring critical-care beds.',
      'Commuter Outflow slider (0% to 40%): scales cross-ward daily mixing strength in the gravity matrix W_ij.',
      'Team Efficacy slider (30% to 90%) + Reset Defaults: tests weaker/stronger field suppression and restores calibrated defaults in one click.',
    ],
    tryAction: 'Raise ICU Rate to 2.0% or switch Climate Forcing between Peak Season and Live Weather to test sensitivity.',
    keywords: ['climate', 'peak season', 'live weather', 'open-meteo', 'icu rate', 'commuter outflow', 'mobility', 'efficacy', 'reset'],
  },
  {
    id: 'impact-kpi-strip',
    category: 'controls',
    tab: 'simulator',
    tabLabel: 'Simulator · Impact',
    tourTarget: 'kpi-strip',
    tourStepIndex: 3,
    title: '91-Day Impact Comparison KPI Strip',
    summary:
      'Summarizes engine-verified 91-day outcomes comparing Without SennaGrid (rose strikethrough) against With SennaGrid (teal) in three unambiguous cards.',
    capabilities: [
      'Hospital Collapse: compares total days where any ward exceeds 100% of its dedicated ICU bed capacity.',
      'Peak ICU Overflow: clearly separates worst-day simultaneous bed shortfall (beds) from cumulative 91-day severity averted (bed-days).',
      'Policy Gates & Trade-off: displays overall gate pass ratio (clickable shortcut to Methodology) and total cumulative cases averted.',
      'Honest Trade-off Disclosure: whenever ICU-first sweeps cause a small mild-case increase, it highlights the exact +X.XX% trade-off in amber.',
    ],
    tryAction: 'Compare the headline Peak beds against the subtitle bed-days averted on Highland Ring or Harbor Corridor.',
    keywords: ['kpi', 'hospital collapse', 'icu overflow', 'beds', 'bed-days', 'trade-off', 'reactive', 'summary'],
  },
  {
    id: 'split-screen-maps',
    category: 'maps',
    tab: 'simulator',
    tabLabel: 'Simulator · Spatial Map',
    tourTarget: 'split-map',
    tourStepIndex: 4,
    title: 'Synchronized Dual Maps, Severity Ramp & Weather Badges',
    summary:
      'Side-by-side MapLibre GL JS v5 choropleths updating district stress colors at 60 FPS via feature-state without rebuilding GeoJSON polygons.',
    capabilities: [
      'Left pane (Without SennaGrid) shows reactive case-chasing with rose active team outlines; Right pane (With SennaGrid) shows predictive dispatch with teal outlines.',
      'Uniform 3-tier severity scale: <60% Safe, 60-99% Strained, and >=100% Overflow with live daily overflow and breached-ward counters above each map.',
      'Dynamic Custom City header badge truthfully displays "Normalized grid + live weather" (Open-Meteo) or "Normalized grid + seasonal weather" (Peak Season / offline).',
      'Automatic offline vector background fallback if tiles fail, plus a dedicated Without / With SennaGrid toggle on screens under 720px.',
    ],
    tryAction: 'Hover over any district polygon on either map to inspect live active cases, ICU load %, and team standby/active status.',
    keywords: ['map', 'split screen', 'maplibre', 'stress', 'safe', 'strained', 'overflow', 'heatmap', 'badge', 'offline'],
  },
  {
    id: 'map-toolbar-inspector',
    category: 'maps',
    tab: 'simulator',
    tabLabel: 'Simulator · Spatial Map',
    tourTarget: 'split-map',
    tourStepIndex: 4,
    title: 'Map Toolbar, Ranked Watchlist & District Inspector',
    summary:
      'Control map overlays, switch to a sortable tabular ICU watchlist, or open a head-to-head diagnostic strip for any individual ward.',
    capabilities: [
      'Labels button cycles 3 modes: Key Wards (top non-overlapping stressed badges), All Wards, or Off.',
      'Commuter Flows button toggles dashed gravity transit corridors (top 16 strongest W_ij connections) across both maps.',
      'Sync Pan locks pan, zoom, and bearing between left and right maps; Reset Framing restores full-city bounds immediately.',
      'Map | Watchlist switch opens a ranked ward ICU utilization table; clicking any polygon, watchlist row, or Inspect Ward selector opens District Inspector.',
    ],
    tryAction: 'Switch Map -> Watchlist to sort highest-stress wards, then click any row to inspect it side by side.',
    keywords: ['labels', 'commuter flows', 'sync pan', 'reset framing', 'watchlist', 'inspect ward', 'inspector', 'tooltip'],
  },
  {
    id: 'timeline-playback',
    category: 'timeline_charts',
    tab: 'simulator',
    tabLabel: 'Simulator · Playback',
    tourTarget: 'timeline-player',
    tourStepIndex: 5,
    title: '91-Day Interactive Timeline & Peak Surge Jump',
    summary:
      'Scrub any day from Day 0 to Day 91 (Weeks 1 to 13), animate multi-week containment waves, or jump directly to the peak reactive crisis day.',
    capabilities: [
      'Play / Pause button drives smooth requestAnimationFrame playback at 1x, 2x, or 4x speed across the full 91-day horizon.',
      'Day scrubber synchronizes both dual maps, hover tooltips, District Inspector metrics, and trajectory chart reference lines at 60 FPS.',
      'Jump: Peak (DX) snaps straight to the reactive peak ICU surge day computed by the engine.',
      'Full keyboard support: Space toggles playback and Left/Right arrow keys step -1/+1 day while on Simulator.',
    ],
    tryAction: 'Click Jump: Peak (DX) to inspect maximum hospital contrast, then drag to Day 0 and play at 2x speed.',
    keywords: ['timeline', 'playback', 'jump to peak', 'scrubber', 'speed', '1x', '2x', '4x', 'play', 'pause'],
  },
  {
    id: 'trajectory-strategy-fit',
    category: 'timeline_charts',
    tab: 'simulator',
    tabLabel: 'Simulator · Analytics',
    tourTarget: 'epidemic-charts',
    tourStepIndex: 6,
    title: 'ICU & Infection Trajectories + 5-Axis Strategy Fit',
    summary:
      'Visualizes 91-day outbreak curves alongside five deterministic Strategy Fit performance bars normalized against Reactive Baseline.',
    capabilities: [
      'Overflow | Cases switch toggles between excess ICU beds above ward capacity and citywide active infections with compact k-notation ticks.',
      'Dashed rose area represents Without SennaGrid; solid teal area represents With SennaGrid, with an interactive day-by-day hover tooltip.',
      'Clicking any point inside the chart area immediately scrubs the timeline and both maps to that exact day.',
      '5-Axis Strategy Fit scores Collapse Prevention, Peak ICU Safety, Hub Containment, Cost Efficiency, and Cases Control (honestly showing 0 + trade-off % when ICU shielding trades mild cases).',
    ],
    tryAction: 'Click directly on the peak of the dashed rose curve to scrub the maps above to that exact day.',
    keywords: ['charts', 'trajectory', 'overflow', 'cases', 'strategy fit', 'recharts', 'radar', 'scrub'],
  },
  {
    id: 'weekly-coverage-matrix',
    category: 'dispatch',
    tab: 'schedule',
    tabLabel: 'Weekly Plan · Schedule',
    tourTarget: 'dispatch-matrix',
    tourStepIndex: 7,
    title: '13-Week H / S / I Dispatch Matrix & Filterable Field Table',
    summary:
      'Turns optimization schedules into an auditable 13-week municipal deployment plan detailing every team assignment and operational rationale.',
    capabilities: [
      'H (Hub Containment, teal): targets high-centrality commuter hubs early to block downstream spread.',
      'S (Surge Intercept, amber): intercepts fast-accelerating local clusters before hospital capacity saturates.',
      'I (ICU Shield, rose): prioritizes low-bed wards projected to breach 100% ICU occupancy.',
      'Click any H/S/I cell or ward button to jump straight to that ward and week on the Simulator map; filter Field Assignments by Week, Zone Type, Rationale, or search with 10-row paging.',
    ],
    tryAction: 'Open Weekly Plan, filter Field Assignments by "ICU Capacity Shield", and click any ward to inspect it on the map.',
    keywords: ['matrix', 'dispatch', 'schedule', 'h', 's', 'i', 'hub', 'surge', 'shield', 'filter', 'pagination', 'roster'],
  },
  {
    id: 'swap-trace-exports',
    category: 'dispatch',
    tab: 'schedule',
    tabLabel: 'Weekly Plan · Audit & Export',
    tourTarget: 'swap-trace',
    tourStepIndex: 8,
    title: 'Stage 2 Swap Trace Audit Log & CSV/JSON Exports',
    summary:
      'Audits every accepted Stage 2 coordinate reallocation and downloads deployment spreadsheets or complete machine-readable simulation runs.',
    capabilities: [
      'Stage 2 Swap Trace (collapsible log): records Iteration (#), multi-pass Pass (P1..Pn), Week (W), Removed -> Added District, Overflow Saved (bed-d), and signed Objective Cost Delta.',
      'Explains transparently when Stage 1 receding-horizon seeds are already locally optimal (0 swaps needed).',
      'Export CSV downloads RFC-4180 operational dispatch sheets ready for public-health field teams.',
      'Export JSON downloads full run provenance: parameters, 91-day weather series, daily trajectories, KPI summaries, Strategy Fit, 5 Policy Gates, and complete swap trace.',
    ],
    tryAction: 'Expand Stage 2 Swap Trace on Harbor Corridor or Highland Ring to audit every multi-pass swap, or click Export CSV / JSON.',
    keywords: ['swap trace', 'csv', 'json', 'export', 'stage 2', 'block swap', 'download', 'audit', 'pass'],
  },
  {
    id: 'policy-gates-math',
    category: 'methodology',
    tab: 'methodology',
    tabLabel: 'Methodology · Proof',
    tourTarget: 'methodology-gates',
    tourStepIndex: 9,
    title: '5 Policy Gates, Mathematical Equations & Execution Pipeline',
    summary:
      'Verifies numerical rigor automatically on every run and exposes exact formulas implemented inside @sennagrid/engine.',
    capabilities: [
      '5 Integrity Gates: ODE Mass Conservation (<1e-9), Weekly Budget Cap (<= K/wk), Objective Dominance (J_opt <= J_ref), ICU Collapse Prevention, and Early Mobility Hub Coverage.',
      'Spatial Gravity Kernel computes symmetric Haversine distances (R = 6,371 km) and row-stochastic commuter coupling weights W_ij.',
      'Compartmental RK4 ODE Solver integrates step dt = 0.25d over contiguous Float64Array buffers for 91 days with zero NaN tolerance.',
      'Two-Stage Constrained Optimizer combines receding-horizon initialization with multi-pass ICU-first coordinate swaps and the Hospital Safety Guardrail.',
    ],
    tryAction: 'Open Methodology to inspect exact observed gate measurements (e.g. 2.00e-15 mass error) alongside active equations.',
    keywords: ['policy gates', 'math', 'equations', 'rk4', 'gravity', 'optimizer', 'guardrail', 'conservation', 'pipeline'],
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
      item.tryAction,
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
