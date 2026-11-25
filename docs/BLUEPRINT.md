# Technical Architecture & Engineering Blueprint — SennaGrid

> **Status:** Locked Specification for Implementation  
> **Companion Document:** [PRD.md](./PRD.md)  
> **Docs Index:** [README.md](./README.md)

Dokumen ini mengunci seluruh keputusan arsitektur, struktur file, kontrak tipe data, konstanta matematis yang sebelumnya belum didefinisikan, protokol Web Worker, serta rencana pengujian untuk implementasi **SennaGrid**.

---

## 1. Locked Technology Stack

| Layer | Pilihan Terkunci | Alasan Teknis |
| :--- | :--- | :--- |
| **Build Tool & App** | **Vite 6 + React 19 + TypeScript 5 (`strict`)** | 100% static SPA tanpa kompleksitas SSR/hydration Next.js saat memakai WebGL (`maplibre-gl`) dan native ESM Web Workers; cold-start nol di Vercel. |
| **Styling & Icons** | **Tailwind CSS v4 + `lucide-react`** | Utilitas cepat, dukungan font monospace (`tabular-nums`), ikon garis minimalis tanpa emoji. |
| **Mapping Engine** | **`maplibre-gl`** | Kontrol kamera sinkron presisi tinggi (`jumpTo` tanpa animasi feedback loop) + basemap Carto Dark Matter tanpa API token berbayar. |
| **Charts** | **`recharts`** | Komponen SVG deklaratif (`AreaChart`/`LineChart`/`RadarChart`) yang mudah disinkronkan dengan `ReferenceLine` playhead timeline. |
| **State Store** | **`zustand`** | Store minimal untuk menyinkronkan parameter, hasil simulasi worker, status cuaca, distrik terpilih, dan hari playback di 3 tab UI. |
| **Testing** | **`vitest`** | Eksekusi super cepat langsung pada modul TypeScript murni di `src/engine/`. |

---

## 2. Directory & Module Structure (npm Workspaces Monorepo)

```text
Sennagrid/
├── package.json                        # Root workspaces orchestrator (dev, build, test, typecheck)
├── tsconfig.base.json                  # Shared strict TypeScript compiler options
├── vercel.json                         # Static deploy config (apps/web/dist)
├── docs/
│   ├── PRD.md
│   └── BLUEPRINT.md
├── packages/
│   └── engine/                         # @sennagrid/engine — PURE TypeScript (ZERO React/DOM)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts                # Public barrel export
│           ├── types.ts                # Kontrak data, parameter, state, hasil, gates
│           ├── mobility.ts             # Haversine distance, Gravity Matrix W, HubIndex
│           ├── climate.ts              # phi_T(T), phi_R(R_rain), ekstensi musiman 91 hari
│           ├── solver.ts               # RK4 Float64Array integrator (SEIR-SEI & SEIR) + checkpoint
│           ├── optimizer.ts            # Reactive Baseline + Stage 1 + bounded multi-pass Stage 2 + impact metrics
│           ├── gates.ts                # 5 Deterministic Policy & Integrity Gates
│           └── __tests__/
│               ├── mobility.test.ts
│               ├── climate.test.ts
│               ├── solver.test.ts
│               ├── optimizer.test.ts
│               └── gates.test.ts
├── apps/
│   └── web/                            # @sennagrid/web — Vite + React 19 + MapLibre + Recharts
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.app.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css
│           ├── vite-env.d.ts
│           ├── workers/
│           │   └── optimizer.worker.ts # Native Web Worker wrapper + stale-run handling
│           ├── data/
│           │   └── regions/
│           │       ├── index.ts        # Registry preset wilayah
│           │       ├── metroTropica.ts # 18 distrik (Basin Tropis, Dengue-focused)
│           │       └── harborCorridor.ts # 16 distrik (Koridor Pesisir, Respiratory-focused)
│           ├── services/
│           │   ├── weather.ts          # Open-Meteo client (timeout 3s) + fallback klimatologi
│           │   └── export.ts           # Generator CSV Dispatch Plan & JSON Full Run
│           ├── store/
│           │   └── useSimulationStore.ts # Zustand store + orkestrasi worker requestId
│           └── components/
│               ├── layout/
│               │   ├── ControlBar.tsx
│               │   ├── HeaderBar.tsx
│               │   └── TabNav.tsx
│               ├── simulator/
│               │   ├── KpiStrip.tsx
│               │   ├── SplitMapView.tsx
│               │   ├── TimelinePlayer.tsx
│               │   ├── EpidemicCharts.tsx
│               │   └── DistrictInspector.tsx
│               ├── schedule/
│               │   ├── DispatchSchedule.tsx
│               │   └── SwapTracePanel.tsx
│               ├── methodology/
│               │   ├── MethodologyView.tsx
│               │   └── PolicyGatesPanel.tsx
│               └── onboarding/
│                   └── InteractiveTour.tsx
└── README.md
```

---

## 3. Core Engine Specification (Unambiguous Math & Constants)

### 3.1 Data Contracts (`src/engine/types.ts`)
```ts
export type DiseaseMode = "vector_seir_sei" | "direct_seir";
export type RegionId = "metro_tropica" | "harbor_corridor";
export type ZoneType = "core" | "transit_hub" | "residential" | "peri_urban";
export type RationaleTag =
  | "Mobility Hub Containment"
  | "Pre-emptive Surge Intercept"
  | "ICU Capacity Shield";

export interface DistrictProperties {
  id: string;
  name: string;
  population: number;
  icuBeds: number;
  centroid: [number, number]; // [lng, lat]
  initialCases: number;
  zoneType: ZoneType;
}

export interface DailyClimatePoint {
  day: number;            // 0..91
  temperatureC: number;
  precipitationMm: number;
  rollingRain7dMm: number; // 7-day rolling sum ending at day t
}

export interface ClimateSeries {
  source: "open_meteo" | "fallback_climatology";
  fetchedAtIso: string;
  anchorLat: number;
  anchorLng: number;
  meanTemp14d: number;
  meanPrecip14d: number;
  days: DailyClimatePoint[]; // length 92 (day 0..91)
}

export interface SimulationParams {
  regionId: RegionId;
  diseaseMode: DiseaseMode;
  budgetRatio: number;    // 0.10 .. 0.40
  icuRate: number;        // default 0.015; invalid or negative resolves to 0
  mobilityOutflow: number;// default 0.18; finite values clamp to 0..1
  interventionEfficacy?: number; // optional; omitted uses disease-mode default
  horizonDays: 91;        // 13 weeks
  dt: 0.25;               // fixed RK4 step
}

/** Schedule[week][districtIdx] = 0 | 1, weeks = 13 */
export type WeeklySchedule = Uint8Array[];

export interface StrategySimulationResult {
  name: "reactive" | "sennagrid";
  schedule: number[][];         // [13][N] binary 0/1
  totalCostJ: number;
  totalIcuOverflowCost: number;
  totalInfectionDays: number;
  cumulativeCases: number;
  peakActiveInfections: number;
  peakIcuDemand: number;
  peakIcuOverflow: number;
  icuCollapseDays: number;      // count of days where cityOverflow > 0
  maxMassConservationError: number;
  hasNaN: boolean;
  // Daily snapshots (length 92):
  dailyTotalActive: number[];
  dailyTotalIcuDemand: number[];
  dailyCityOverflow: number[];
  // Flattened [day * N + i] for O(1) playback rendering without allocations:
  districtActive: Float64Array; // 92 * N
  districtIcuDemand: Float64Array; // 92 * N
}

export interface DispatchAssignment {
  week: number;                 // 1..13
  districtIndex: number;
  districtId: string;
  districtName: string;
  zoneType: ZoneType;
  interventionType: "Vector Control / Fogging" | "Targeted Vaccination";
  rationale: RationaleTag;
  projectedRiskScore: number;
  icuLoadAtWeekStart: number;
  icuCapacity: number;
  hubCentrality: number;
}

export interface SwapTraceEntry {
  iteration: number;
  week: number;                 // 1..13
  pass: number;                 // 1-based Stage 2 pass
  removedDistrictId: string;
  removedDistrictName: string;
  addedDistrictId: string;
  addedDistrictName: string;
  costBefore: number;
  costAfter: number;
  costDelta: number;
  overflowSaved: number;         // non-negative saved bed-days
  overflowDelta: number;         // signed before - after, 6 decimal places
}

export interface PolicyGateResult {
  id:
    | "MASS_CONSERVATION"
    | "BUDGET_COMPLIANCE"
    | "COST_DOMINANCE"
    | "ICU_COLLAPSE_MITIGATION"
    | "HUB_COVERAGE";
  label: string;
  passed: boolean;
  observed: string;
  threshold: string;
}

export interface PolicyGateSummary {
  overallStatus: "PASS" | "REVIEW" | "FAIL";
  passedCount: number;
  totalGates: number;
  readinessScore: number; // 0..100
  gates: PolicyGateResult[];
}

export interface DistrictImpactSummary {
  districtId: string;
  districtName: string;
  reactivePeakActiveInfections: number;
  optimizedPeakActiveInfections: number;
  reactivePeakIcuDemand: number;
  optimizedPeakIcuDemand: number;
  reactivePeakIcuOverflow: number;
  optimizedPeakIcuOverflow: number;
  interventionWeeks: number;
}

export interface ImpactSummary {
  casesAverted: number;
  casesAvertedPct: number;
  peakIcuOverflowPrevented: number;
  collapseDaysSaved: number;
  costReductionPct: number;
  districtImpacts: DistrictImpactSummary[];
}

export interface ImpactRadar {
  casesControl: number;
  peakIcuSafety: number;
  collapsePrevention: number;
  hubContainment: number;
  budgetEfficiency: number;
}

export interface OptimizationOutput {
  params: SimulationParams;
  climate: ClimateSeries;
  districts: DistrictProperties[];
  hubCentrality: number[];      // length N
  totalIcuCapacity: number;
  weeklyQuotaK: number;
  reactive: StrategySimulationResult;
  sennagrid: StrategySimulationResult;
  assignments: DispatchAssignment[];
  swapTrace: SwapTraceEntry[];
  gates: PolicyGateSummary;
  impactSummary: ImpactSummary;
  impactRadar: ImpactRadar;
  evaluationsCount: number;
  solveTimeMs: number;
  improvementPct: number;
}
```

### 3.2 Spatial Gravity Matrix (`src/engine/mobility.ts`)
- **Haversine Distance ($d_{ij}$ dalam km):** $R_e = 6371.0\text{ km}$.
- **Gravity Weight:**
  $$G_{ij} = \frac{N_i^{0.6} N_j^{0.6}}{(d_{ij} + 2.0)^{1.5}} \quad (i \neq j)$$
- **Row-Normalized Mobility Matrix $W \in \mathbb{R}^{N \times N}$** (disimpan sebagai `Float64Array` berukuran $N^2$):
  $$W_{ii} = 1 - m_{\text{out}}, \qquad W_{ij} = m_{\text{out}} \frac{G_{ij}}{\sum_{k \neq i} G_{ik}} \quad (i \neq j)$$
  Default $m_{\text{out}} = 0.18$. Guard: jika $N = 1$, $W_{00} = 1$. Outflow finite dipaksa ke $[0,1]$; outflow non-finite kembali ke default.
- **Hub Centrality Index** ($\text{HubIndex}_i$, arus komuter masuk berbobot populasi):
  $$\text{HubIndex}_i = \sum_{j \neq i} W_{ji} \frac{N_j}{N_{\text{avg}}}, \qquad N_{\text{avg}} = \frac{1}{N} \sum_{k=0}^{N-1} N_k$$

### 3.3 Climate Modulation (`src/engine/climate.ts`)
- $\phi_T(T) = \max\left(0.15, \exp\left(-\frac{(T - 29.0)^2}{2 \cdot 6.5^2}\right)\right)$
- $\phi_R(R_{\text{rain}}) = 0.75 + 0.65 \cdot \frac{R_{\text{rain}}}{R_{\text{rain}} + 25.0}$
- Untuk hari $t \in [0, 91]$, ambil rolling sum 7 hari `rollingRain7dMm` dari array historis `past_days=7` (`day -7 .. -1`) + `forecast_days=14` (`day 0 .. 13`).
- Hari `14 .. 91` diperpanjang secara mulus dengan kelanjutan sinusoidal musiman berjangkar pada rata-rata 14 hari terakhir:
  $$T(t) = \bar{T}_{14d} + A_T \sin\left(\frac{2\pi (t - 14)}{91} + \phi_0\right), \quad R_{\text{day}}(t) = \max\left(0, \bar{P}_{14d} \cdot \left[1 + 0.35 \sin\left(\frac{2\pi (t - 14)}{45}\right)\right]\right)$$

### 3.4 Initial State & RK4 Integrator (`src/engine/solver.ts`)
#### Kondisi Awal di $t = 0$ (Mengunci gap spesifikasi awal)
Untuk setiap distrik $i$:
- **Manusia:**
  - $I_i(0) = \min(N_i, \text{district}[i].\text{initialCases})$
  - $E_i(0) = \min(N_i - I_i(0), \text{round}(0.6 \cdot I_i(0)))$
  - $R_i(0) = 0$
  - $S_i(0) = N_i - E_i(0) - I_i(0)$
- **Vektor (khusus Mode A `vector_seir_sei`):**
  - Hitung $\lambda_{v,i}(0)$ menggunakan $T(0)$ dan $I_k(0)$ lewat matriks $W$.
  - Tetapkan benih kuasi-ekuilibrium awal agar penularan berjalan natural sejak Hari 0 tanpa artifak lonjakan:
    - Jika $\sum_k W_{ki} I_k(0) > 0$:
      - $i_{v,i}(0) = \text{clamp}\left(\max\left(0.002, 1.5 \cdot \frac{\lambda_{v,i}(0)}{\mu_v}\right), 0, 0.04\right)$
      - $e_{v,i}(0) = \text{clamp}\left(\max\left(0.003, 2.0 \cdot \frac{\lambda_{v,i}(0)}{\sigma_v}\right), 0, 0.06\right)$
    - Jika $0$: $i_{v,i}(0) = 0, e_{v,i}(0) = 0$.
    - $s_{v,i}(0) = 1 - e_{v,i}(0) - i_{v,i}(0)$.

#### Layout `Float64Array` & Guardrail Konservasi Massa
- **Mode A (`7 * N`):** `[S, E, I, R, sv, ev, iv]` per distrik.
  - Konstanta: $b_0 = 0.50$, $\beta_{vh} = 0.40$, $\beta_{hv} = 0.40$, $m_0 = 1.6$, $\eta_{\text{vec}} = 0.65$, $\sigma_h = 1/5.5$, $\gamma_h = 1/7.0$, $\sigma_v = 1/8.0$, $\mu_v = 1/14.0$.
- **Mode B (`4 * N`):** `[S, E, I, R]` per distrik.
  - Konstanta: $\beta_0 = 0.42$, $\eta_{\text{int}} = 0.60$, $\sigma_h = 1/4.0$, $\gamma_h = 1/6.5$.
- **Efikasi Intervensi:** `SimulationParams.interventionEfficacy` di-resolve sekali di boundary engine. Nilai non-finite memakai default mode, nilai finite di bawah 0 menjadi 0, dan nilai finite di atas 1 menjadi 1. Nilai yang sudah berada di $[0,1]$ dipakai tanpa perubahan; `undefined` mempertahankan trajectory lama.
- **RK4 Integrator:** $\Delta t = 0.25\text{ hari}$ (4 sub-step per hari, total 364 langkah untuk 91 hari).
- **Conservation-Preserving Clamping:** Setelah setiap step RK4, clamp semua kompartemen ke $\ge 0$. Jika ada clamp terjadi pada distrik $i$, renormalisasi $(S_i, E_i, I_i, R_i)$ agar jumlahnya tepat $N_i$ dan $(s_{v,i}, e_{v,i}, i_{v,i})$ tepat $1.0$. Hitung dan laporkan `maxMassConservationError = max |sum - N_i| / N_i`.
- **Checkpointed Forward Pass:** Fungsi `simulateForward({ startWeek, initialState, schedule, ... })` mendukung simulasi parsial mulai dari `day = 7 * startWeek` hingga `day = 91` dengan tetap mengembalikan biaya segmen `[7 * startWeek .. 91]` sehingga evaluasi Stage 2 optimizer 2–3x lebih cepat.

### 3.5 Optimization Engine (`src/engine/optimizer.ts`)
- **Kuota Mingguan:** $K = \max(1, \lfloor B \cdot N \rfloor)$.
- **Fungsi Objektif:**
  $$J(U) = \sum_{t=0}^{91} \sum_{i=0}^{N-1} \left(25.0 \cdot \max(0, H_i(t) - C_{\text{ICU}, i}) + 1.0 \cdot I_i(t)\right), \quad H_i(t) = \rho_{\text{ICU}} \cdot I_i(t)$$
- **Strategi 1 — Reactive Baseline:**
  Di awal minggu $w \in \{0 \dots 12\}$, urutkan distrik menurut $I_i(7w)$ menurun (tie-break: `icuRatio` menurun, lalu indeks distrik), pilih top $K$ distrik untuk $u_i(w) = 1$.
- **Strategi 2 — SennaGrid Predictive Optimizer:**
  1. **Stage 1 (Multi-Seed Receding Horizon Predictive Initialization):**
     Di setiap minggu $w \in \{0 \dots 12\}$, jalankan proyeksi tanpa intervensi (`u = 0`) selama 14–28 hari dari state di hari `7w` untuk memperoleh $\Delta \hat{I}_i$. Evaluasi 4 profil *seed* prediktif bersama (kombinasi bobot deplesi $(S_i/N_i)^p$, amplifikasi hub $\text{HubIndex}_i$, dan urgensi overflow ICU). Mode Direct SEIR menambahkan satu profil overflow-focused `{ susPow: 1.0, hubW: 1.2, icuW: 15.0, overflowBoost: 20, lookaheadDays: 21 }`; profil ini dipilih berdasarkan disease mode, bukan region, dan hanya profil final terbaik yang dipertahankan runtime. Semua kandidat harus **tidak melampaui total overflow maupun hari kolaps *Reactive Baseline*** (*Hospital Safety Guardrail*).
  2. **Stage 2 (Checkpointed Hybrid Block-Swap & 1-Swap Coordinate Descent):**
     - Cache `checkpoints[0..12]`, `prefixCost[0..12]`, `prefixOverflow[0..12]`, dan `prefixCollapseDays[0..12]` milik $U_{\text{best}}$.
     - Setiap pass menjalankan *2-week sustained block swaps* lalu *1-week swaps* pada minggu $w \in \{0..10\}$. Pass berikutnya dimulai dari schedule dan checkpoint terbaik terakhir jika pass sebelumnya menerima minimal satu swap yang memperbaiki overflow ICU atau, pada overflow yang sama, biaya objektif.
     - Semua pass berbagi batas **250 evaluasi swap** dan **1.150 ms** total. Local search berhenti saat tidak ada swap yang diterima atau salah satu budget habis.
     - Stage 2 memakai urutan penerimaan **ICU-overflow-first** dengan biaya objektif sebagai tie-break: terima kandidat bila `totalOverflow` lebih rendah, atau bila overflow sama maka $J(U_{\text{cand}}) < J(U_{\text{best}})$. Setiap kandidat tetap harus memenuhi *Hospital Safety Guardrail* (`totalOverflow <= reactiveOverflow` dan `collapseDays <= reactiveCollapseDays`). Satu langkah ICU-first boleh menaikkan biaya objektif. Jadwal final tetap harus lebih murah daripada Reactive agar gate `COST_DOMINANCE` berlaku; jika jalur ICU-first tidak menghasilkan schedule yang mendominasi biaya, optimizer memakai schedule cost-dominating terbaik yang ditemukan. Perbarui checkpoint dari minggu $w$ ke depan dan catat ke `swapTrace`.
  3. **Deterministic Explainability Tagging:**
     Untuk tiap penugasan `(w, i)` pada jadwal final $U_{\text{best}}$, hitung 3 rasio terukur di minggu $w$:
     - `icuStress = H_i(7w) / (C_ICU_i + 1)`
     - `hubStrength = HubIndex_i`
     - `growthRatio = ΔÎ_i^14d / (I_i(7w) + 1)`
     Bandingkan ketiga rasio terhadap rata-rata kota (rasio relatif `val / mean_city`):
     - Jika `icuStress >= 0.70` atau komponen ICU memiliki rasio relatif tertinggi $\rightarrow$ `"ICU Capacity Shield"`
     - Else jika `hubStrength` memiliki rasio relatif tertinggi (atau `hubStrength >= 0.22`) $\rightarrow$ `"Mobility Hub Containment"`
     - Else $\rightarrow$ `"Pre-emptive Surge Intercept"`

### 3.6 Engine-Owned Impact Metrics (`src/engine/optimizer.ts`)
- `impactSummary` menyimpan signed absolute impact (`casesAverted`, `peakIcuOverflowPrevented`, `collapseDaysSaved`), persentase kasus dan biaya yang dihemat, serta satu `districtImpacts` entry untuk setiap distrik. Peak per distrik dihitung dari array harian Reactive dan optimized, sedangkan `interventionWeeks` berasal dari schedule optimized.
- `impactRadar` selalu memiliki lima sumbu finite dalam rentang `0..100`: `casesControl`, `peakIcuSafety`, `collapsePrevention`, `hubContainment`, dan `budgetEfficiency`.
- Sumbu relatif membandingkan optimized dengan Reactive. Nilai negatif dipaksa ke 0 dan nilai di atas 100 dipaksa ke 100. Jika denominator Reactive bernilai 0, nilai yang sama menghasilkan 100, hasil lebih baik menghasilkan 100, dan hasil lebih buruk menghasilkan 0.
- `hubContainment` memakai helper coverage yang sama dengan gate `HUB_COVERAGE`: top-quartile `HubIndex` yang menerima intervensi pada empat minggu pertama. Nilainya adalah rasio coverage expressed dalam skala `0..100`.
- Semua angka UI berasal dari engine. Komponen Owner B tidak menghitung ulang metrik ini dari array simulasi.

### 3.7 Policy & Integrity Gates (`src/engine/gates.ts`)
Adaptasi bersih dari konsep deterministic gates di `Synthia-Bio` untuk validasi kebijakan wabah:
1. `MASS_CONSERVATION`: `maxMassConservationError < 1e-9` (Bobot: 25%)
2. `BUDGET_COMPLIANCE`: setiap minggu $\sum_i u_i(w) \le K$ (Bobot: 20%)
3. `COST_DOMINANCE`: `sennagrid.totalCostJ < reactive.totalCostJ` (Bobot: 25%)
4. `ICU_COLLAPSE_MITIGATION`: `sennagrid.icuCollapseDays === 0` atau turun minimal 40% dari `reactive.icuCollapseDays` (Bobot: 20%)
5. `HUB_COVERAGE`: minimal 50% dari top-25% distrik `HubIndex` menerima intervensi pada Weeks 1–4 (Bobot: 10%)

Status:
- `FAIL` jika `MASS_CONSERVATION` gagal atau `BUDGET_COMPLIANCE` gagal atau `passedCount <= 2`
- `PASS` jika `passedCount >= 4` dan seluruh gate inti lulus
- `REVIEW` selain itu.

### 3.8 Verified Calibration Snapshot

| Skenario | Overflow Reactive -> Optimized | Collapse Reactive -> Optimized | Evaluations | Solve Time | Gates |
| :--- | :---: | :---: | ---: | ---: | :--- |
| Metro Tropica, Vector SEIR-SEI, 20% | `16.8 -> 0.0` | `5 -> 0` | 255 | 597 ms | PASS, 5/5, readiness 100 |
| Metro Tropica, Vector SEIR-SEI, 15% | `208.3 -> 82.1` | `13 -> 8` | 255 | 499 ms | PASS, 4/5, readiness 88 |
| Harbor Corridor, Direct SEIR, 20% | `292.4 -> 112.8` | `17 -> 15` | 256 | 213 ms | PASS, 4/5, readiness 82 |
| Harbor Corridor, Direct SEIR, 30% | `18.1 -> 2.2` | `7 -> 4` | 256 | 214 ms | PASS, 5/5, readiness 100 |

ICU-first acceptance dapat menukar sedikit kenaikan kasus dengan penurunan tekanan ICU yang jauh lebih besar. Keempat skenario tetap menurunkan objective cost dan tidak memperburuk collapse days.

---

## 4. Bundled GeoJSON Regions & Weather Service

### 4.1 GeoJSON Presets (`src/data/regions/`)
Setiap preset dibentuk dari poligon **kontigu tanpa celah/tumpang-tindih** (dibangun dari grid/sel Voronoi terklip rapi ke batas kota) dengan koordinat nyata agar basemap Carto Dark Matter & API Open-Meteo berjalan autentik:

1. **`metroTropica.ts` — Metro Tropica (18 Distrik):**
   - **Anchor Koordinat:** Basin tropis `lat: -6.2088, lng: 106.8456` (rentang $\pm 0.14^\circ$).
   - **Struktur:** 3 distrik `core` berdensitas tinggi di pusat, 4 distrik `transit_hub` pada simpang koridor, 7 distrik `residential` padat dengan rasio ICU terbatas, dan 4 distrik `peri_urban`.
   - **Seed Wabah:** Konsentrasi awal di 2 distrik transit + 1 distrik padat (total ~320 kasus aktif awal) agar pada **20% Budget**, strategi Reactive menabrak kapasitas ICU sementara SennaGrid berhasil menahan lonjakan di bawah ambang kolaps.
2. **`harborCorridor.ts` — Harbor Corridor (16 Distrik):**
   - **Anchor Koordinat:** Koridor pesisir `lat: 35.4437, lng: 139.6380` (rentang linear koridor pelabuhan–pusat–suburban).
   - **Struktur:** Pelabuhan selatan (`transit_hub`), koridor *bottleneck* tengah (`core`), dan distrik hunian utara (`residential` & `peri_urban`).

### 4.2 Open-Meteo Client (`src/services/weather.ts`)
- Endpoint:
  `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_mean,precipitation_sum&past_days=7&forecast_days=14&timezone=auto`
- Timeout `AbortController` **3.000 ms**.
- Cache per `(regionId)` di memori sesi agar perpindahan slider budget tidak memanggil ulang Open-Meteo.
- Jika offline / timeout / respons tidak valid: kembalikan preset klimatologi musiman deterministik (`Metro Tropica`: $\bar{T} \approx 29.4^\circ\text{C}$, curah hujan tropis realistis; `Harbor Corridor`: $\bar{T} \approx 18.2^\circ\text{C}$, curah hujan sedang) dengan `source: "fallback_climatology"`.

---

## 5. Web Worker & UI Architecture

### 5.1 Web Worker Protocol (`src/workers/optimizer.worker.ts`)
```ts
export interface WorkerRunRequest {
  type: "RUN_OPTIMIZATION";
  requestId: number;
  params: SimulationParams;
  districts: DistrictProperties[];
  climate: ClimateSeries;
}

export type WorkerResponse =
  | { type: "OPTIMIZATION_RESULT"; requestId: number; result: OptimizationOutput }
  | { type: "OPTIMIZATION_ERROR"; requestId: number; error: string };
```
- **Latest Request Wins:** Client worker menyimpan `latestRequestId`. Saat request baru dimulai, promise request lama di-resolve dengan `null`; respons dengan `requestId !== latestRequestId` diabaikan. `terminate()` juga resolve pending request dengan `null` dan menghentikan worker.

### 5.2 Synchronized Split-Screen MapLibre (`SplitMapView.tsx`)
- Style URL: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (fallback graceful: `background-color: #eef2f6` light cartographic canvas bila style eksternal terblokir).
- **Camera Lock & Tight Framing:** `fitBounds` otomatis membungkus batas poligon kota; flag `isSyncingRef` + `map.jumpTo({ center, zoom, bearing, pitch })` mengunci kamera kedua peta tanpa feedback loop.
- **Update 60 FPS pada Timeline Scrubber:** Gunakan `map.setFeatureState({ source: 'sennagrid-districts', id }, { stress, treated, selected })` (`promoteId: 'id'`) disertai lencana status distrik di centroid dan garis koridor mobilitas komuter opsional.
- **Visual Encoding:**
  - Fill color (`stress = H_i / C_ICU_i`): `#ecfdf5` (aman) -> `#bae6fd` -> `#fde68a` (waspada >= 60%) -> `#fb923c` -> `#f43f5e` (kolaps >= 100%).
  - Outline distrik intervensi aktif pada minggu `Math.min(12, Math.floor(currentDay / 7))`: Left map `#e11d48` (3px), Right map `#0f766e` (3px), dengan halo seleksi di bawah layer intervensi agar garis aktif tidak tertutup.

### 5.3 Operational Export Contract (`src/services/export.ts`)
- **Full-run JSON:** menyertakan parameter, climate, district, schedule, assignments, swap trace, policy gates, `impactSummary`, `impactRadar`, dan daily curves. Seluruh output harus tetap serializable menjadi JSON.
- **Dispatch CSV:** mempertahankan satu row per assignment dan kolom dispatch yang ada. Metrik radar dan aggregate impact tidak menjadi kolom CSV.

### 5.4 Visual & Aesthetics Guidelines
- Palet warna (Clean Editorial Light): Canvas `#f8fafc`, Card `#ffffff`, Inset `#f1f5f9`, Subtle Border `#e2e8f0`, Interactive Control Border `#64748b` (`4.76:1` WCAG AA), Primary Ink `#0f172a` (`17.85:1`), Reactive `#be123c` / `#e11d48` (Rose), SennaGrid `#0f766e` / `#0d9488` (Teal), Warning `#b45309` (Amber).
- Tipografi: `Plus Jakarta Sans` untuk UI & judul, `IBM Plex Mono` (`font-mono tabular-nums`) untuk metrik, koordinat, dan jadwal (lihat juga [DESIGN_SPEC.md](./DESIGN_SPEC.md)).
- **Strict No-Emoji Policy:** Gunakan hanya ikon `lucide-react`.

---

## 6. Verification & Acceptance Test Matrix

### 6.1 Unit Tests (`vitest run`)
1. `mobility.test.ts`: Simetri jarak Haversine, baris matriks $W$ berjumlah tepat `1.0` ($\pm 10^{-12}$), diagonal tepat `1 - m_out`, serta boundary outflow `0`, `1`, dan non-finite tetap finite.
2. `climate.test.ts`: Panjang tepat 92 hari (`0..91`), batas $\phi_T \in [0.15, 1.0]$, $\phi_R \ge 0.75$, nol `NaN`.
3. `solver.test.ts`:
   - Mode A & Mode B menjaga $|S_i + E_i + I_i + R_i - N_i| / N_i < 10^{-9}$ di setiap hari dan distrik.
   - Kompartemen vektor $(s_v, e_v, i_v)$ berjumlah `1.0` dan selalu berada di `[0, 1]`.
   - Kesesuaian checkpointed forward pass dari `week w` dengan simulasi penuh dari `week 0` (selisih `< 1e-12`).
   - Efikasi omitted, default mode, `0`, `1`, dan invalid menghasilkan trajectory finite serta default omitted sama dengan trajectory sebelum perubahan.
4. `optimizer.test.ts`:
   - Kepatuhan kuota ketat $\sum_i u_i(w) \le K$ untuk semua minggu, termasuk boundary budget `10%` dan `40%`.
   - **Dominance Verification:** SennaGrid menghasilkan `totalCostJ <= reactive.totalCostJ` (dan ketat lebih kecil pada skenario default) pada **kedua preset** (`Metro Tropica` dan `Harbor Corridor`) untuk anggaran `15%`, `20%`, dan `30%`, serta kedua mode penyakit.
   - `impactSummary` memiliki satu peak comparison per distrik; kelima radar axis finite dan berada di `0..100`; formula summary, radar, district peak, dan aturan denominator nol diuji terhadap hasil Reactive dan optimized.
   - Trace ICU-first tidak dapat menyembunyikan kenaikan overflow: setiap accepted step menurunkan overflow atau, pada overflow sama, menurunkan objective cost. `pass` dan `overflowDelta` membuktikan bahwa search benar-benar melewati beberapa pass.
   - Batas evaluasi Direct untuk Harbor adalah 256: 1 Reactive + 5 Stage 1 + 250 swap. Budget 250 swap dan guard 1.150 ms tetap shared seluruh pass.
   - Harbor Corridor Direct SEIR 20% mencapai total ICU overflow `<= 231.0` bed-days tanpa memperburuk collapse days; Metro Tropica default mempertahankan 5/5 gate PASS.
   - Waktu eksekusi `< 1500 ms` dan input identik menghasilkan schedule, assignments, swap trace, impact summary, dan impact radar yang deterministik.
5. `gates.test.ts`: Pengujian status `PASS / REVIEW / FAIL` pada skenario ideal vs jadwal melanggar budget, serta konsistensi helper hub coverage.
6. `optimizerClient.test.ts`: Request overlap, stale response, successful latest response, termination, dan message setelah termination mengikuti kontrak latest-request-wins.
7. `services.test.ts`: Full-run JSON memuat `impactSummary` dan `impactRadar`; dispatch CSV mempertahankan kolom dan jumlah row yang sama.

### 6.2 Build & Browser Acceptance Checklist
- [ ] `npm run test` lulus 100% tanpa skip.
- [ ] `npm run build` (`tsc -b && vite build`) selesai dengan 0 error TypeScript.
- [ ] Buka aplikasi di browser $\rightarrow$ simulasi default langsung tampil & siap play tanpa klik tambahan.
- [ ] Pada preset default (`Metro Tropica`, `Vector-Borne SEIR-SEI`, `20% Budget`), peta kiri (Reactive) menembus kapasitas ICU sementara peta kanan (SennaGrid) mencegah atau menekan drastis kolaps ICU.
- [ ] Ekspor CSV dan JSON dari tab `Dispatch Schedule` valid dan lengkap.
