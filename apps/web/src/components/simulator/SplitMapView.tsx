import type { OptimizationOutput, StrategyName } from '@sennagrid/engine';
import { Link2, Link2Off, RotateCcw, WifiOff } from 'lucide-react';
import maplibregl, { type ExpressionSpecification, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRegionPreset, type DistrictFeatureCollection } from '../../data/regions';
import {
  computeDistrictStress,
  formatFixed,
  formatInt,
  formatZoneLabel,
  getTimelineMeta,
} from '../../lib/viewModels';
import type { MobileMapStrategy } from '../../store/useSimulationStore';

const CARTO_DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const BASEMAP_LOAD_TIMEOUT_MS = 4500;
const SOURCE_ID = 'sennagrid-districts';

const OFFLINE_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: {
        'background-color': '#090d16',
      },
    },
  ],
};

const STRESS_FILL_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['feature-state', 'stress'], 0],
  0,
  '#1e293b',
  0.35,
  '#243854',
  0.6,
  '#d97706',
  0.9,
  '#ea580c',
  1.0,
  '#e11d48',
];

interface HoverInfo {
  strategy: StrategyName;
  districtId: string;
  x: number;
  y: number;
}

interface SplitMapViewProps {
  output: OptimizationOutput;
  currentDay: number;
  selectedDistrictId: string | null;
  syncMapsLocked: boolean;
  mobileMapStrategy: MobileMapStrategy;
  onSelectDistrict: (districtId: string | null) => void;
  onToggleSyncMaps: () => void;
  onSetMobileMapStrategy: (strategy: MobileMapStrategy) => void;
}

function attachDistrictLayers(
  map: maplibregl.Map,
  featureCollection: DistrictFeatureCollection,
  strategy: StrategyName,
): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: featureCollection as unknown as GeoJSON.FeatureCollection,
      promoteId: 'id',
    });
  }

  if (!map.getLayer('districts-fill')) {
    map.addLayer({
      id: 'districts-fill',
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': STRESS_FILL_EXPRESSION,
        'fill-opacity': 0.8,
      },
    });
  }

  if (!map.getLayer('districts-base-outline')) {
    map.addLayer({
      id: 'districts-base-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#475569',
        'line-width': 1,
      },
    });
  }

  const treatedColor = strategy === 'reactive' ? '#fb7185' : '#22d3ee';
  if (!map.getLayer('districts-treated-outline')) {
    map.addLayer({
      id: 'districts-treated-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': treatedColor,
        'line-width': ['case', ['==', ['feature-state', 'treated'], true], 2.75, 0],
      },
    });
  }

  if (!map.getLayer('districts-selected-outline')) {
    map.addLayer({
      id: 'districts-selected-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#f8fafc',
        'line-width': ['case', ['==', ['feature-state', 'selected'], true], 3.25, 0],
      },
    });
  }
}

function applyFeatureStatesToMap(
  map: maplibregl.Map,
  output: OptimizationOutput,
  strategy: StrategyName,
  day: number,
  selectedDistrictId: string | null,
): void {
  if (!map.getSource(SOURCE_ID)) return;

  const meta = getTimelineMeta(output, day);
  const stratResult = strategy === 'reactive' ? output.reactive : output.sennagrid;
  const n = output.districts.length;
  const rowBase = meta.day * n;
  const weekRow = stratResult.schedule[meta.weekIndex];

  for (let i = 0; i < n; i++) {
    const district = output.districts[i];
    if (!district) continue;
    const icuDemand = stratResult.districtIcuDemand[rowBase + i] ?? 0;
    const stress = computeDistrictStress(icuDemand, district.icuBeds);
    const treated = (weekRow?.[i] ?? 0) === 1;
    const selected = district.id === selectedDistrictId;

    map.setFeatureState(
      { source: SOURCE_ID, id: district.id },
      { stress, treated, selected },
    );
  }
}

export function SplitMapView({
  output,
  currentDay,
  selectedDistrictId,
  syncMapsLocked,
  mobileMapStrategy,
  onSelectDistrict,
  onToggleSyncMaps,
  onSetMobileMapStrategy,
}: SplitMapViewProps) {
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<maplibregl.Map | null>(null);
  const rightMapRef = useRef<maplibregl.Map | null>(null);

  const isSyncingRef = useRef(false);
  const syncLockedRef = useRef(syncMapsLocked);
  syncLockedRef.current = syncMapsLocked;

  const latestOutputRef = useRef(output);
  latestOutputRef.current = output;
  const latestDayRef = useRef(currentDay);
  latestDayRef.current = currentDay;
  const latestSelectedRef = useRef(selectedDistrictId);
  latestSelectedRef.current = selectedDistrictId;
  const onSelectDistrictRef = useRef(onSelectDistrict);
  onSelectDistrictRef.current = onSelectDistrict;

  const [offlineFallback, setOfflineFallback] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const preset = getRegionPreset(output.params.regionId);
  const meta = getTimelineMeta(output, currentDay);

  const resetCamera = useCallback(() => {
    const activePreset = getRegionPreset(latestOutputRef.current.params.regionId);
    const view = {
      center: activePreset.mapCenter,
      zoom: activePreset.mapZoom,
      bearing: 0,
      pitch: 0,
    };
    isSyncingRef.current = true;
    leftMapRef.current?.jumpTo(view);
    rightMapRef.current?.jumpTo(view);
    isSyncingRef.current = false;
  }, []);

  // Initialize dual MapLibre GL v5 instances once
  useEffect(() => {
    const leftEl = leftContainerRef.current;
    const rightEl = rightContainerRef.current;
    if (!leftEl || !rightEl) return;

    const initialPreset = getRegionPreset(latestOutputRef.current.params.regionId);
    let disposed = false;
    let fallbackTriggered = false;
    let loadedCount = 0;

    const initMap = (container: HTMLDivElement, strategy: StrategyName): maplibregl.Map => {
      const map = new maplibregl.Map({
        container,
        style: CARTO_DARK_STYLE_URL,
        center: initialPreset.mapCenter,
        zoom: initialPreset.mapZoom,
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      const activateFallback = () => {
        if (disposed || fallbackTriggered) return;
        fallbackTriggered = true;
        setOfflineFallback(true);
        leftMapRef.current?.setStyle(OFFLINE_DARK_STYLE);
        rightMapRef.current?.setStyle(OFFLINE_DARK_STYLE);
      };

      const styleTimer = setTimeout(() => {
        if (!disposed && !map.isStyleLoaded()) {
          activateFallback();
        }
      }, BASEMAP_LOAD_TIMEOUT_MS);

      map.on('style.load', () => {
        clearTimeout(styleTimer);
        if (disposed) return;
        const currentPreset = getRegionPreset(latestOutputRef.current.params.regionId);
        attachDistrictLayers(map, currentPreset.featureCollection, strategy);
        applyFeatureStatesToMap(
          map,
          latestOutputRef.current,
          strategy,
          latestDayRef.current,
          latestSelectedRef.current,
        );
        loadedCount++;
        if (loadedCount >= 2) {
          setMapsReady(true);
        }
      });

      map.on('error', () => {
        if (!map.isStyleLoaded()) {
          clearTimeout(styleTimer);
          activateFallback();
        }
      });

      map.on('click', 'districts-fill', (e) => {
        const feature = e.features?.[0];
        const rawId = feature?.properties?.id ?? feature?.id;
        if (typeof rawId === 'string' && rawId.length > 0) {
          onSelectDistrictRef.current(rawId);
        }
      });

      map.on('mousemove', 'districts-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        const rawId = feature?.properties?.id ?? feature?.id;
        if (typeof rawId === 'string' && rawId.length > 0) {
          setHoverInfo({
            strategy,
            districtId: rawId,
            x: e.point.x,
            y: e.point.y,
          });
        }
      });

      map.on('mouseleave', 'districts-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo((prev) => (prev?.strategy === strategy ? null : prev));
      });

      return map;
    };

    const leftMap = initMap(leftEl, 'reactive');
    const rightMap = initMap(rightEl, 'sennagrid');
    leftMapRef.current = leftMap;
    rightMapRef.current = rightMap;

    const syncMove = (source: maplibregl.Map, target: maplibregl.Map) => {
      if (isSyncingRef.current || !syncLockedRef.current) return;
      isSyncingRef.current = true;
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
      isSyncingRef.current = false;
    };

    const onLeftMove = () => syncMove(leftMap, rightMap);
    const onRightMove = () => syncMove(rightMap, leftMap);
    leftMap.on('move', onLeftMove);
    rightMap.on('move', onRightMove);

    const resizeObserver = new ResizeObserver(() => {
      leftMap.resize();
      rightMap.resize();
    });
    resizeObserver.observe(leftEl);
    resizeObserver.observe(rightEl);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      leftMap.off('move', onLeftMove);
      rightMap.off('move', onRightMove);
      leftMap.remove();
      rightMap.remove();
      leftMapRef.current = null;
      rightMapRef.current = null;
    };
  }, []);

  // Update GeoJSON source and camera when switching urban region preset
  useEffect(() => {
    const activePreset = getRegionPreset(output.params.regionId);
    const updateSource = (map: maplibregl.Map | null, strategy: StrategyName) => {
      if (!map || !map.isStyleLoaded()) return;
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(activePreset.featureCollection as unknown as GeoJSON.FeatureCollection);
      } else {
        attachDistrictLayers(map, activePreset.featureCollection, strategy);
      }
    };

    updateSource(leftMapRef.current, 'reactive');
    updateSource(rightMapRef.current, 'sennagrid');

    isSyncingRef.current = true;
    const view = {
      center: activePreset.mapCenter,
      zoom: activePreset.mapZoom,
      bearing: 0,
      pitch: 0,
    };
    leftMapRef.current?.jumpTo(view);
    rightMapRef.current?.jumpTo(view);
    isSyncingRef.current = false;
    setHoverInfo(null);
  }, [output.params.regionId]);

  // Lightweight feature-state update on Day 0..91 scrubbing, new output, or district selection
  useEffect(() => {
    if (leftMapRef.current?.isStyleLoaded()) {
      applyFeatureStatesToMap(leftMapRef.current, output, 'reactive', currentDay, selectedDistrictId);
    }
    if (rightMapRef.current?.isStyleLoaded()) {
      applyFeatureStatesToMap(
        rightMapRef.current,
        output,
        'sennagrid',
        currentDay,
        selectedDistrictId,
      );
    }
  }, [output, currentDay, selectedDistrictId, mapsReady]);

  // Ensure hidden mobile canvas resizes cleanly after toggling Reactive / SennaGrid
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      leftMapRef.current?.resize();
      rightMapRef.current?.resize();
    });
    return () => cancelAnimationFrame(raf);
  }, [mobileMapStrategy]);

  const reactiveTreatedCount =
    output.reactive.schedule[meta.weekIndex]?.reduce((sum, v) => sum + (v === 1 ? 1 : 0), 0) ?? 0;
  const sennagridTreatedCount =
    output.sennagrid.schedule[meta.weekIndex]?.reduce((sum, v) => sum + (v === 1 ? 1 : 0), 0) ?? 0;
  const reactiveDayOverflow = output.reactive.dailyCityOverflow[meta.day] ?? 0;
  const sennagridDayOverflow = output.sennagrid.dailyCityOverflow[meta.day] ?? 0;

  const renderHoverTooltip = (strategy: StrategyName) => {
    if (!hoverInfo || hoverInfo.strategy !== strategy) return null;
    const idx = output.districts.findIndex((d) => d.id === hoverInfo.districtId);
    if (idx < 0) return null;
    const district = output.districts[idx];
    if (!district) return null;

    const strat = strategy === 'reactive' ? output.reactive : output.sennagrid;
    const flatIdx = meta.day * output.districts.length + idx;
    const activeInf = strat.districtActive[flatIdx] ?? 0;
    const icuDemand = strat.districtIcuDemand[flatIdx] ?? 0;
    const stressPct = Math.round(computeDistrictStress(icuDemand, district.icuBeds) * 100);
    const treated = (strat.schedule[meta.weekIndex]?.[idx] ?? 0) === 1;

    return (
      <div
        role="tooltip"
        style={{
          left: Math.min(Math.max(12, hoverInfo.x + 12), 260),
          top: Math.max(12, hoverInfo.y - 12),
        }}
        className="pointer-events-none absolute z-20 w-56 rounded-md border border-slate-500 bg-[#090d16]/95 p-2.5 text-xs shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-100">{district.name}</span>
          <span className="font-mono text-[10px] uppercase text-slate-400">
            {formatZoneLabel(district.zoneType)}
          </span>
        </div>
        <div className="mt-1.5 space-y-1 font-mono text-[11px] tabular-nums">
          <div className="flex justify-between text-slate-300">
            <span>Active cases</span>
            <span>{formatInt(activeInf)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>ICU load / beds</span>
            <span className={stressPct >= 100 ? 'font-semibold text-rose-400' : 'text-slate-100'}>
              {formatFixed(icuDemand, 1)} / {district.icuBeds} ({stressPct}%)
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Week {meta.weekNumber} dispatch</span>
            <span
              className={
                treated
                  ? strategy === 'reactive'
                    ? 'font-semibold text-rose-300'
                    : 'font-semibold text-cyan-300'
                  : 'text-slate-400'
              }
            >
              {treated ? 'Active' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Synchronized spatial epidemic comparison"
      data-tour="split-map"
      className="rounded-lg border border-slate-800 bg-[#0f172a]"
    >
      {/* Map Section Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Spatial ICU Stress Comparison
          </h2>
          <span className="rounded border border-slate-700 bg-[#162033] px-2 py-0.5 font-mono text-[11px] tabular-nums text-slate-300">
            Day {meta.day} / {meta.maxDay} · {meta.weekLabel}
          </span>
          {offlineFallback && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-[#2e1f07] px-2 py-0.5 font-mono text-[11px] text-[#fcd34d]">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Offline Map Canvas</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSyncMaps}
            aria-pressed={syncMapsLocked}
            className="hidden min-h-[36px] items-center gap-1.5 rounded-md border border-slate-500 bg-[#162033] px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 min-[720px]:inline-flex"
          >
            {syncMapsLocked ? (
              <Link2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            ) : (
              <Link2Off className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            )}
            <span>Camera Sync: {syncMapsLocked ? 'Locked' : 'Unlocked'}</span>
          </button>

          <button
            type="button"
            onClick={resetCamera}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-500 bg-[#162033] px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-slate-100 min-[720px]:min-h-[36px]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Mobile Scenario Switch (< 720px) */}
      <div className="border-b border-slate-800 p-3 min-[720px]:hidden">
        <div
          role="group"
          aria-label="Select strategy map on mobile"
          className="grid grid-cols-2 gap-1 rounded-md border border-slate-500 bg-[#162033] p-1"
        >
          <button
            type="button"
            aria-pressed={mobileMapStrategy === 'reactive'}
            onClick={() => onSetMobileMapStrategy('reactive')}
            className={`min-h-[44px] rounded px-3 py-2 text-xs font-semibold transition-colors ${
              mobileMapStrategy === 'reactive'
                ? 'bg-[#3b111c] text-[#fda4af] ring-1 ring-inset ring-rose-400/70'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Reactive Baseline
          </button>
          <button
            type="button"
            aria-pressed={mobileMapStrategy === 'sennagrid'}
            onClick={() => onSetMobileMapStrategy('sennagrid')}
            className={`min-h-[44px] rounded px-3 py-2 text-xs font-semibold transition-colors ${
              mobileMapStrategy === 'sennagrid'
                ? 'bg-[#083344] text-[#67e8f9] ring-1 ring-inset ring-cyan-400/70'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            SennaGrid Optimized
          </button>
        </div>
      </div>

      {/* Dual Synchronized Map Grid */}
      <div className="grid grid-cols-1 divide-y divide-slate-800 min-[720px]:grid-cols-2 min-[720px]:divide-x min-[720px]:divide-y-0">
        {/* Left Map: Reactive Baseline */}
        <div
          className={
            mobileMapStrategy === 'reactive' ? 'block' : 'hidden min-[720px]:block'
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#121a2d] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full bg-rose-400"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-rose-300">Reactive Baseline</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
              <span className="text-slate-300">{reactiveTreatedCount} active</span>
              <span
                className={`rounded px-1.5 py-0.5 ${
                  reactiveDayOverflow > 0.05
                    ? 'bg-[#3b111c] font-semibold text-[#fda4af]'
                    : 'bg-[#162033] text-slate-300'
                }`}
              >
                Overflow: {formatFixed(reactiveDayOverflow, 1)} beds
              </span>
            </div>
          </div>

          <div className="relative h-[340px] w-full bg-[#090d16] min-[720px]:h-[380px] min-[1180px]:h-[450px]">
            <div
              ref={leftContainerRef}
              className="h-full w-full"
              aria-label={`Reactive Baseline map for ${preset.name}`}
            />
            {renderHoverTooltip('reactive')}
          </div>
        </div>

        {/* Right Map: SennaGrid Optimized */}
        <div
          className={
            mobileMapStrategy === 'sennagrid' ? 'block' : 'hidden min-[720px]:block'
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#121a2d] px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full bg-cyan-400"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-cyan-300">SennaGrid Optimized</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
              <span className="text-slate-300">{sennagridTreatedCount} active</span>
              <span
                className={`rounded px-1.5 py-0.5 ${
                  sennagridDayOverflow > 0.05
                    ? 'bg-[#2e1f07] font-semibold text-[#fcd34d]'
                    : 'bg-[#082f23] font-semibold text-[#6ee7b7]'
                }`}
              >
                Overflow: {formatFixed(sennagridDayOverflow, 1)} beds
              </span>
            </div>
          </div>

          <div className="relative h-[340px] w-full bg-[#090d16] min-[720px]:h-[380px] min-[1180px]:h-[450px]">
            <div
              ref={rightContainerRef}
              className="h-full w-full"
              aria-label={`SennaGrid Optimized map for ${preset.name}`}
            />
            {renderHoverTooltip('sennagrid')}
          </div>
        </div>
      </div>

      {/* Map Legend & Keyboard-Accessible District Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0d1424] px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400">
            ICU Stress (Load / Beds):
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-slate-500 bg-[#243854]" aria-hidden="true" />
            <span>Below 60% Safe</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-amber-400/60 bg-[#d97706]" aria-hidden="true" />
            <span>60 to 99% Strained</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-rose-400/60 bg-[#e11d48]" aria-hidden="true" />
            <span>100%+ ICU Overflow</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border-2 border-cyan-400 bg-transparent"
              aria-hidden="true"
            />
            <span>Active Dispatch Outline</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="sg-district-select"
            className="font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400"
          >
            Inspect District
          </label>
          <select
            id="sg-district-select"
            value={selectedDistrictId ?? ''}
            onChange={(e) => onSelectDistrict(e.target.value || null)}
            className="min-h-[44px] rounded-md border border-slate-500 bg-[#162033] px-2.5 py-1 text-xs font-medium text-slate-100 min-[720px]:min-h-[34px]"
          >
            <option value="" className="bg-[#0f172a] text-slate-300">
              Select district...
            </option>
            {output.districts.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0f172a] text-slate-100">
                {d.name} ({d.icuBeds} ICU beds)
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
