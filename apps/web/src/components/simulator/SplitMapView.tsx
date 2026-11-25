import type { OptimizationOutput, StrategyName } from '@sennagrid/engine';
import { Eye, EyeOff, Link2, Link2Off, Network, RotateCcw, WifiOff } from 'lucide-react';
import maplibregl, {
  type ExpressionSpecification,
  type LngLatBoundsLike,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRegionPreset, type DistrictFeatureCollection } from '../../data/regions';
import {
  buildDistrictShortCode,
  buildTopCommuterCorridors,
  classifyStressBand,
  computeDistrictStress,
  formatFixed,
  formatInt,
  formatZoneLabel,
  getDispatchedDistrictsForWeek,
  getTimelineMeta,
} from '../../lib/viewModels';
import type { MobileMapStrategy } from '../../store/useSimulationStore';

const CARTO_POSITRON_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const BASEMAP_LOAD_TIMEOUT_MS = 4500;
const SOURCE_ID = 'sennagrid-districts';
const FLOWS_SOURCE_ID = 'sennagrid-flows';

const OFFLINE_LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: {
        'background-color': '#eef2f6',
      },
    },
  ],
};

// Clean cartographic ramp with a sharp threshold jump at 100% so crimson exclusively marks true ICU overflow
const STRESS_FILL_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['feature-state', 'stress'], 0],
  0,
  '#ecfdf5',
  0.35,
  '#bae6fd',
  0.6,
  '#fde68a',
  0.995,
  '#fbbf24',
  1.0,
  '#f43f5e',
  1.35,
  '#be123c',
];

interface HoverInfo {
  strategy: StrategyName;
  districtId: string;
  x: number;
  y: number;
}

interface MarkerHandle {
  districtId: string;
  marker: maplibregl.Marker;
  el: HTMLButtonElement;
  labelSpan: HTMLSpanElement;
}

interface SplitMapViewProps {
  output: OptimizationOutput;
  currentDay: number;
  selectedDistrictId: string | null;
  syncMapsLocked: boolean;
  showCommuterFlows: boolean;
  showDistrictLabels: boolean;
  mobileMapStrategy: MobileMapStrategy;
  onSelectDistrict: (districtId: string | null) => void;
  onToggleSyncMaps: () => void;
  onToggleCommuterFlows: () => void;
  onToggleDistrictLabels: () => void;
  onSetMobileMapStrategy: (strategy: MobileMapStrategy) => void;
}

function computeFeatureCollectionBounds(fc: DistrictFeatureCollection): LngLatBoundsLike {
  let minLng = 180;
  let minLat = 90;
  let maxLng = -180;
  let maxLat = -90;

  for (const feat of fc.features) {
    const ring = feat.geometry.coordinates[0] ?? [];
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function buildFlowsFeatureCollection(output: OptimizationOutput): GeoJSON.FeatureCollection {
  const corridors = buildTopCommuterCorridors(output, 16);
  return {
    type: 'FeatureCollection',
    features: corridors.map((arc) => ({
      type: 'Feature',
      properties: {
        id: arc.id,
        strength: arc.strength,
      },
      geometry: {
        type: 'LineString',
        coordinates: [arc.from, arc.to],
      },
    })),
  };
}

function attachDistrictLayers(
  map: maplibregl.Map,
  featureCollection: DistrictFeatureCollection,
  flowsGeoJson: GeoJSON.FeatureCollection,
  strategy: StrategyName,
  showFlows: boolean,
): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: featureCollection as unknown as GeoJSON.FeatureCollection,
      promoteId: 'id',
    });
  }

  if (!map.getSource(FLOWS_SOURCE_ID)) {
    map.addSource(FLOWS_SOURCE_ID, {
      type: 'geojson',
      data: flowsGeoJson,
    });
  }

  if (!map.getLayer('districts-fill')) {
    map.addLayer({
      id: 'districts-fill',
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': STRESS_FILL_EXPRESSION,
        'fill-opacity': 0.82,
      },
    });
  }

  if (!map.getLayer('districts-base-outline')) {
    map.addLayer({
      id: 'districts-base-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#64748b',
        'line-width': 1.1,
        'line-opacity': 0.65,
      },
    });
  }

  // Selected halo sits UNDER active dispatch border so treated outlines remain 100% visible!
  if (!map.getLayer('districts-selected-halo')) {
    map.addLayer({
      id: 'districts-selected-halo',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#0f172a',
        'line-width': ['case', ['==', ['feature-state', 'selected'], true], 6.5, 0],
        'line-opacity': 0.25,
      },
    });
  }

  if (!map.getLayer('commuter-flows-line')) {
    map.addLayer({
      id: 'commuter-flows-line',
      type: 'line',
      source: FLOWS_SOURCE_ID,
      layout: {
        visibility: showFlows ? 'visible' : 'none',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#475569',
        'line-width': ['interpolate', ['linear'], ['get', 'strength'], 0, 1, 1, 2.4],
        'line-opacity': 0.34,
        'line-dasharray': [2, 2],
      },
    });
  }

  const treatedColor = strategy === 'reactive' ? '#e11d48' : '#0f766e';
  if (!map.getLayer('districts-treated-outline')) {
    map.addLayer({
      id: 'districts-treated-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': treatedColor,
        'line-width': ['case', ['==', ['feature-state', 'treated'], true], 3, 0],
      },
    });
  }
}

function syncMarkersForMap(
  map: maplibregl.Map,
  handlesRef: { current: MarkerHandle[] },
  output: OptimizationOutput,
  onSelect: (id: string) => void,
): void {
  for (const handle of handlesRef.current) {
    handle.marker.remove();
  }
  handlesRef.current = output.districts.map((district, idx) => {
    const shortCode = buildDistrictShortCode(district, idx);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sg-ward-marker';
    btn.title = `${district.name} (${district.icuBeds} ICU beds)`;

    const dot = document.createElement('span');
    dot.className = 'sg-ward-dot';
    dot.setAttribute('aria-hidden', 'true');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = shortCode;

    btn.appendChild(dot);
    btn.appendChild(labelSpan);
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onSelect(district.id);
    });

    const marker = new maplibregl.Marker({ element: btn, anchor: 'center' })
      .setLngLat(district.centroid)
      .addTo(map);

    return {
      districtId: district.id,
      marker,
      el: btn,
      labelSpan,
    };
  });
}

function applyFeatureStatesAndMarkers(
  map: maplibregl.Map,
  handles: readonly MarkerHandle[],
  output: OptimizationOutput,
  strategy: StrategyName,
  day: number,
  selectedDistrictId: string | null,
  showLabels: boolean,
): void {
  const hasSource = Boolean(map.getSource(SOURCE_ID));
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

    if (hasSource) {
      map.setFeatureState(
        { source: SOURCE_ID, id: district.id },
        { stress, treated, selected },
      );
    }

    const handle = handles[i];
    if (handle) {
      handle.el.style.display = showLabels ? 'inline-flex' : 'none';
      if (showLabels) {
        const shortInitials = buildDistrictShortCode(district, i).slice(0, 2);
        const pct = Math.round(stress * 100);
        handle.labelSpan.textContent = `${shortInitials} ${pct}%`;
        handle.el.dataset.band = classifyStressBand(stress);
        handle.el.dataset.treated = treated ? strategy : 'none';
        handle.el.dataset.selected = selected ? 'true' : 'false';
      }
    }
  }
}

export function SplitMapView({
  output,
  currentDay,
  selectedDistrictId,
  syncMapsLocked,
  showCommuterFlows,
  showDistrictLabels,
  mobileMapStrategy,
  onSelectDistrict,
  onToggleSyncMaps,
  onToggleCommuterFlows,
  onToggleDistrictLabels,
  onSetMobileMapStrategy,
}: SplitMapViewProps) {
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<maplibregl.Map | null>(null);
  const rightMapRef = useRef<maplibregl.Map | null>(null);
  const leftMarkersRef = useRef<MarkerHandle[]>([]);
  const rightMarkersRef = useRef<MarkerHandle[]>([]);

  const isSyncingRef = useRef(false);
  const syncLockedRef = useRef(syncMapsLocked);
  syncLockedRef.current = syncMapsLocked;

  const latestOutputRef = useRef(output);
  latestOutputRef.current = output;
  const latestDayRef = useRef(currentDay);
  latestDayRef.current = currentDay;
  const latestSelectedRef = useRef(selectedDistrictId);
  latestSelectedRef.current = selectedDistrictId;
  const latestShowFlowsRef = useRef(showCommuterFlows);
  latestShowFlowsRef.current = showCommuterFlows;
  const latestShowLabelsRef = useRef(showDistrictLabels);
  latestShowLabelsRef.current = showDistrictLabels;
  const onSelectDistrictRef = useRef(onSelectDistrict);
  onSelectDistrictRef.current = onSelectDistrict;

  const [offlineFallback, setOfflineFallback] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const preset = getRegionPreset(output.params.regionId);
  const meta = getTimelineMeta(output, currentDay);
  const flowsGeoJson = useMemo(
    () => buildFlowsFeatureCollection(output),
    [output.params.regionId, output.params.mobilityOutflow],
  );

  const fitBothToDistricts = useCallback(() => {
    const activePreset = getRegionPreset(latestOutputRef.current.params.regionId);
    const bounds = computeFeatureCollectionBounds(activePreset.featureCollection);
    isSyncingRef.current = true;
    leftMapRef.current?.fitBounds(bounds, { padding: 28, animate: false });
    rightMapRef.current?.fitBounds(bounds, { padding: 28, animate: false });
    isSyncingRef.current = false;
  }, []);

  // Initialize dual MapLibre GL v5 instances once
  useEffect(() => {
    const leftEl = leftContainerRef.current;
    const rightEl = rightContainerRef.current;
    if (!leftEl || !rightEl) return;

    const initialPreset = getRegionPreset(latestOutputRef.current.params.regionId);
    const initialBounds = computeFeatureCollectionBounds(initialPreset.featureCollection);
    let disposed = false;
    let fallbackTriggered = false;
    let loadedCount = 0;

    const initMap = (
      container: HTMLDivElement,
      strategy: StrategyName,
      markersRef: { current: MarkerHandle[] },
    ): maplibregl.Map => {
      const map = new maplibregl.Map({
        container,
        style: CARTO_POSITRON_STYLE_URL,
        bounds: initialBounds,
        fitBoundsOptions: { padding: 28 },
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      const activateFallback = () => {
        if (disposed || fallbackTriggered) return;
        fallbackTriggered = true;
        setOfflineFallback(true);
        leftMapRef.current?.setStyle(OFFLINE_LIGHT_STYLE);
        rightMapRef.current?.setStyle(OFFLINE_LIGHT_STYLE);
      };

      const styleTimer = setTimeout(() => {
        if (!disposed && !map.isStyleLoaded()) {
          activateFallback();
        }
      }, BASEMAP_LOAD_TIMEOUT_MS);

      map.on('style.load', () => {
        clearTimeout(styleTimer);
        if (disposed) return;
        const curOut = latestOutputRef.current;
        const curPreset = getRegionPreset(curOut.params.regionId);
        const curFlows = buildFlowsFeatureCollection(curOut);
        attachDistrictLayers(
          map,
          curPreset.featureCollection,
          curFlows,
          strategy,
          latestShowFlowsRef.current,
        );
        syncMarkersForMap(map, markersRef, curOut, (id) => onSelectDistrictRef.current(id));
        applyFeatureStatesAndMarkers(
          map,
          markersRef.current,
          curOut,
          strategy,
          latestDayRef.current,
          latestSelectedRef.current,
          latestShowLabelsRef.current,
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

    const leftMap = initMap(leftEl, 'reactive', leftMarkersRef);
    const rightMap = initMap(rightEl, 'sennagrid', rightMarkersRef);
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
      for (const h of leftMarkersRef.current) h.marker.remove();
      for (const h of rightMarkersRef.current) h.marker.remove();
      leftMarkersRef.current = [];
      rightMarkersRef.current = [];
      leftMap.off('move', onLeftMove);
      rightMap.off('move', onRightMove);
      leftMap.remove();
      rightMap.remove();
      leftMapRef.current = null;
      rightMapRef.current = null;
    };
  }, []);

  // Update GeoJSON sources, markers, and fitBounds when switching scenario
  useEffect(() => {
    const activePreset = getRegionPreset(output.params.regionId);
    const updateRegionOnMap = (
      map: maplibregl.Map | null,
      handlesRef: { current: MarkerHandle[] },
      strategy: StrategyName,
    ) => {
      if (!map || !map.isStyleLoaded()) return;
      const distSrc = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (distSrc) {
        distSrc.setData(activePreset.featureCollection as unknown as GeoJSON.FeatureCollection);
      } else {
        attachDistrictLayers(
          map,
          activePreset.featureCollection,
          flowsGeoJson,
          strategy,
          showCommuterFlows,
        );
      }
      const flowSrc = map.getSource(FLOWS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      flowSrc?.setData(flowsGeoJson);
      syncMarkersForMap(map, handlesRef, output, (id) => onSelectDistrictRef.current(id));
    };

    updateRegionOnMap(leftMapRef.current, leftMarkersRef, 'reactive');
    updateRegionOnMap(rightMapRef.current, rightMarkersRef, 'sennagrid');
    fitBothToDistricts();
    setHoverInfo(null);
  }, [output.params.regionId, fitBothToDistricts]);

  // Update commuter flow data & visibility when mobilityOutflow or toggle changes
  useEffect(() => {
    for (const map of [leftMapRef.current, rightMapRef.current]) {
      if (!map || !map.isStyleLoaded()) continue;
      const flowSrc = map.getSource(FLOWS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      flowSrc?.setData(flowsGeoJson);
      if (map.getLayer('commuter-flows-line')) {
        map.setLayoutProperty(
          'commuter-flows-line',
          'visibility',
          showCommuterFlows ? 'visible' : 'none',
        );
      }
    }
  }, [flowsGeoJson, showCommuterFlows, mapsReady]);

  // Fast Day 0..91 playback updates on polygons and markers
  useEffect(() => {
    if (leftMapRef.current?.isStyleLoaded()) {
      applyFeatureStatesAndMarkers(
        leftMapRef.current,
        leftMarkersRef.current,
        output,
        'reactive',
        currentDay,
        selectedDistrictId,
        showDistrictLabels,
      );
    }
    if (rightMapRef.current?.isStyleLoaded()) {
      applyFeatureStatesAndMarkers(
        rightMapRef.current,
        rightMarkersRef.current,
        output,
        'sennagrid',
        currentDay,
        selectedDistrictId,
        showDistrictLabels,
      );
    }
  }, [output, currentDay, selectedDistrictId, showDistrictLabels, mapsReady]);

  // Ensure mobile map resizes cleanly when toggled
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      leftMapRef.current?.resize();
      rightMapRef.current?.resize();
      fitBothToDistricts();
    });
    return () => cancelAnimationFrame(raf);
  }, [mobileMapStrategy, fitBothToDistricts]);

  const reactiveDispatched = useMemo(
    () => getDispatchedDistrictsForWeek(output, 'reactive', meta.weekIndex),
    [output, meta.weekIndex],
  );
  const sennagridDispatched = useMemo(
    () => getDispatchedDistrictsForWeek(output, 'sennagrid', meta.weekIndex),
    [output, meta.weekIndex],
  );

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
          left: Math.min(Math.max(10, hoverInfo.x + 12), 230),
          top: Math.max(10, hoverInfo.y - 12),
        }}
        className="pointer-events-none absolute z-30 w-56 rounded-lg border border-slate-300 bg-white/96 p-2.5 text-xs shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[#0f172a]">{district.name}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {formatZoneLabel(district.zoneType)}
          </span>
        </div>
        <div className="mt-1.5 space-y-1 font-mono text-[11px] tabular-nums text-slate-600">
          <div className="flex justify-between">
            <span>Active cases</span>
            <span className="font-semibold text-[#0f172a]">{formatInt(activeInf)}</span>
          </div>
          <div className="flex justify-between">
            <span>ICU load / beds</span>
            <span className={stressPct >= 100 ? 'font-bold text-[#be123c]' : 'font-semibold text-[#0f172a]'}>
              {formatFixed(icuDemand, 1)} / {district.icuBeds} ({stressPct}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Week {meta.weekNumber} team</span>
            <span
              className={
                treated
                  ? strategy === 'reactive'
                    ? 'font-bold text-[#be123c]'
                    : 'font-bold text-[#0f766e]'
                  : 'text-slate-500'
              }
            >
              {treated ? 'Dispatched Here' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-tour="split-map" className="overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-2xs">
      {/* Map Header & Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-[#0f172a]">Side-by-Side Spatial ICU Map</h2>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-700">
            Day {meta.day} · {meta.weekLabel}
          </span>
          {offlineFallback && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/30 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#92400e]">
              <WifiOff className="h-3 w-3" aria-hidden="true" />
              <span>Offline Basemap</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleDistrictLabels}
            aria-pressed={showDistrictLabels}
            className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors min-[720px]:min-h-[32px] ${
              showDistrictLabels
                ? 'border-teal-600/40 bg-teal-50 text-[#115e59]'
                : 'border-slate-500 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showDistrictLabels ? (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Ward Badges</span>
          </button>

          <button
            type="button"
            onClick={onToggleCommuterFlows}
            aria-pressed={showCommuterFlows}
            className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors min-[720px]:min-h-[32px] ${
              showCommuterFlows
                ? 'border-teal-600/40 bg-teal-50 text-[#115e59]'
                : 'border-slate-500 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Network className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Commuter Flows</span>
          </button>

          <button
            type="button"
            onClick={onToggleSyncMaps}
            aria-pressed={syncMapsLocked}
            className="hidden min-h-[32px] items-center gap-1 rounded-lg border border-slate-500 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 min-[720px]:inline-flex"
          >
            {syncMapsLocked ? (
              <Link2 className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
            ) : (
              <Link2Off className="h-3.5 w-3.5 text-[#b45309]" aria-hidden="true" />
            )}
            <span>{syncMapsLocked ? 'Sync On' : 'Sync Off'}</span>
          </button>

          <button
            type="button"
            onClick={fitBothToDistricts}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-500 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 min-[720px]:min-h-[32px]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Fit City</span>
          </button>
        </div>
      </div>

      {/* Mobile Scenario Switch (< 720px) */}
      <div className="border-b border-slate-200 bg-slate-50 p-2.5 min-[720px]:hidden">
        <div
          role="group"
          aria-label="Select strategy map on mobile"
          className="grid grid-cols-2 gap-1 rounded-lg border border-slate-500 bg-white p-1"
        >
          <button
            type="button"
            aria-pressed={mobileMapStrategy === 'reactive'}
            onClick={() => onSetMobileMapStrategy('reactive')}
            className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              mobileMapStrategy === 'reactive'
                ? 'bg-rose-50 text-[#9f1239] ring-1 ring-rose-500/40'
                : 'text-slate-600'
            }`}
          >
            Reactive Baseline
          </button>
          <button
            type="button"
            aria-pressed={mobileMapStrategy === 'sennagrid'}
            onClick={() => onSetMobileMapStrategy('sennagrid')}
            className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              mobileMapStrategy === 'sennagrid'
                ? 'bg-teal-50 text-[#115e59] ring-1 ring-teal-600/40'
                : 'text-slate-600'
            }`}
          >
            SennaGrid Optimized
          </button>
        </div>
      </div>

      {/* Dual Map Panes */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 min-[720px]:grid-cols-2 min-[720px]:divide-x min-[720px]:divide-y-0">
        {/* LEFT: Reactive Baseline */}
        <div className={mobileMapStrategy === 'reactive' ? 'block' : 'hidden min-[720px]:block'}>
          <div className="flex min-h-[68px] flex-col justify-between gap-1.5 border-b border-slate-200 bg-rose-50/45 px-3.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#e11d48]" aria-hidden="true" />
                <span className="text-xs font-bold text-[#9f1239]">Reactive Baseline</span>
                <span className="hidden text-[11px] text-slate-600 xl:inline">
                  (Chases current cases)
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  reactiveDayOverflow > 0.05
                    ? 'border border-rose-500/40 bg-rose-100 text-[#9f1239]'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                Overflow: {formatFixed(reactiveDayOverflow, 1)} beds
              </span>
            </div>

            {/* Active Week Dispatched Ward Chips */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="font-medium text-slate-600">Week {meta.weekNumber} teams:</span>
              {reactiveDispatched.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectDistrict(w.id)}
                  className="rounded border border-rose-500/40 bg-white px-1.5 py-0.5 font-medium text-[#9f1239] transition-colors hover:bg-rose-50"
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[330px] w-full bg-[#eef2f6] min-[720px]:h-[360px] min-[1180px]:h-[395px]">
            <div
              ref={leftContainerRef}
              className="h-full w-full"
              aria-label={`Reactive Baseline map for ${preset.name}`}
            />
            {renderHoverTooltip('reactive')}
          </div>
        </div>

        {/* RIGHT: SennaGrid Optimized */}
        <div className={mobileMapStrategy === 'sennagrid' ? 'block' : 'hidden min-[720px]:block'}>
          <div className="flex min-h-[68px] flex-col justify-between gap-1.5 border-b border-slate-200 bg-teal-50/50 px-3.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0d9488]" aria-hidden="true" />
                <span className="text-xs font-bold text-[#115e59]">SennaGrid Optimized</span>
                <span className="hidden text-[11px] text-slate-600 xl:inline">
                  (Shields hubs &amp; ICU)
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  sennagridDayOverflow > 0.05
                    ? 'border border-amber-500/40 bg-amber-100 text-[#92400e]'
                    : 'border border-emerald-600/30 bg-emerald-50 text-[#065f46]'
                }`}
              >
                Overflow: {formatFixed(sennagridDayOverflow, 1)} beds
              </span>
            </div>

            {/* Active Week Dispatched Ward Chips */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="font-medium text-slate-600">Week {meta.weekNumber} teams:</span>
              {sennagridDispatched.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectDistrict(w.id)}
                  className="rounded border border-teal-600/40 bg-white px-1.5 py-0.5 font-medium text-[#115e59] transition-colors hover:bg-teal-50"
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[330px] w-full bg-[#eef2f6] min-[720px]:h-[360px] min-[1180px]:h-[395px]">
            <div
              ref={rightContainerRef}
              className="h-full w-full"
              aria-label={`SennaGrid Optimized map for ${preset.name}`}
            />
            {renderHoverTooltip('sennagrid')}
          </div>
        </div>
      </div>

      {/* Clear Visual Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-semibold text-slate-600">ICU Stress (Demand / Beds):</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-slate-400 bg-[#ecfdf5]" aria-hidden="true" />
            <span>0–35% Calm</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-slate-400 bg-[#bae6fd]" aria-hidden="true" />
            <span>35–59% Moderate</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-amber-500 bg-[#fde68a]" aria-hidden="true" />
            <span>60–99% Strained</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-rose-600 bg-[#f43f5e]" aria-hidden="true" />
            <span>100%+ ICU Overflow</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border-2 border-[#0f766e] bg-white" aria-hidden="true" />
            <span>Active Team Outline</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sg-district-select" className="text-xs font-semibold text-slate-600">
            Inspect Ward:
          </label>
          <select
            id="sg-district-select"
            value={selectedDistrictId ?? ''}
            onChange={(e) => onSelectDistrict(e.target.value || null)}
            className="min-h-[44px] rounded-lg border border-slate-500 bg-white px-2.5 py-1 text-xs font-semibold text-[#0f172a] min-[720px]:min-h-[32px]"
          >
            <option value="">All wards (ranked list)</option>
            {output.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.icuBeds} beds)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
