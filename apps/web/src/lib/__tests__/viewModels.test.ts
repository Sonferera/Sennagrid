import {
  DEFAULT_SIMULATION_PARAMS,
  getFallbackClimateSeries,
  optimizeResourceAllocation,
  type OptimizationOutput,
} from '@sennagrid/engine';
import { describe, expect, it } from 'vitest';
import { HARBOR_CORRIDOR_PRESET, METRO_TROPICA_PRESET } from '../../data/regions';
import {
  buildDailyChartSeries,
  buildDistrictSpreadWavePlan,
  buildDistrictWatchlist,
  buildExecutiveNarrative,
  buildKpiViewModel,
  buildRadarSeries,
  buildTopCommuterCorridors,
  computeDistrictStress,
  filterDispatchAssignments,
  findCrisisFocusDay,
  findReactivePeakIcuDay,
  formatPopulationCompact,
  getDistrictSnapshotAtDay,
  getTimelineMeta,
  selectPriorityBadgeDistrictIds,
  summarizeSwapTrace,
} from '../viewModels';

function runMetroDefault(): OptimizationOutput {
  const climate = getFallbackClimateSeries(
    'metro_tropica',
    METRO_TROPICA_PRESET.anchorLat,
    METRO_TROPICA_PRESET.anchorLng,
  );
  return optimizeResourceAllocation(
    METRO_TROPICA_PRESET.districts,
    { ...DEFAULT_SIMULATION_PARAMS, regionId: 'metro_tropica', diseaseMode: 'vector_seir_sei', budgetRatio: 0.2 },
    climate,
  );
}

function runHarborDefault(): OptimizationOutput {
  const climate = getFallbackClimateSeries(
    'harbor_corridor',
    HARBOR_CORRIDOR_PRESET.anchorLat,
    HARBOR_CORRIDOR_PRESET.anchorLng,
  );
  return optimizeResourceAllocation(
    HARBOR_CORRIDOR_PRESET.districts,
    { ...DEFAULT_SIMULATION_PARAMS, regionId: 'harbor_corridor', diseaseMode: 'direct_seir', budgetRatio: 0.2 },
    climate,
  );
}

describe('viewModels deterministic transformations', () => {
  const metroOut = runMetroDefault();
  const harborOut = runHarborDefault();

  it('frames Metro Tropica 20% with executive narrative, separated ICU units, and Mild-Case Trade-off', () => {
    const vm = buildKpiViewModel(metroOut);
    const narrative = buildExecutiveNarrative(metroOut);

    expect(narrative.headline).toContain('Eliminated all 5 hospital collapse days');
    expect(narrative.tone).toBe('positive');

    expect(vm.collapse.reactiveDays).toBe(5);
    expect(vm.collapse.optimizedDays).toBe(0);
    expect(vm.collapse.savedDays).toBe(5);
    expect(vm.collapse.tone).toBe('positive');

    expect(vm.icuOverflow.peakBedsPrevented).toBeCloseTo(
      metroOut.impactSummary.peakIcuOverflowPrevented,
      4,
    );
    expect(vm.icuOverflow.reactiveTotalBedDays).toBeCloseTo(
      metroOut.reactive.totalIcuOverflowCost,
      4,
    );
    expect(vm.icuOverflow.optimizedTotalBedDays).toBeCloseTo(
      metroOut.sennagrid.totalIcuOverflowCost,
      4,
    );

    expect(vm.casesImpact.isTradeoff).toBe(true);
    expect(vm.casesImpact.label).toBe('Mild-Case Trade-off');
    expect(vm.casesImpact.tone).toBe('tradeoff');
    expect(vm.readiness.gateStatus).toBe('PASS');
    expect(vm.readiness.passedCount).toBe(5);
  });

  it('frames Harbor Corridor 20% with positive Cases Averted', () => {
    const vm = buildKpiViewModel(harborOut);
    expect(vm.casesImpact.isTradeoff).toBe(false);
    expect(vm.casesImpact.label).toBe('Cases Averted');
    expect(vm.casesImpact.casesAverted).toBeGreaterThan(0);
    expect(vm.casesImpact.tone).toBe('positive');
    expect(vm.icuOverflow.optimizedTotalBedDays).toBeLessThan(vm.icuOverflow.reactiveTotalBedDays);
  });

  it('reconciles Day 0..91 and 13-week mapping cleanly without hardcoding bounds', () => {
    const day0 = getTimelineMeta(metroOut, 0);
    expect(day0.day).toBe(0);
    expect(day0.maxDay).toBe(91);
    expect(day0.weekNumber).toBe(1);
    expect(day0.totalWeeks).toBe(13);
    expect(day0.isTerminalDay).toBe(false);

    const day90 = getTimelineMeta(metroOut, 90);
    expect(day90.weekNumber).toBe(13);
    expect(day90.isTerminalDay).toBe(false);

    const day91 = getTimelineMeta(metroOut, 91);
    expect(day91.weekNumber).toBe(13);
    expect(day91.isTerminalDay).toBe(true);
    expect(day91.weekLabel).toBe('End of Week 13');

    expect(getTimelineMeta(metroOut, -5).day).toBe(0);
    expect(getTimelineMeta(metroOut, 999).day).toBe(91);
  });

  it('computes district stress, ranked watchlist, and commuter corridors deterministically', () => {
    expect(computeDistrictStress(15, 10)).toBe(1.5);
    expect(computeDistrictStress(5, 0)).toBe(0);
    expect(computeDistrictStress(Number.NaN, 10)).toBe(0);

    const peakDay = findReactivePeakIcuDay(metroOut);
    const crisisDay = findCrisisFocusDay(metroOut);
    expect(peakDay).toBeGreaterThan(0);
    expect(crisisDay).toBeGreaterThan(0);
    expect(metroOut.reactive.dailyCityOverflow[crisisDay]!).toBeGreaterThan(0);

    const watchlist = buildDistrictWatchlist(metroOut, crisisDay);
    expect(watchlist).toHaveLength(metroOut.districts.length);
    expect(watchlist[0]!.reactivePeakStress).toBeGreaterThanOrEqual(
      watchlist[watchlist.length - 1]!.reactivePeakStress,
    );

    const corridors = buildTopCommuterCorridors(metroOut, 12);
    expect(corridors).toHaveLength(12);
    expect(corridors[0]!.strength).toBeCloseTo(1, 5);

    const firstDistrict = metroOut.districts[0]!;
    const snap = getDistrictSnapshotAtDay(metroOut, firstDistrict.id, crisisDay);
    expect(snap).not.toBeNull();
    expect(snap!.district.id).toBe(firstDistrict.id);
    expect(snap!.shortCode.length).toBeGreaterThanOrEqual(3);
  });

  it('builds 92 daily chart points and 5 verbatim engine radar axes', () => {
    const daily = buildDailyChartSeries(metroOut);
    expect(daily).toHaveLength(92);
    expect(daily[0]?.day).toBe(0);
    expect(daily[91]?.day).toBe(91);

    const radar = buildRadarSeries(metroOut);
    expect(radar).toHaveLength(5);
    for (const item of radar) {
      expect(item.score).toBe(metroOut.impactRadar[item.key]);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });

  it('filters dispatch assignments and summarizes swap trace without mutating inputs', () => {
    const week1 = filterDispatchAssignments(metroOut.assignments, {
      week: 1,
      zoneType: 'all',
      rationale: 'all',
      search: '',
    });
    expect(week1).toHaveLength(metroOut.weeklyQuotaK);
    expect(week1.every((r) => r.week === 1)).toBe(true);

    const summary = summarizeSwapTrace(harborOut.swapTrace);
    expect(summary.totalSwaps).toBe(harborOut.swapTrace.length);
    if (harborOut.swapTrace.length > 0) {
      expect(summary.passesCompleted).toBeGreaterThanOrEqual(1);
    }
  });

  it('selects non-overlapping priority map badges and formats compact city population', () => {
    const crisisDay = findCrisisFocusDay(metroOut);
    const chosenId = metroOut.districts[0]!.id;
    const reactiveBadges = selectPriorityBadgeDistrictIds(metroOut, 'reactive', crisisDay, chosenId, 4);
    const optBadges = selectPriorityBadgeDistrictIds(metroOut, 'sennagrid', crisisDay, chosenId, 4);

    expect(reactiveBadges.has(chosenId)).toBe(true);
    expect(optBadges.has(chosenId)).toBe(true);
    expect(reactiveBadges.size).toBeLessThanOrEqual(4);
    expect(optBadges.size).toBeLessThanOrEqual(4);
    expect(optBadges.size).toBeGreaterThanOrEqual(2);

    // Harbor Corridor severe scenario & Metro Tropica Day 0 must not cluster colliding priority pills
    const harborBadges = selectPriorityBadgeDistrictIds(harborOut, 'reactive', findCrisisFocusDay(harborOut), null, 3);
    const day0Badges = selectPriorityBadgeDistrictIds(metroOut, 'reactive', 0, null, 3);
    expect(harborBadges.size).toBeGreaterThanOrEqual(2);
    expect(day0Badges.size).toBeGreaterThanOrEqual(2);

    const checkSeparated = (ids: Set<string>, districts: typeof harborOut.districts) => {
      const picked = districts.filter((d) => ids.has(d.id));
      let minLng = Number.POSITIVE_INFINITY;
      let maxLng = Number.NEGATIVE_INFINITY;
      let minLat = Number.POSITIVE_INFINITY;
      let maxLat = Number.NEGATIVE_INFINITY;
      for (const d of districts) {
        minLng = Math.min(minLng, d.centroid[0]);
        maxLng = Math.max(maxLng, d.centroid[0]);
        minLat = Math.min(minLat, d.centroid[1]);
        maxLat = Math.max(maxLat, d.centroid[1]);
      }
      const lngSpan = Math.max(0.01, maxLng - minLng);
      const latSpan = Math.max(0.01, maxLat - minLat);
      for (let i = 0; i < picked.length; i++) {
        for (let j = i + 1; j < picked.length; j++) {
          const dx = Math.abs(picked[i]!.centroid[0] - picked[j]!.centroid[0]) / lngSpan;
          const dy = Math.abs(picked[i]!.centroid[1] - picked[j]!.centroid[1]) / latSpan;
          expect(dx >= 0.25 || dy >= 0.14).toBe(true);
        }
      }
    };
    checkSeparated(harborBadges, harborOut.districts);
    checkSeparated(day0Badges, metroOut.districts);

    expect(formatPopulationCompact(METRO_TROPICA_PRESET.districts)).toMatch(/M pop$/);
    expect(formatPopulationCompact(HARBOR_CORRIDOR_PRESET.districts)).toMatch(/K pop$/);
  });

  it('builds deterministic ring-by-ring spread order from epicenter outward', () => {
    const crisisDay = findCrisisFocusDay(harborOut);
    const reactiveWave = buildDistrictSpreadWavePlan(harborOut, 'reactive', crisisDay);
    const optWave = buildDistrictSpreadWavePlan(harborOut, 'sennagrid', crisisDay);

    expect(reactiveWave.cells).toHaveLength(harborOut.districts.length);
    expect(optWave.cells).toHaveLength(harborOut.districts.length);
    expect(reactiveWave.epicenterId).toBe(optWave.epicenterId);
    expect(reactiveWave.maxHop).toBeGreaterThanOrEqual(2);
    expect(reactiveWave.cells.some((c) => c.hop === 0)).toBe(true);
    expect(reactiveWave.cells.some((c) => c.breached && c.targetStress >= 1.0)).toBe(true);
    expect(optWave.cells.some((c) => c.treated)).toBe(true);
  });
});
