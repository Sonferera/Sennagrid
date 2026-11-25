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
  buildKpiViewModel,
  buildRadarSeries,
  computeDistrictStress,
  filterDispatchAssignments,
  findReactivePeakIcuDay,
  getDistrictSnapshotAtDay,
  getTimelineMeta,
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

  it('frames Metro Tropica 20% with separated ICU beds/bed-days and honest Mild-Case Trade-off', () => {
    const vm = buildKpiViewModel(metroOut);
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

  it('computes district stress strictly from icuDemand / icuBeds with zero-bed guard', () => {
    expect(computeDistrictStress(15, 10)).toBe(1.5);
    expect(computeDistrictStress(5, 0)).toBe(0);
    expect(computeDistrictStress(Number.NaN, 10)).toBe(0);

    const peakDay = findReactivePeakIcuDay(metroOut);
    expect(peakDay).toBeGreaterThan(0);
    expect(peakDay).toBeLessThanOrEqual(91);

    const firstDistrict = metroOut.districts[0]!;
    const snap = getDistrictSnapshotAtDay(metroOut, firstDistrict.id, peakDay);
    expect(snap).not.toBeNull();
    expect(snap!.district.id).toBe(firstDistrict.id);
    expect(snap!.impact?.districtId).toBe(firstDistrict.id);
    expect(snap!.reactive.stress).toBeCloseTo(
      snap!.reactive.icuDemand / firstDistrict.icuBeds,
      6,
    );
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

    const firstName = week1[0]!.districtName;
    const searched = filterDispatchAssignments(metroOut.assignments, {
      week: 'all',
      zoneType: 'all',
      rationale: 'all',
      search: firstName.slice(0, 5).toLowerCase(),
    });
    expect(searched.length).toBeGreaterThan(0);
    expect(searched.some((r) => r.districtName === firstName)).toBe(true);

    const summary = summarizeSwapTrace(harborOut.swapTrace);
    expect(summary.totalSwaps).toBe(harborOut.swapTrace.length);
    if (harborOut.swapTrace.length > 0) {
      expect(summary.passesCompleted).toBeGreaterThanOrEqual(1);
    }
  });
});
