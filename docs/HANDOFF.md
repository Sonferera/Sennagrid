# Owner A to Owner B Integration Handoff

Dokumen ini merangkum seluruh API yang sudah siap pakai dari **Owner A** (`packages/engine` + `apps/web/src/{data,services,workers}`) agar pengembangan UI **Owner B** (`apps/web/src/{store,components}`) berjalan cepat tanpa menebak kontrak data.

---

## 1. Public Exports from `@sennagrid/engine`

Import langsung dari `'@sennagrid/engine'`:
- **Types & Constants:** `DEFAULT_SIMULATION_PARAMS`, `EPIDEMIC_CONSTANTS`, `SimulationParams`, `DiseaseMode`, `RegionId`, `DistrictProperties`, `ClimateSeries`, `OptimizationOutput`, `StrategySimulationResult`, `DispatchAssignment`, `SwapTraceEntry`, `PolicyGateSummary`, `RationaleTag`.
- **Functions (biasanya dipanggil dari worker, tersedia juga untuk unit test/UI helpers):** `computeWeeklyQuota`, `computeThermalMultiplier`, `computeRainfallMultiplier`, `getFallbackClimateSeries`, `optimizeResourceAllocation`, `evaluatePolicyGates`.

---

## 2. Region Presets (`apps/web/src/data/regions`)

```ts
import { getRegionPreset, REGION_PRESET_LIST } from '../data/regions';

const preset = getRegionPreset('metro_tropica');
// preset.districts -> DistrictProperties[] (18 for Metro Tropica, 16 for Harbor Corridor)
// preset.featureCollection -> valid GeoJSON FeatureCollection (promoteId: 'id')
// preset.mapCenter -> [lng, lat], preset.mapZoom -> number
// preset.defaultDiseaseMode -> 'vector_seir_sei' | 'direct_seir'
```

---

## 3. Live Weather Service (`apps/web/src/services/weather.ts`)

```ts
import { fetchRegionClimate } from '../services/weather';

const climate = await fetchRegionClimate('metro_tropica');
// climate.source === 'open_meteo' | 'fallback_climatology'
// climate.meanTemp14d, climate.meanPrecip14d, climate.days (length 92)
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

## 6. Operational Export Helpers (`apps/web/src/services/export.ts`)

```ts
import { downloadTextFile, generateDispatchCsv, generateFullRunJson } from '../services/export';

downloadTextFile('sennagrid-dispatch-plan.csv', generateDispatchCsv(output), 'text/csv;charset=utf-8');
downloadTextFile('sennagrid-full-run.json', generateFullRunJson(output), 'application/json;charset=utf-8');
```
