# Owner A to Owner B Integration Handoff

Dokumen ini merangkum seluruh API yang sudah siap pakai dari **Owner A** (`packages/engine` + `apps/web/src/{data,services,workers}`) agar pengembangan UI **Owner B** (`apps/web/src/{store,components}`) berjalan cepat tanpa menebak kontrak data.

---

## 1. Public Exports from `@sennagrid/engine`

Import langsung dari `'@sennagrid/engine'`:
- **Types & Constants:** `DEFAULT_SIMULATION_PARAMS`, `EPIDEMIC_CONSTANTS`, `SimulationParams`, `DiseaseMode`, `BuiltInRegionId`, `CustomRegionId`, `RegionId`, `DistrictProperties`, `ClimateSeries`, `OptimizationOutput`, `StrategySimulationResult`, `DispatchAssignment`, `SwapTraceEntry`, `PolicyGateSummary`, `RationaleTag`, `DistrictImpactSummary`, `ImpactSummary`, `ImpactRadar`.
- **Functions (biasanya dipanggil dari worker, tersedia juga untuk unit test/UI helpers):** `computeWeeklyQuota`, `computeThermalMultiplier`, `computeRainfallMultiplier`, `getFallbackClimateSeries`, `optimizeResourceAllocation`, `evaluatePolicyGates`, `computeHubCoverage`.

### 1.1 Simulation Parameter Contract

```ts
const params: SimulationParams = {
  ...DEFAULT_SIMULATION_PARAMS,
  diseaseMode: 'direct_seir',
  budgetRatio: 0.2,
  interventionEfficacy: 0.75, // optional
};
```

- `interventionEfficacy` berada di `[0,1]`. Jika omitted, Vector SEIR-SEI memakai `0.65` dan Direct SEIR memakai `0.60` sehingga trajectory default tidak berubah.
- Non-finite memakai default mode, nilai finite di bawah 0 menjadi 0, dan nilai finite di atas 1 menjadi 1.
- `icuRate` invalid atau negatif di-resolve menjadi 0. Mobility outflow finite dipaksa ke `[0,1]`; outflow non-finite memakai default `0.18`.

---

## 2. Region Presets (`apps/web/src/data/regions`)

```ts
import { buildCustomCityPreset, getRegionPreset, REGION_PRESET_LIST } from '../data/regions';

const preset = getRegionPreset('metro_tropica');
// REGION_PRESET_LIST -> 4 calibrated presets: metro_tropica (18), harbor_corridor (16), highland_ring (16), monsoon_delta (18)
// buildCustomCityPreset(city) -> dynamic custom_${id} 18-district normalized urban grid centered at geocoded coordinates
// preset.featureCollection -> valid GeoJSON FeatureCollection (promoteId: 'id')
// preset.mapCenter -> [lng, lat], preset.mapZoom -> number
// preset.defaultDiseaseMode -> 'vector_seir_sei' | 'direct_seir'
```

---

## 3. Live Weather & Geocoding Services (`apps/web/src/services/{weather.ts,geocoding.ts}`)

```ts
import { fetchRegionClimate } from '../services/weather';
import { searchCities } from '../services/geocoding';

const climate = await fetchRegionClimate('metro_tropica');
// Supports optional { anchorLat, anchorLng } for custom geocoded cities (`custom_*`)
// climate.source === 'open_meteo' | 'fallback_climatology'
// climate.meanTemp14d, climate.meanPrecip14d, climate.days (length 92)

const cities = await searchCities('Surabaya');
// Calls free Open-Meteo Geocoding API (`geocoding-api.open-meteo.com`) with 3000ms timeout
```
- Tidak pernah melempar error ke UI; jika Open-Meteo timeout (> 3000 ms) atau offline, otomatis mengembalikan klimatologi musiman deterministik dan di-cache per `regionId`.

---

## 4. Non-Blocking Web Worker Client (`apps/web/src/workers/optimizerClient.ts`)

```ts
import { createOptimizerWorkerClient } from '../workers/optimizerClient';

const client = createOptimizerWorkerClient();
const result = await client.run(preset.districts, params, climate);
// result === null -> request sebelumnya di-supersede oleh slider/klik baru (aman diabaikan)
// result !== null -> OptimizationOutput lengkap
```
- Request lifecycle memakai kontrak **latest request wins**:
  - Request baru saat request lama pending me-resolve promise lama dengan `null`.
  - Respons dengan `requestId` lama diabaikan, termasuk jika tiba setelah respons terbaru.
  - Hanya respons request terbaru yang boleh resolve output.
  - `client.terminate()` me-resolve pending promise dengan `null`, menghentikan worker, dan membuat message berikutnya tidak dapat men-settle caller.
- Panggil `client.terminate()` saat cleanup jika membuat instance lokal, atau simpan sebagai singleton di Zustand store `useSimulationStore.ts`.

---

## 5. Fast 60 FPS Playback Indexing

Untuk memperbarui warna peta MapLibre pada hari `currentDay` (`0..91`) tanpa alokasi array baru:
```ts
const n = output.districts.length;
const offset = currentDay * n;
const weekIdx = Math.min(12, Math.floor(currentDay / 7));

for (let i = 0; i < n; i++) {
  const district = output.districts[i]!;
  const reactiveIcu = output.reactive.districtIcuDemand[offset + i]!;
  const reactiveStress = reactiveIcu / district.icuBeds;
  const reactiveTreated = (output.reactive.schedule[weekIdx]?.[i] ?? 0) === 1;

  const optIcu = output.sennagrid.districtIcuDemand[offset + i]!;
  const optStress = optIcu / district.icuBeds;
  const optTreated = (output.sennagrid.schedule[weekIdx]?.[i] ?? 0) === 1;
  // Pass via map.setFeatureState({ source: 'districts', id: district.id }, { stress, treated })
}
```

---

## 6. Engine-Owned Impact Metrics

Setiap `OptimizationOutput` sekarang menyediakan dua object yang siap consumption UI:

```ts
output.impactSummary;
// {
//   casesAverted, casesAvertedPct,
//   peakIcuOverflowPrevented, collapseDaysSaved, costReductionPct,
//   districtImpacts: DistrictImpactSummary[]
// }

output.impactRadar;
// {
//   casesControl, peakIcuSafety, collapsePrevention,
//   hubContainment, budgetEfficiency
// }
```

- `districtImpacts` selalu berisi satu entry per `output.districts` dan memuat peak active infections, peak ICU demand, peak ICU overflow, serta jumlah minggu intervensi.
- Kelima radar axis finite dan berada di `0..100`. `hubContainment` memakai perhitungan top-quartile coverage yang sama dengan gate `HUB_COVERAGE`.
- Komponen Owner B harus memakai object ini untuk KPI, radar, dan inspector. Jangan menghitung ulang metrik dari array simulasi.

---

## 7. Kontrak Optimizer dan Boundary Integration

### 7.1 Tuning contract
- Stage 2 memakai **bounded multi-pass local search**: pass 2-week block swap lalu 1-week swap, maksimal 250 evaluasi swap dan 1.150 ms search guard yang dibagi di seluruh pass.
- Acceptance bersifat **ICU-overflow-first**: kandidat dengan total overflow lebih rendah diterima lebih dahulu; objective cost menjadi tie-break hanya saat overflow sama.
- Setiap kandidat dan schedule final harus memenuhi *Hospital Safety Guardrail*: total ICU overflow tidak melebihi Reactive dan collapse days tidak memburuk.
- Satu langkah ICU-first boleh menaikkan objective cost. Schedule final tetap harus lebih murah daripada Reactive agar gate `COST_DOMINANCE` berlaku. Jika jalur ICU-first tidak menghasilkan schedule yang mendominasi biaya, engine memakai schedule cost-dominating terbaik yang ditemukan.
- Direct SEIR memakai satu seed khusus mode `{ susPow: 1.0, hubW: 1.2, icuW: 15.0, overflowBoost: 20, lookaheadDays: 21 }`. Tidak ada branching berdasarkan `regionId`.
- `evaluationsCount` mencakup 1 evaluasi Reactive, 4 atau 5 evaluasi Stage 1, dan seluruh evaluasi swap. Batas maksimum adalah 255 untuk Vector SEIR-SEI dan 256 untuk Direct SEIR.
- Setiap `swapTrace` item mencatat `pass` Stage 2 mulai dari 1, `overflowSaved` non-negatif, dan `overflowDelta` bertanda dengan 6 angka desimal untuk memeriksa keputusan ICU-first secara langsung.

### 7.2 Boundary-test matrix

| Boundary | Expected behavior | Test evidence |
| :--- | :--- | :--- |
| Budget `0.10` dan `0.40` | Kuota positif, schedule tidak melebihi kuota, hasil finite | `packages/engine/src/__tests__/optimizer.test.ts` |
| Mobility outflow `0`, `1`, non-finite | Matriks finite, row-stochastic, diagonal sesuai batas | `packages/engine/src/__tests__/mobility.test.ts` |
| ICU rate negatif atau non-finite | Resolve menjadi 0, trajectory tetap finite | `packages/engine/src/__tests__/solver.test.ts` |
| Efficacy omitted, `0`, `1`, invalid | Default mode dipertahankan atau nilai di-clamp ke `[0,1]` | `packages/engine/src/__tests__/solver.test.ts` |
| Worker overlap, stale response, termination | Hanya request terbaru yang boleh resolve output | `apps/web/src/workers/__tests__/optimizerClient.test.ts` |
| Metro 20% dan Harbor 20% | Kalibrasi, gate, safety, quota, waktu, determinisme | `apps/web/src/data/regions/__tests__/presets.test.ts` |

### 7.3 Calibration snapshot

| Skenario | Overflow Reactive -> Optimized | Collapse Reactive -> Optimized | Evaluations | Solve Time | Gates |
| :--- | :---: | :---: | ---: | ---: | :--- |
| Metro Tropica, Vector SEIR-SEI, 20% | `16.8 -> 0.0` | `5 -> 0` | 255 | 597 ms | PASS, 5/5, readiness 100 |
| Metro Tropica, Vector SEIR-SEI, 15% | `208.3 -> 82.1` | `13 -> 8` | 255 | 499 ms | PASS, 4/5, readiness 88 |
| Harbor Corridor, Direct SEIR, 20% | `292.4 -> 112.8` | `17 -> 15` | 256 | 213 ms | PASS, 4/5, readiness 82 |
| Harbor Corridor, Direct SEIR, 30% | `18.1 -> 2.2` | `7 -> 4` | 256 | 214 ms | PASS, 5/5, readiness 100 |

ICU-first acceptance dapat menghasilkan sedikit kenaikan cumulative cases ketika objective cost dan tekanan ICU turun lebih besar.

---

## 8. Operational Export Helpers (`apps/web/src/services/export.ts`)

```ts
import { downloadTextFile, generateDispatchCsv, generateFullRunJson } from '../services/export';

downloadTextFile('sennagrid-dispatch-plan.csv', generateDispatchCsv(output), 'text/csv;charset=utf-8');
downloadTextFile('sennagrid-full-run.json', generateFullRunJson(output), 'application/json;charset=utf-8');
```

- Full-run JSON memuat `impactSummary` dan `impactRadar` bersama gates, assignments, swap trace, dan daily curves.
- Dispatch CSV tetap memakai kolom dispatch yang ada dan tidak menambah kolom radar.
