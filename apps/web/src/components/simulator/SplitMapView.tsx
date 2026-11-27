import type { OptimizationOutput, StrategyName } from '@sennagrid/engine';
import { Eye, EyeOff, Link2, Link2Off, Network, RotateCcw, WifiOff } from 'lucide-react';
import maplibregl, {
  type ExpressionSpecification,
  type LngLatBoundsLike,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRegionPreset,
  type DistrictFeatureCollection,
  type RegionPreset,
} from '../../data/regions';
import {
  buildDistrictSpreadWavePlan,
  buildTopCommuterCorridors,
  classifyStressBand,
  computeDistrictStress,
  formatFixed,
  formatInt,
  formatZoneLabel,
  getDispatchedDistrictsForWeek,
  getTimelineMeta,
  selectPriorityBadgeDistrictIds,
  type DistrictSpreadWavePlan,
} from '../../lib/viewModels';
import type { MobileMapStrategy, ThemeMode } from '../../store/useSimulationStore';
import { DistrictInspector, DistrictWatchlistGrid } from './DistrictInspector';

const CARTO_POSITRON_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const CARTO_DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const BASEMAP_LOAD_TIMEOUT_MS = 4500;
const SOURCE_ID = 'sennagrid-districts';
const FLOWS_SOURCE_ID = 'sennagrid-flows';
const FLASH_DURATION_MS = 440;

function getBasemapStyleUrl(theme: ThemeMode): string {
  return theme === 'dark' ? CARTO_DARK_STYLE_URL : CARTO_POSITRON_STYLE_URL;
}

function getOfflineStyle(theme: ThemeMode): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'offline-background',
        type: 'background',
        paint: {
          'background-color': theme === 'dark' ? '#161513' : '#efebe2',
        },
      },
    ],
  };
}

// Calibrated cartographic stress ramps for Obsidian Dark & Warm Paper themes
function getStressFillExpression(theme: ThemeMode): ExpressionSpecification {
  if (theme === 'dark') {
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', 'stress'], 0],
      0,
      '#1c2b27',
      0.4,
      '#242320',
      0.6,
      '#423217',
      0.995,
      '#694914',
      1.0,
      '#5e1d2d',
      1.35,
      '#be123c',
    ];
  }
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['feature-state', 'stress'], 0],
    0,
    '#e7f3ee',
    0.4,
    '#efeae0',
    0.6,
    '#faeac1',
    0.995,
    '#f7dd97',
    1.0,
    '#fac8d1',
    1.35,
    '#f43f5e',
  ];
}

function easeOutQuad(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - (1 - c) * (1 - c);
}

function stressTierRank(stress: number): number {
  if (stress >= 1.0) return 3;
  if (stress >= 0.6) return 2;
  if (stress >= 0.42) return 1;
  return 0;
}

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

interface StrategyAnimBuffer {
  stress: number[];
  treatedWeight: number[];
  prevTargetStress: number[];
  flashUntilMs: number[];
}

interface SplitMapViewProps {
  output: OptimizationOutput;
  customPreset?: RegionPreset | null;
  theme: ThemeMode;
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
  theme: ThemeMode,
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
        'fill-color': getStressFillExpression(theme),
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', 'spreadFlash'], 0],
          0,
          theme === 'dark' ? 0.84 : 0.78,
          1,
          theme === 'dark' ? 0.94 : 0.88,
        ],
      },
    });
  }

  if (!map.getLayer('districts-base-outline')) {
    map.addLayer({
      id: 'districts-base-outline',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': theme === 'dark' ? '#5c574f' : '#8c857b',
        'line-width': 0.9,
        'line-opacity': theme === 'dark' ? 0.75 : 0.68,
      },
    });
  }

  // One-shot arrival highlight as outbreak color spreads upward into a ward (invisible when settled)
  if (!map.getLayer('districts-spread-flash')) {
    map.addLayer({
      id: 'districts-spread-flash',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': theme === 'dark' ? '#e06d4b' : '#b84322',
        'line-width': [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', 'spreadFlash'], 0],
          0,
          0,
          1,
          2.2,
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', 'spreadFlash'], 0],
          0,
          0,
          1,
          0.72,
        ],
      },
    });
  }

  // Selected halo sits under active dispatch outlines so team borders remain visible
  if (!map.getLayer('districts-selected-halo')) {
    map.addLayer({
      id: 'districts-selected-halo',
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': theme === 'dark' ? '#f3efe6' : '#1c1917',
        'line-width': ['case', ['==', ['feature-state', 'selected'], true], 5.5, 0],
        'line-opacity': theme === 'dark' ? 0.42 : 0.28,
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
        'line-color': theme === 'dark' ? '#a8a29e' : '#57534e',
        'line-width': ['interpolate', ['linear'], ['get', 'strength'], 0, 0.8, 1, 2.0],
        'line-opacity': 0.28,
        'line-dasharray': [2, 2],
      },
    });
  }

  const treatedColor =
    strategy === 'reactive'
      ? theme === 'dark'
        ? '#fb7185'
        : '#e11d48'
      : theme === 'dark'
        ? '#2dd4bf'
        : '#0f766e';

  // Soft outer glow fading cleanly in/out with treatedWeight (0..1)
  if (!map.getLayer('districts-treated-glow')) {
    map.addLayer({
      id: 'districts-treated-glow',
      type: 'line',
      source: SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': treatedColor,
        'line-width': 5.8,
        'line-blur': 2.6,
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', 'treatedWeight'], 0],
          0,
          0,
          1,
          theme === 'dark' ? 0.26 : 0.20,
        ],
      },
    });
  }

  // Smooth fade-in and fade-out on active red (left) & teal (right) dispatch marker boxes
  if (!map.getLayer('districts-treated-outline')) {
    map.addLayer({
      id: 'districts-treated-outline',
      type: 'line',
      source: SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': treatedColor,
        'line-width': 2.6,
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['coalesce', ['feature-state', 'treatedWeight'], 0],
          0,
          0,
          1,
          1,
        ],
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

function syncMarkerBadges(
  handles: readonly MarkerHandle[],
  output: OptimizationOutput,
  strategy: StrategyName,
  day: number,
  selectedDistrictId: string | null,
  showLabels: boolean,
  showAllLabels: boolean,
): void {
  const meta = getTimelineMeta(output, day);
  const stratResult = strategy === 'reactive' ? output.reactive : output.sennagrid;
  const n = output.districts.length;
  const rowBase = meta.day * n;
  const weekRow = stratResult.schedule[meta.weekIndex];
  const visibleBadgeIds =
    showLabels && !showAllLabels
      ? selectPriorityBadgeDistrictIds(output, strategy, day, selectedDistrictId, 3)
      : null;

  for (let i = 0; i < n; i++) {
    const district = output.districts[i];
    const handle = handles[i];
    if (!district || !handle) continue;
    const icuDemand = stratResult.districtIcuDemand[rowBase + i] ?? 0;
    const stress = computeDistrictStress(icuDemand, district.icuBeds);
    const treated = (weekRow?.[i] ?? 0) === 1;
    const selected = district.id === selectedDistrictId;

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

function pushDistrictFeatureStates(
  map: maplibregl.Map | null,
  plan: DistrictSpreadWavePlan,
  visualStress: readonly number[],
  visualTreated: readonly number[],
  flashes: readonly number[],
  selectedDistrictId: string | null,
): void {
  if (!map || !map.getSource(SOURCE_ID)) return;
  for (let i = 0; i < plan.cells.length; i++) {
    const cell = plan.cells[i]!;
    map.setFeatureState(
      { source: SOURCE_ID, id: cell.districtId },
      {
        stress: visualStress[i] ?? cell.targetStress,
        treatedWeight: visualTreated[i] ?? (cell.treated ? 1 : 0),
        spreadFlash: flashes[i] ?? 0,
        treated: cell.treated,
        selected: cell.districtId === selectedDistrictId,
      },
    );
  }
}

function makeEmptyBuffer(n: number): StrategyAnimBuffer {
  return {
    stress: new Array(n).fill(0),
    treatedWeight: new Array(n).fill(0),
    prevTargetStress: new Array(n).fill(0),
    flashUntilMs: new Array(n).fill(0),
  };
}

export function SplitMapView({
  output,
  customPreset = null,
  theme,
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
  const latestThemeRef = useRef(theme);
  latestThemeRef.current = theme;
  const prevThemeRef = useRef(theme);
  const lastRenderedRegionRef = useRef(output.params.regionId);
  const prevCascadeContextRef = useRef<{ regionId: string; day: number; outputRef: OptimizationOutput }>({
    regionId: output.params.regionId,
    day: currentDay,
    outputRef: output,
  });
  const onSelectDistrictRef = useRef(onSelectDistrict);
  onSelectDistrictRef.current = onSelectDistrict;

  const [offlineFallback, setOfflineFallback] = useState(false);
  const [styleEpoch, setStyleEpoch] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const preset = getRegionPreset(output.params.regionId, customPreset);
  const latestPresetRef = useRef(preset);
  latestPresetRef.current = preset;
  const meta = getTimelineMeta(output, currentDay);

  const flowsGeoJson = useMemo(() => buildFlowsFeatureCollection(output), [output]);
  const latestFlowsGeoJsonRef = useRef(flowsGeoJson);
  latestFlowsGeoJsonRef.current = flowsGeoJson;

  const reactiveWavePlan = useMemo(
    () => buildDistrictSpreadWavePlan(output, 'reactive', meta.day),
    [output, meta.day],
  );
  const sennagridWavePlan = useMemo(
    () => buildDistrictSpreadWavePlan(output, 'sennagrid', meta.day),
    [output, meta.day],
  );

  const latestPlansRef = useRef({
    reactive: reactiveWavePlan,
    sennagrid: sennagridWavePlan,
  });
  latestPlansRef.current = {
    reactive: reactiveWavePlan,
    sennagrid: sennagridWavePlan,
  };

  // Persistent GPU animation buffers (zero React re-renders per frame; sleeps completely when settled)
  const animStateRef = useRef<{
    reactive: StrategyAnimBuffer;
    sennagrid: StrategyAnimBuffer;
    cascadeStartMs: number;
    cascadeActive: boolean;
  }>({
    reactive: makeEmptyBuffer(output.districts.length),
    sennagrid: makeEmptyBuffer(output.districts.length),
    cascadeStartMs: typeof performance !== 'undefined' ? performance.now() : 0,
    cascadeActive: true,
  });

  const fitBothToDistricts = useCallback(() => {
    const activePreset = latestPresetRef.current;
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

    const initialPreset = latestPresetRef.current;
    const initialBounds = computeFeatureCollectionBounds(initialPreset.featureCollection);
    let disposed = false;
    let fallbackTriggered = false;

    const initMap = (
      container: HTMLDivElement,
      strategy: StrategyName,
      markersRef: { current: MarkerHandle[] },
    ): maplibregl.Map => {
      const map = new maplibregl.Map({
        container,
        style: getBasemapStyleUrl(latestThemeRef.current),
        bounds: initialBounds,
        fitBoundsOptions: { padding: 26 },
        attributionControl: { compact: true },
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      const activateFallback = () => {
        if (disposed || fallbackTriggered) return;
        fallbackTriggered = true;
        setOfflineFallback(true);
        const offline = getOfflineStyle(latestThemeRef.current);
        leftMapRef.current?.setStyle(offline);
        rightMapRef.current?.setStyle(offline);
      };

      const styleTimer = setTimeout(() => {
        if (!disposed && !map.getStyle()?.layers?.length) {
          activateFallback();
        }
      }, BASEMAP_LOAD_TIMEOUT_MS);

      map.on('style.load', () => {
        clearTimeout(styleTimer);
        if (disposed) return;
        const curOut = latestOutputRef.current;
        const curPreset = latestPresetRef.current;
        lastRenderedRegionRef.current = curOut.params.regionId;
        attachDistrictLayers(
          map,
          curPreset.featureCollection,
          latestFlowsGeoJsonRef.current,
          strategy,
          latestShowFlowsRef.current,
          latestThemeRef.current,
        );
        syncMarkersForMap(map, markersRef, curOut, (id) => onSelectDistrictRef.current(id));
        syncMarkerBadges(
          markersRef.current,
          curOut,
          strategy,
          latestDayRef.current,
          latestSelectedRef.current,
          latestShowLabelsRef.current,
          latestShowAllLabelsRef.current,
        );
        const plan =
          strategy === 'reactive'
            ? latestPlansRef.current.reactive
            : latestPlansRef.current.sennagrid;
        const buf =
          strategy === 'reactive'
            ? animStateRef.current.reactive
            : animStateRef.current.sennagrid;
        pushDistrictFeatureStates(
          map,
          plan,
          buf.stress.length === plan.cells.length
            ? buf.stress
            : plan.cells.map((c) => c.targetStress),
          buf.treatedWeight.length === plan.cells.length
            ? buf.treatedWeight
            : plan.cells.map((c) => (c.treated ? 1 : 0)),
          plan.cells.map(() => 0),
          latestSelectedRef.current,
        );
        setStyleEpoch((epoch) => epoch + 1);
      });

      map.on('sourcedata', (ev) => {
        if (disposed || ev.sourceId !== SOURCE_ID || !ev.isSourceLoaded) return;
        const plan =
          strategy === 'reactive'
            ? latestPlansRef.current.reactive
            : latestPlansRef.current.sennagrid;
        const buf =
          strategy === 'reactive'
            ? animStateRef.current.reactive
            : animStateRef.current.sennagrid;
        pushDistrictFeatureStates(
          map,
          plan,
          buf.stress.length === plan.cells.length
            ? buf.stress
            : plan.cells.map((c) => c.targetStress),
          buf.treatedWeight.length === plan.cells.length
            ? buf.treatedWeight
            : plan.cells.map((c) => (c.treated ? 1 : 0)),
          plan.cells.map(() => 0),
          latestSelectedRef.current,
        );
      });

      map.on('error', (ev) => {
        const mapErr = ev as { error?: { name?: string; message?: string }; sourceId?: string };
        const errName = mapErr.error?.name ?? '';
        const errMsg = mapErr.error?.message ?? '';
        if (errName === 'AbortError' || errMsg.toLowerCase().includes('abort')) {
          return;
        }
        if (!map.getStyle()?.layers?.length && !mapErr.sourceId) {
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

  // Sync GeoJSON geometry on region switches & update priority ward labels
  useEffect(() => {
    const activePreset = latestPresetRef.current;
    const regionChanged = lastRenderedRegionRef.current !== output.params.regionId;
    const countMismatch =
      leftMarkersRef.current.length !== output.districts.length ||
      rightMarkersRef.current.length !== output.districts.length;
    const needsRegionSync = regionChanged || countMismatch;

    const syncMapGeometryAndBadges = (
      map: maplibregl.Map | null,
      handlesRef: { current: MarkerHandle[] },
      strategy: StrategyName,
    ) => {
      if (!map || !map.getStyle()?.layers?.length) return;
      if (needsRegionSync) {
        const distSrc = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (distSrc) {
          distSrc.setData(activePreset.featureCollection as unknown as GeoJSON.FeatureCollection);
        } else {
          attachDistrictLayers(
            map,
            activePreset.featureCollection,
            flowsGeoJson,
            strategy,
            latestShowFlowsRef.current,
            latestThemeRef.current,
          );
        }
        const flowSrc = map.getSource(FLOWS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        flowSrc?.setData(flowsGeoJson);
        syncMarkersForMap(map, handlesRef, output, (id) => onSelectDistrictRef.current(id));
      }
      syncMarkerBadges(
        handlesRef.current,
        output,
        strategy,
        currentDay,
        selectedDistrictId,
        showDistrictLabels,
        showAllLabels,
      );
    };

    syncMapGeometryAndBadges(leftMapRef.current, leftMarkersRef, 'reactive');
    syncMapGeometryAndBadges(rightMapRef.current, rightMarkersRef, 'sennagrid');

    if (needsRegionSync) {
      lastRenderedRegionRef.current = output.params.regionId;
      fitBothToDistricts();
      setHoverInfo(null);
    }
  }, [
    output,
    currentDay,
    selectedDistrictId,
    showDistrictLabels,
    showAllLabels,
    flowsGeoJson,
    styleEpoch,
    fitBothToDistricts,
  ]);

  // Swap Carto Dark Matter / Carto Positron basemaps cleanly on theme toggle
  useEffect(() => {
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    const nextStyle = offlineFallback ? getOfflineStyle(theme) : getBasemapStyleUrl(theme);
    leftMapRef.current?.setStyle(nextStyle);
    rightMapRef.current?.setStyle(nextStyle);
  }, [theme, offlineFallback]);

  // Toggle optional commuter corridor lines cleanly
  useEffect(() => {
    for (const map of [leftMapRef.current, rightMapRef.current]) {
      if (!map) continue;
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
  }, [flowsGeoJson, showCommuterFlows, styleEpoch]);

  // Detect spread cascades and upward severity tier crossings
  useEffect(() => {
    const prev = prevCascadeContextRef.current;
    const regionSwitched = prev.regionId !== output.params.regionId;
    const runChanged = prev.outputRef !== output;
    const jumpedFar = Math.abs(meta.day - prev.day) >= 5;

    prevCascadeContextRef.current = {
      regionId: output.params.regionId,
      day: meta.day,
      outputRef: output,
    };

    const nowMs = performance.now();
    const anim = animStateRef.current;
    const n = output.districts.length;

    if (regionSwitched || anim.reactive.stress.length !== n) {
      anim.reactive = makeEmptyBuffer(n);
      anim.sennagrid = makeEmptyBuffer(n);
      anim.reactive.prevTargetStress = reactiveWavePlan.cells.map((c) => c.targetStress);
      anim.sennagrid.prevTargetStress = sennagridWavePlan.cells.map((c) => c.targetStress);
      anim.cascadeStartMs = nowMs;
      anim.cascadeActive = true;
      return;
    }

    if (runChanged || jumpedFar) {
      anim.cascadeStartMs = nowMs;
      anim.cascadeActive = true;
      for (let i = 0; i < n; i++) {
        const rCell = reactiveWavePlan.cells[i];
        const sCell = sennagridWavePlan.cells[i];
        if (rCell && rCell.targetStress >= 0.42) {
          anim.reactive.flashUntilMs[i] = nowMs + rCell.hop * 64 + FLASH_DURATION_MS;
        }
        if (sCell && sCell.targetStress >= 0.42) {
          anim.sennagrid.flashUntilMs[i] = nowMs + sCell.hop * 64 + FLASH_DURATION_MS;
        }
        if (rCell) anim.reactive.prevTargetStress[i] = rCell.targetStress;
        if (sCell) anim.sennagrid.prevTargetStress[i] = sCell.targetStress;
      }
      return;
    }

    // Smooth day-by-day playback / scrubbing: trigger subtle one-shot spread border highlight on upward tier crossing
    const markCrossings = (plan: DistrictSpreadWavePlan, buf: StrategyAnimBuffer) => {
      for (let i = 0; i < plan.cells.length; i++) {
        const cell = plan.cells[i]!;
        const prevStress = buf.prevTargetStress[i] ?? 0;
        if (stressTierRank(cell.targetStress) > stressTierRank(prevStress)) {
          buf.flashUntilMs[i] = nowMs + FLASH_DURATION_MS;
        }
        buf.prevTargetStress[i] = cell.targetStress;
      }
    };

    markCrossings(reactiveWavePlan, anim.reactive);
    markCrossings(sennagridWavePlan, anim.sennagrid);
  }, [output, meta.day, reactiveWavePlan, sennagridWavePlan]);

  // 60 FPS transition-only engine: smooth color glide + smooth fade-in/fade-out on red/teal marker boxes; sleeps when settled
  useEffect(() => {
    if (viewMode !== 'map') return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const plans = latestPlansRef.current;
      const anim = animStateRef.current;
      anim.cascadeActive = false;
      anim.reactive.stress = plans.reactive.cells.map((c) => c.targetStress);
      anim.sennagrid.stress = plans.sennagrid.cells.map((c) => c.targetStress);
      anim.reactive.treatedWeight = plans.reactive.cells.map((c) => (c.treated ? 1 : 0));
      anim.sennagrid.treatedWeight = plans.sennagrid.cells.map((c) => (c.treated ? 1 : 0));
      const zeros = plans.reactive.cells.map(() => 0);

      pushDistrictFeatureStates(
        leftMapRef.current,
        plans.reactive,
        anim.reactive.stress,
        anim.reactive.treatedWeight,
        zeros,
        latestSelectedRef.current,
      );
      pushDistrictFeatureStates(
        rightMapRef.current,
        plans.sennagrid,
        anim.sennagrid.stress,
        anim.sennagrid.treatedWeight,
        zeros,
        latestSelectedRef.current,
      );
      return;
    }

    let rafId = 0;
    let lastFrameMs = performance.now();

    const stepStrategy = (
      plan: DistrictSpreadWavePlan,
      buf: StrategyAnimBuffer,
      dtMs: number,
      nowMs: number,
      cascadeActive: boolean,
      cascadeElapsed: number,
    ): { flashes: number[]; settled: boolean } => {
      const n = plan.cells.length;
      if (buf.stress.length !== n) {
        buf.stress = new Array(n).fill(0);
        buf.treatedWeight = new Array(n).fill(0);
        buf.prevTargetStress = new Array(n).fill(0);
        buf.flashUntilMs = new Array(n).fill(0);
      }

      const flashes: number[] = new Array(n);
      const stressAlpha = 1 - Math.exp(-Math.min(dtMs, 80) / 185);
      // Gentle ~250ms exponential fade-in and fade-out for active dispatch marker boxes
      const treatedFadeAlpha = 1 - Math.exp(-Math.min(dtMs, 80) / 250);
      let settled = true;

      for (let i = 0; i < n; i++) {
        const cell = plan.cells[i]!;
        let targetStress = cell.targetStress;

        if (cascadeActive) {
          const hopDelayMs = cell.hop * 64;
          const gate = easeOutQuad((cascadeElapsed - hopDelayMs) / 280);
          targetStress = cell.targetStress * gate;
          if (gate < 1) {
            settled = false;
          }
        }

        const curStress = buf.stress[i] ?? 0;
        const nextStress = curStress + (targetStress - curStress) * stressAlpha;
        if (Math.abs(targetStress - nextStress) < 0.0015) {
          buf.stress[i] = targetStress;
        } else {
          buf.stress[i] = nextStress;
          settled = false;
        }

        const targetTreated = cell.treated ? 1 : 0;
        const curTreated = buf.treatedWeight[i] ?? 0;
        const nextTreated = curTreated + (targetTreated - curTreated) * treatedFadeAlpha;
        if (Math.abs(targetTreated - nextTreated) < 0.004) {
          buf.treatedWeight[i] = targetTreated;
        } else {
          buf.treatedWeight[i] = nextTreated;
          settled = false;
        }

        const remainingFlashMs = (buf.flashUntilMs[i] ?? 0) - nowMs;
        if (remainingFlashMs > 0 && remainingFlashMs <= FLASH_DURATION_MS) {
          const progress = 1 - remainingFlashMs / FLASH_DURATION_MS;
          flashes[i] = Math.sin(progress * Math.PI) * (1 - progress * 0.35);
          settled = false;
        } else if (remainingFlashMs > FLASH_DURATION_MS) {
          flashes[i] = 0;
          settled = false;
        } else {
          flashes[i] = 0;
        }
      }

      return { flashes, settled };
    };

    const tick = (nowMs: number) => {
      const dtMs = Math.max(8, nowMs - lastFrameMs);
      lastFrameMs = nowMs;

      if (!document.hidden) {
        const plans = latestPlansRef.current;
        const anim = animStateRef.current;
        const cascadeElapsed = nowMs - anim.cascadeStartMs;

        const leftStep = stepStrategy(
          plans.reactive,
          anim.reactive,
          dtMs,
          nowMs,
          anim.cascadeActive,
          cascadeElapsed,
        );
        const rightStep = stepStrategy(
          plans.sennagrid,
          anim.sennagrid,
          dtMs,
          nowMs,
          anim.cascadeActive,
          cascadeElapsed,
        );

        pushDistrictFeatureStates(
          leftMapRef.current,
          plans.reactive,
          anim.reactive.stress,
          anim.reactive.treatedWeight,
          leftStep.flashes,
          latestSelectedRef.current,
        );
        pushDistrictFeatureStates(
          rightMapRef.current,
          plans.sennagrid,
          anim.sennagrid.stress,
          anim.sennagrid.treatedWeight,
          rightStep.flashes,
          latestSelectedRef.current,
        );

        if (leftStep.settled && rightStep.settled) {
          anim.cascadeActive = false;
          return;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    viewMode,
    styleEpoch,
    selectedDistrictId,
    reactiveWavePlan,
    sennagridWavePlan,
  ]);

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
        className="pointer-events-none absolute z-30 w-56 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)]/95 p-3 text-[13px] shadow-lg backdrop-blur-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[var(--sg-text-primary)]">{district.name}</span>
          <span className="text-xs font-medium text-[var(--sg-text-muted)]">
            {formatZoneLabel(district.zoneType)}
          </span>
        </div>
        <div className="mt-2 space-y-1 font-mono text-xs tabular-nums text-[var(--sg-text-muted)]">
          <div className="flex justify-between">
            <span>Active cases</span>
            <span className="font-semibold text-[var(--sg-text-primary)]">{formatInt(activeInf)}</span>
          </div>
          <div className="flex justify-between">
            <span>ICU load</span>
            <span
              className={
                stressPct >= 100
                  ? 'font-bold text-[var(--sg-rose)]'
                  : 'font-semibold text-[var(--sg-text-primary)]'
              }
            >
              {formatFixed(icuDemand, 1)} / {district.icuBeds} ({stressPct}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Week {meta.weekNumber}</span>
            <span className={treated ? 'font-semibold text-[var(--sg-teal)]' : 'text-[var(--sg-text-muted)]'}>
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
      className="scroll-mt-20 overflow-hidden rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] transition-colors"
    >
      {/* Header: Title + 3-Dot Legend + Map / Watchlist Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-border-subtle)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-semibold text-[var(--sg-text-primary)]">
            District ICU Load · Day {meta.day}
          </h2>
          <span className="text-xs font-medium text-[var(--sg-text-muted)]">· {preset.name}</span>
          {output.params.regionId.startsWith('custom_') && (
            <span className="rounded border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-2 py-0.5 text-[11px] font-medium text-[var(--sg-text-secondary)]">
              {output.climate.source === 'open_meteo'
                ? 'Normalized grid + live weather'
                : 'Normalized grid + seasonal weather'}
            </span>
          )}
          {offlineFallback && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sg-amber)]">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Offline Basemap</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[var(--sg-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sg-safe-dot)]" aria-hidden="true" />
              <span>&lt;60% Safe</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sg-amber-dot)]" aria-hidden="true" />
              <span>60–99% Strained</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--sg-rose-dot)]" aria-hidden="true" />
              <span>≥100% Overflow</span>
            </span>
          </div>

          <div
            role="group"
            aria-label="Spatial view mode"
            className="inline-flex rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-0.5 text-[13px] font-medium"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              className={`min-h-[44px] rounded-md px-3 py-1 transition-all min-[720px]:min-h-[30px] ${
                viewMode === 'map'
                  ? 'bg-[var(--sg-surface)] font-semibold text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/40'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'watchlist'}
              onClick={() => setViewMode('watchlist')}
              className={`min-h-[44px] rounded-md px-3 py-1 transition-all min-[720px]:min-h-[30px] ${
                viewMode === 'watchlist'
                  ? 'bg-[var(--sg-surface)] font-semibold text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/40'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
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
            className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-1"
          >
            <button
              type="button"
              aria-pressed={mobileMapStrategy === 'reactive'}
              onClick={() => onSetMobileMapStrategy('reactive')}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-[13px] font-semibold ${
                mobileMapStrategy === 'reactive'
                  ? 'bg-[var(--sg-surface)] text-[var(--sg-rose)] shadow-2xs'
                  : 'text-[var(--sg-text-muted)]'
              }`}
            >
              Without SennaGrid
            </button>
            <button
              type="button"
              aria-pressed={mobileMapStrategy === 'sennagrid'}
              onClick={() => onSetMobileMapStrategy('sennagrid')}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-[13px] font-semibold ${
                mobileMapStrategy === 'sennagrid'
                  ? 'bg-[var(--sg-surface)] text-[var(--sg-teal)] shadow-2xs'
                  : 'text-[var(--sg-text-muted)]'
              }`}
            >
              With SennaGrid
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 min-[720px]:grid-cols-2">
          {/* LEFT: Without SennaGrid */}
          <div className={mobileMapStrategy === 'reactive' ? 'block' : 'hidden min-[720px]:block'}>
            <div className="mb-2 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="shrink-0 font-semibold text-[var(--sg-text-primary)]">
                Without SennaGrid
              </span>
              <span className="truncate font-mono font-medium tabular-nums text-[var(--sg-rose)]">
                +{formatFixed(reactiveDayOverflow, 1)} overflow · {reactiveBreaches} breached
              </span>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-map-well)] min-[720px]:h-[345px] min-[1180px]:h-[375px]">
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
            <div className="mb-2 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="shrink-0 font-semibold text-[var(--sg-teal)]">With SennaGrid</span>
              <span className="truncate font-mono font-medium tabular-nums text-[var(--sg-teal)]">
                {formatFixed(sennagridDayOverflow, 1)} overflow · {sennagridBreaches} breached ·{' '}
                {sennagridDispatched.length}{' '}
                {sennagridDispatched.length === 1 ? 'hub' : 'hubs'}
              </span>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-map-well)] min-[720px]:h-[345px] min-[1180px]:h-[375px]">
              <div
                ref={rightContainerRef}
                className="h-full w-full"
                aria-label={`With SennaGrid optimized map for ${preset.name}`}
              />
              {renderHoverTooltip('sennagrid')}
            </div>
          </div>
        </div>

        {/* Tactile Map Toolbar Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
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
              aria-pressed={showDistrictLabels}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium shadow-2xs transition-colors active:scale-[0.99] min-[720px]:min-h-[34px] ${
                showDistrictLabels
                  ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)] hover:bg-[var(--sg-teal-tint-hover)]'
                  : 'border-[var(--sg-border-control)] bg-[var(--sg-surface)] text-[var(--sg-text-secondary)] hover:bg-[var(--sg-hover)]'
              }`}
            >
              {showDistrictLabels ? (
                <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>
                Labels: {!showDistrictLabels ? 'Off' : showAllLabels ? 'All Wards' : 'Key Wards'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleCommuterFlows}
              aria-pressed={showCommuterFlows}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium shadow-2xs transition-colors active:scale-[0.99] min-[720px]:min-h-[34px] ${
                showCommuterFlows
                  ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)] hover:bg-[var(--sg-teal-tint-hover)]'
                  : 'border-[var(--sg-border-control)] bg-[var(--sg-surface)] text-[var(--sg-text-secondary)] hover:bg-[var(--sg-hover)]'
              }`}
            >
              <Network className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Commuter Flows: {showCommuterFlows ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSyncMaps}
              aria-pressed={syncMapsLocked}
              className={`hidden min-h-[34px] items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium shadow-2xs transition-colors active:scale-[0.99] min-[720px]:inline-flex ${
                syncMapsLocked
                  ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)] hover:bg-[var(--sg-teal-tint-hover)]'
                  : 'border-[var(--sg-border-control)] bg-[var(--sg-surface)] text-[var(--sg-text-secondary)] hover:bg-[var(--sg-hover)]'
              }`}
            >
              {syncMapsLocked ? (
                <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Link2Off className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>Sync Pan: {syncMapsLocked ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={fitBothToDistricts}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-3 py-1.5 font-medium text-[var(--sg-text-primary)] shadow-2xs transition-colors hover:bg-[var(--sg-hover)] active:scale-[0.99] min-[720px]:min-h-[34px]"
            >
              <RotateCcw className="h-4 w-4 shrink-0 text-[var(--sg-text-muted)]" aria-hidden="true" />
              <span>Reset Framing</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sg-district-select" className="font-medium text-[var(--sg-text-muted)]">
              Inspect Ward:
            </label>
            <select
              id="sg-district-select"
              value={selectedDistrictId ?? ''}
              onChange={(e) => onSelectDistrict(e.target.value || null)}
              className="min-h-[44px] rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-3 py-1.5 text-[13px] font-medium text-[var(--sg-text-primary)] shadow-2xs transition-colors hover:bg-[var(--sg-hover)] min-[720px]:min-h-[34px]"
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

      {/* Contextual Ward Comparison Strip (appears only when a ward is clicked/selected) */}
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
