import type { OptimizationOutput, StrategyName } from '@sennagrid/engine';
import { WifiOff } from 'lucide-react';
import maplibregl, {
  type ExpressionSpecification,
  type LngLatBoundsLike,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRegionPreset, type DistrictFeatureCollection } from '../../data/regions';
import {
  buildTopCommuterCorridors,
  classifyStressBand,
  computeDistrictStress,
  formatFixed,
  formatInt,
  formatZoneLabel,
  getDispatchedDistrictsForWeek,
  getTimelineMeta,
  selectPriorityBadgeDistrictIds,
} from '../../lib/viewModels';
import type { MobileMapStrategy } from '../../store/useSimulationStore';
import { DistrictInspector, DistrictWatchlistGrid } from './DistrictInspector';

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
        'background-color': '#f1f5f9',
      },
    },
  ],
};

// Calm pastel cartographic stress ramp with crisp threshold jump at 100% ICU overflow
const STRESS_FILL_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['coalesce', ['feature-state', 'stress'], 0],
  0,
  '#ecfdf5',
  0.4,
  '#f1f5f9',
  0.6,
  '#fef3c7',
  0.995,
  '#fde68a',
  1.0,
  '#fecdd3',
  1.35,
  '#f43f5e',
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
  children?: React.ReactNode;
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
        'fill-opacity': 0.78,
      },
    });
  }

  if (!map.getLayer('districts-base-outline')) {
    map.addLayer({
      id: 'districts-base-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#94a3b8',
        'line-width': 0.9,
        'line-opacity': 0.7,
      },
    });
  }

  // Selected halo sits under active dispatch outlines so team borders stay clearly visible
  if (!map.getLayer('districts-selected-halo')) {
    map.addLayer({
      id: 'districts-selected-halo',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#0f172a',
        'line-width': ['case', ['==', ['feature-state', 'selected'], true], 5.5, 0],
        'line-opacity': 0.28,
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
        'line-color': '#64748b',
        'line-width': ['interpolate', ['linear'], ['get', 'strength'], 0, 0.8, 1, 2.0],
        'line-opacity': 0.28,
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
        'line-width': ['case', ['==', ['feature-state', 'treated'], true], 2.6, 0],
      },
    });
  }
}

function compactDistrictLabel(name: string): string {
  const firstWord = name.split(/\s+/)[0] ?? name;
  return firstWord.length >= 4 ? firstWord : name;
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
  handlesRef.current = output.districts.map((district) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sg-ward-marker';
    btn.title = `${district.name} (${district.icuBeds} ICU beds)`;

    const dot = document.createElement('span');
    dot.className = 'sg-ward-dot';
    dot.setAttribute('aria-hidden', 'true');

    const labelSpan = document.createElement('span');
    labelSpan.textContent = compactDistrictLabel(district.name);

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
  showAllLabels: boolean,
): void {
  const hasSource = Boolean(map.getSource(SOURCE_ID));
  const meta = getTimelineMeta(output, day);
  const stratResult = strategy === 'reactive' ? output.reactive : output.sennagrid;
  const n = output.districts.length;
  const rowBase = meta.day * n;
  const weekRow = stratResult.schedule[meta.weekIndex];
  const visibleBadgeIds =
    showLabels && !showAllLabels
      ? selectPriorityBadgeDistrictIds(output, strategy, day, selectedDistrictId, 5)
      : null;

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
      const shouldShow =
        showLabels && (showAllLabels || (visibleBadgeIds?.has(district.id) ?? false));
      handle.el.style.display = shouldShow ? 'inline-flex' : 'none';
      if (shouldShow) {
        const pct = Math.round(stress * 100);
        handle.labelSpan.textContent = `${compactDistrictLabel(district.name)} ${pct}%`;
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
  children,
}: SplitMapViewProps) {
  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<maplibregl.Map | null>(null);
  const rightMapRef = useRef<maplibregl.Map | null>(null);
  const leftMarkersRef = useRef<MarkerHandle[]>([]);
  const rightMarkersRef = useRef<MarkerHandle[]>([]);

  const [viewMode, setViewMode] = useState<'map' | 'watchlist'>('map');
  const [showAllLabels, setShowAllLabels] = useState(false);

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
  const latestShowAllLabelsRef = useRef(showAllLabels);
  latestShowAllLabelsRef.current = showAllLabels;
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
    leftMapRef.current?.fitBounds(bounds, { padding: 26, animate: false });
    rightMapRef.current?.fitBounds(bounds, { padding: 26, animate: false });
    isSyncingRef.current = false;
  }, []);

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
        fitBoundsOptions: { padding: 26 },
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
          latestShowAllLabelsRef.current,
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
        showAllLabels,
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
        showAllLabels,
      );
    }
  }, [output, currentDay, selectedDistrictId, showDistrictLabels, showAllLabels, mapsReady]);

  useEffect(() => {
    if (viewMode !== 'map') return;
    const raf = requestAnimationFrame(() => {
      leftMapRef.current?.resize();
      rightMapRef.current?.resize();
      fitBothToDistricts();
    });
    return () => cancelAnimationFrame(raf);
  }, [mobileMapStrategy, viewMode, fitBothToDistricts]);

  const sennagridDispatched = useMemo(
    () => getDispatchedDistrictsForWeek(output, 'sennagrid', meta.weekIndex),
    [output, meta.weekIndex],
  );

  const reactiveDayOverflow = output.reactive.dailyCityOverflow[meta.day] ?? 0;
  const sennagridDayOverflow = output.sennagrid.dailyCityOverflow[meta.day] ?? 0;

  const { reactiveBreaches, sennagridBreaches } = useMemo(() => {
    const n = output.districts.length;
    const base = meta.day * n;
    let rCount = 0;
    let sCount = 0;
    for (let i = 0; i < n; i++) {
      const beds = output.districts[i]?.icuBeds ?? 1;
      if ((output.reactive.districtIcuDemand[base + i] ?? 0) >= beds) rCount++;
      if ((output.sennagrid.districtIcuDemand[base + i] ?? 0) >= beds) sCount++;
    }
    return { reactiveBreaches: rCount, sennagridBreaches: sCount };
  }, [output, meta.day]);

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
        className="pointer-events-none absolute z-30 w-52 rounded-lg border border-slate-200 bg-white/95 p-2.5 text-xs shadow-md"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[#0f172a]">{district.name}</span>
          <span className="text-[10px] font-medium text-slate-600">
            {formatZoneLabel(district.zoneType)}
          </span>
        </div>
        <div className="mt-1.5 space-y-1 font-mono text-[11px] tabular-nums text-slate-600">
          <div className="flex justify-between">
            <span>Active cases</span>
            <span className="font-semibold text-[#0f172a]">{formatInt(activeInf)}</span>
          </div>
          <div className="flex justify-between">
            <span>ICU load</span>
            <span className={stressPct >= 100 ? 'font-bold text-[#be123c]' : 'font-semibold text-[#0f172a]'}>
              {formatFixed(icuDemand, 1)} / {district.icuBeds} ({stressPct}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Week {meta.weekNumber}</span>
            <span className={treated ? 'font-semibold text-[#0f766e]' : 'text-slate-600'}>
              {treated ? 'Team Active' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Spatial district ICU comparison"
      data-tour="split-map"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {/* Calm Header: Title + 3-Dot Legend + Map / Watchlist Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm font-semibold text-[#0f172a]">
            District ICU Load · Day {meta.day}
          </h2>
          {offlineFallback && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b45309]">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Offline Basemap</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#059669]" aria-hidden="true" />
              <span>&lt;60% Safe</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#d97706]" aria-hidden="true" />
              <span>60–99% Strained</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#e11d48]" aria-hidden="true" />
              <span>≥100% Overflow</span>
            </span>
          </div>

          <div
            role="group"
            aria-label="Spatial view mode"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              className={`min-h-[44px] rounded-md px-2.5 py-1 transition-all min-[720px]:min-h-[28px] ${
                viewMode === 'map'
                  ? 'bg-white font-semibold text-[#0f172a] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'watchlist'}
              onClick={() => setViewMode('watchlist')}
              className={`min-h-[44px] rounded-md px-2.5 py-1 transition-all min-[720px]:min-h-[28px] ${
                viewMode === 'watchlist'
                  ? 'bg-white font-semibold text-[#0f172a] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Dual Side-by-Side Maps OR Watchlist Table */}
      <div className={viewMode === 'watchlist' ? 'hidden' : 'p-5'}>
        {/* Mobile Strategy Switcher (< 720px) */}
        <div className="mb-3 min-[720px]:hidden">
          <div
            role="group"
            aria-label="Select map pane on mobile"
            className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              aria-pressed={mobileMapStrategy === 'reactive'}
              onClick={() => onSetMobileMapStrategy('reactive')}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-semibold ${
                mobileMapStrategy === 'reactive'
                  ? 'bg-white text-[#be123c] shadow-2xs'
                  : 'text-slate-600'
              }`}
            >
              Without SennaGrid
            </button>
            <button
              type="button"
              aria-pressed={mobileMapStrategy === 'sennagrid'}
              onClick={() => onSetMobileMapStrategy('sennagrid')}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-semibold ${
                mobileMapStrategy === 'sennagrid'
                  ? 'bg-white text-[#0f766e] shadow-2xs'
                  : 'text-slate-600'
              }`}
            >
              With SennaGrid
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 min-[720px]:grid-cols-2">
          {/* LEFT: Without SennaGrid */}
          <div className={mobileMapStrategy === 'reactive' ? 'block' : 'hidden min-[720px]:block'}>
            <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-[#0f172a]">Without SennaGrid</span>
              <span className="font-mono font-medium tabular-nums text-[#be123c]">
                +{formatFixed(reactiveDayOverflow, 1)} overflow beds · {reactiveBreaches} breached
              </span>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#f1f5f9] min-[720px]:h-[340px] min-[1180px]:h-[370px]">
              <div
                ref={leftContainerRef}
                className="h-full w-full"
                aria-label={`Without SennaGrid reactive map for ${preset.name}`}
              />
              {renderHoverTooltip('reactive')}
            </div>
          </div>

          {/* RIGHT: With SennaGrid */}
          <div className={mobileMapStrategy === 'sennagrid' ? 'block' : 'hidden min-[720px]:block'}>
            <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-[#0f766e]">With SennaGrid</span>
              <span className="font-mono font-medium tabular-nums text-[#0f766e]">
                {formatFixed(sennagridDayOverflow, 1)} overflow beds · {sennagridBreaches} breached ·{' '}
                {sennagridDispatched.length} active hubs
              </span>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-slate-200 bg-[#f1f5f9] min-[720px]:h-[340px] min-[1180px]:h-[370px]">
              <div
                ref={rightContainerRef}
                className="h-full w-full"
                aria-label={`With SennaGrid optimized map for ${preset.name}`}
              />
              {renderHoverTooltip('sennagrid')}
            </div>
          </div>
        </div>

        {/* Quiet Single-Line Map Utility Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!showDistrictLabels) {
                  onToggleDistrictLabels();
                  setShowAllLabels(false);
                } else if (!showAllLabels) {
                  setShowAllLabels(true);
                } else {
                  onToggleDistrictLabels();
                  setShowAllLabels(false);
                }
              }}
              className="min-h-[44px] font-medium hover:text-[#0f172a] min-[720px]:min-h-0"
            >
              Labels: {!showDistrictLabels ? 'Off' : showAllLabels ? 'All Wards' : 'Key Wards'}
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={onToggleCommuterFlows}
              aria-pressed={showCommuterFlows}
              className="min-h-[44px] font-medium hover:text-[#0f172a] min-[720px]:min-h-0"
            >
              Commuter Flows: {showCommuterFlows ? 'On' : 'Off'}
            </button>
            <span aria-hidden="true" className="hidden text-slate-300 min-[720px]:inline">
              ·
            </span>
            <button
              type="button"
              onClick={onToggleSyncMaps}
              aria-pressed={syncMapsLocked}
              className="hidden font-medium hover:text-[#0f172a] min-[720px]:inline"
            >
              Sync Pan: {syncMapsLocked ? 'On' : 'Off'}
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <button
              type="button"
              onClick={fitBothToDistricts}
              className="min-h-[44px] font-medium hover:text-[#0f172a] min-[720px]:min-h-0"
            >
              Reset Framing
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sg-district-select" className="font-medium text-slate-600">
              Inspect Ward:
            </label>
            <select
              id="sg-district-select"
              value={selectedDistrictId ?? ''}
              onChange={(e) => onSelectDistrict(e.target.value || null)}
              className="min-h-[44px] rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-[#0f172a] min-[720px]:min-h-[26px]"
            >
              <option value="">None (click ward)</option>
              {output.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.icuBeds} beds)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'watchlist' && (
        <DistrictWatchlistGrid
          output={output}
          selectedDistrictId={selectedDistrictId}
          currentDay={currentDay}
          onSelectDistrict={onSelectDistrict}
        />
      )}

      {/* Contextual Ward Comparison Strip (appears cleanly only when a ward is clicked/selected) */}
      {selectedDistrictId && (
        <DistrictInspector
          output={output}
          selectedDistrictId={selectedDistrictId}
          currentDay={currentDay}
          onClose={() => onSelectDistrict(null)}
        />
      )}

      {/* Docked Slim Playback Strip */}
      {children}
    </section>
  );
}
