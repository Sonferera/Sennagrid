import { describe, expect, it } from 'vitest';
import { buildClimateSeriesFromSamples, getFallbackClimateSeries } from '../climate';
import { computeWeeklyQuota, optimizeResourceAllocation } from '../optimizer';
import {
  DEFAULT_SIMULATION_PARAMS,
  type DistrictProperties,
  type SimulationParams,
} from '../types';

const BENCHMARK_CITY: DistrictProperties[] = [
  { id: 'c1', name: 'Old Quarter Core', population: 240_000, icuBeds: 65, centroid: [106.845, -6.208], initialCases: 140, zoneType: 'core' },
  { id: 'c2', name: 'Central Junction', population: 215_000, icuBeds: 22, centroid: [106.868, -6.188], initialCases: 95, zoneType: 'transit_hub' },
  { id: 'c3', name: 'West Rail Hub', population: 195_000, icuBeds: 18, centroid: [106.815, -6.215], initialCases: 70, zoneType: 'transit_hub' },
  { id: 'c4', name: 'East Canal Flats', population: 210_000, icuBeds: 12, centroid: [106.895, -6.212], initialCases: 55, zoneType: 'residential' },
  { id: 'c5', name: 'North Port Market', population: 180_000, icuBeds: 14, centroid: [106.855, -6.155], initialCases: 40, zoneType: 'transit_hub' },
  { id: 'c6', name: 'South Basin Ward', population: 175_000, icuBeds: 11, centroid: [106.845, -6.255], initialCases: 35, zoneType: 'residential' },
  { id: 'c7', name: 'Riverside North', population: 150_000, icuBeds: 10, centroid: [106.885, -6.165], initialCases: 20, zoneType: 'residential' },
  { id: 'c8', name: 'Kebayoran Ridge', population: 145_000, icuBeds: 12, centroid: [106.795, -6.248], initialCases: 18, zoneType: 'residential' },
  { id: 'c9', name: 'Outer East Fringe', population: 115_000, icuBeds: 8, centroid: [106.935, -6.245], initialCases: 8, zoneType: 'peri_urban' },
  { id: 'c10', name: 'Outer West Fringe', population: 105_000, icuBeds: 8, centroid: [106.765, -6.195], initialCases: 6, zoneType: 'peri_urban' },
];

describe('resource allocation optimizer', () => {
  it('enforces weekly quota and strictly beats reactive baseline across 15%, 20%, and 30% budgets', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);

    for (const budgetRatio of [0.15, 0.2, 0.3]) {
      const params: SimulationParams = {
        ...DEFAULT_SIMULATION_PARAMS,
        diseaseMode: 'vector_seir_sei',
        budgetRatio,
      };
      const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);
      const expectedK = computeWeeklyQuota(BENCHMARK_CITY.length, budgetRatio);

      expect(output.weeklyQuotaK).toBe(expectedK);
      expect(output.solveTimeMs).toBeLessThan(1500);
      expect(output.sennagrid.hasNaN).toBe(false);
      expect(output.sennagrid.maxMassConservationError).toBeLessThan(1e-9);
      expect(output.sennagrid.totalCostJ).toBeLessThan(output.reactive.totalCostJ);

      for (const weekRow of output.sennagrid.schedule) {
        const count = weekRow.reduce((acc, v) => acc + v, 0);
        expect(count).toBeLessThanOrEqual(expectedK);
      }

      expect(output.assignments.length).toBe(13 * expectedK);
      for (const item of output.assignments) {
        expect([
          'Mobility Hub Containment',
          'Pre-emptive Surge Intercept',
          'ICU Capacity Shield',
        ]).toContain(item.rationale);
      }
    }
  });

  it('beats reactive baseline in direct-contact SEIR mode within 1.5s', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };

    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    expect(output.solveTimeMs).toBeLessThan(1500);
    expect(output.sennagrid.totalCostJ).toBeLessThan(output.reactive.totalCostJ);
    expect(output.gates.gates.find((g) => g.id === 'MASS_CONSERVATION')?.passed).toBe(true);
    expect(output.gates.gates.find((g) => g.id === 'BUDGET_COMPLIANCE')?.passed).toBe(true);
    expect(output.gates.gates.find((g) => g.id === 'COST_DOMINANCE')?.passed).toBe(true);
  });

  it('includes impactSummary with correct structure and one entry per district', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    expect(output.impactSummary).toBeDefined();
    expect(output.impactSummary.casesAverted).toBeTypeOf('number');
    expect(output.impactSummary.casesAvertedPct).toBeTypeOf('number');
    expect(output.impactSummary.peakIcuOverflowPrevented).toBeTypeOf('number');
    expect(output.impactSummary.collapseDaysSaved).toBeTypeOf('number');
    expect(output.impactSummary.costReductionPct).toBeTypeOf('number');
    expect(output.impactSummary.districtImpacts).toHaveLength(BENCHMARK_CITY.length);
    for (const d of output.impactSummary.districtImpacts) {
      expect(d.districtId).toBeTypeOf('string');
      expect(d.districtName).toBeTypeOf('string');
      expect(d.reactivePeakActiveInfections).toBeTypeOf('number');
      expect(d.optimizedPeakActiveInfections).toBeTypeOf('number');
      expect(d.reactivePeakIcuDemand).toBeTypeOf('number');
      expect(d.optimizedPeakIcuDemand).toBeTypeOf('number');
      expect(d.reactivePeakIcuOverflow).toBeTypeOf('number');
      expect(d.optimizedPeakIcuOverflow).toBeTypeOf('number');
      expect(d.interventionWeeks).toBeTypeOf('number');
    }
  });

  it('includes impactRadar with five finite fields clamped to [0,100]', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    expect(output.impactRadar).toBeDefined();
    for (const key of ['casesControl', 'peakIcuSafety', 'collapsePrevention', 'hubContainment', 'budgetEfficiency'] as const) {
      const val = output.impactRadar[key];
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it('shared hub coverage helper matches HUB_COVERAGE gate', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    const hubGate = output.gates.gates.find((g) => g.id === 'HUB_COVERAGE');
    expect(hubGate).toBeDefined();

    const match = hubGate!.observed.match(/\((\d+)%\)/);
    expect(match).not.toBeNull();
    const gatePct = parseInt(match![1]!, 10);

    expect(Math.abs(output.impactRadar.hubContainment - gatePct)).toBeLessThanOrEqual(1);
  });

  it('impactSummary formulas match reactive vs optimized outputs with documented rounding', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    const { reactive, sennagrid } = output;
    const expectedCasesAverted = Number((reactive.cumulativeCases - sennagrid.cumulativeCases).toFixed(1));
    const expectedCasesAvertedPct = reactive.cumulativeCases > 0
      ? Number(((reactive.cumulativeCases - sennagrid.cumulativeCases) / reactive.cumulativeCases * 100).toFixed(2))
      : 0;
    const expectedPeakIcuOverflowPrevented = Number((reactive.peakIcuOverflow - sennagrid.peakIcuOverflow).toFixed(1));
    const expectedCollapseDaysSaved = reactive.icuCollapseDays - sennagrid.icuCollapseDays;
    const expectedCostReductionPct = reactive.totalCostJ > 0
      ? Number(((reactive.totalCostJ - sennagrid.totalCostJ) / reactive.totalCostJ * 100).toFixed(2))
      : 0;

    expect(output.impactSummary.casesAverted).toBe(expectedCasesAverted);
    expect(output.impactSummary.casesAvertedPct).toBe(expectedCasesAvertedPct);
    expect(output.impactSummary.peakIcuOverflowPrevented).toBe(expectedPeakIcuOverflowPrevented);
    expect(output.impactSummary.collapseDaysSaved).toBe(expectedCollapseDaysSaved);
    expect(output.impactSummary.costReductionPct).toBe(expectedCostReductionPct);
  });

  it('impactRadar relative formulas match reactive vs optimized outputs with documented rounding and clamping', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    const { reactive, sennagrid } = output;
    const relativeReductionPct = (reactiveVal: number, optimizedVal: number) => {
      if (reactiveVal === 0) return optimizedVal <= 0 ? 100 : 0;
      return Math.max(0, Math.min(100, ((reactiveVal - optimizedVal) / reactiveVal) * 100));
    };

    const expectedCasesControl = Number(relativeReductionPct(reactive.cumulativeCases, sennagrid.cumulativeCases).toFixed(1));
    const expectedPeakIcuSafety = Number(relativeReductionPct(reactive.peakIcuOverflow, sennagrid.peakIcuOverflow).toFixed(1));
    const expectedCollapsePrevention = Number(relativeReductionPct(reactive.icuCollapseDays, sennagrid.icuCollapseDays).toFixed(1));
    const expectedBudgetEfficiency = Number(relativeReductionPct(reactive.totalCostJ, sennagrid.totalCostJ).toFixed(1));

    expect(output.impactRadar.casesControl).toBe(expectedCasesControl);
    expect(output.impactRadar.peakIcuSafety).toBe(expectedPeakIcuSafety);
    expect(output.impactRadar.collapsePrevention).toBe(expectedCollapsePrevention);
    expect(output.impactRadar.budgetEfficiency).toBe(expectedBudgetEfficiency);
  });

  it('zero-denominator rule: equal zero reactive and optimized yields 100 on radar axes', () => {
    // Districts with no initial cases and no epidemic spread -> zero cumulative cases, zero overflow, zero collapse, zero cost
    const zeroCaseCity: DistrictProperties[] = [
      { id: 'z1', name: 'Zero1', population: 100000, icuBeds: 10, centroid: [0, 0], initialCases: 0, zoneType: 'residential' },
      { id: 'z2', name: 'Zero2', population: 100000, icuBeds: 10, centroid: [1, 0], initialCases: 0, zoneType: 'residential' },
      { id: 'z3', name: 'Zero3', population: 100000, icuBeds: 10, centroid: [0, 1], initialCases: 0, zoneType: 'residential' },
      { id: 'z4', name: 'Zero4', population: 100000, icuBeds: 10, centroid: [1, 1], initialCases: 0, zoneType: 'residential' },
    ];
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(zeroCaseCity, params, climate);

    // With zero reactive values, equal zero optimized -> 100 on radar
    expect(output.impactRadar.casesControl).toBe(100);
    expect(output.impactRadar.peakIcuSafety).toBe(100);
    expect(output.impactRadar.collapsePrevention).toBe(100);
    expect(output.impactRadar.budgetEfficiency).toBe(100);
    // Hub containment is not zero-denominator based
    expect(output.impactRadar.hubContainment).toBeGreaterThanOrEqual(0);
    expect(output.impactRadar.hubContainment).toBeLessThanOrEqual(100);
  });

  it('per-district peak formulas match flattened arrays and schedule', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);
    const { reactive, sennagrid } = output;
    const n = BENCHMARK_CITY.length;

    // Pick first district as representative
    const idx = 0;
    const district = BENCHMARK_CITY[idx]!;

    // Peak active infections from flattened arrays
    const reactivePeakActive = reactive.districtActive
      ? Math.max(...Array.from({ length: reactive.districtActive.length / n }, (_, d) => reactive.districtActive![d * n + idx] ?? 0))
      : 0;
    const optimizedPeakActive = sennagrid.districtActive
      ? Math.max(...Array.from({ length: sennagrid.districtActive.length / n }, (_, d) => sennagrid.districtActive![d * n + idx] ?? 0))
      : 0;
    const reactivePeakIcu = reactive.districtIcuDemand
      ? Math.max(...Array.from({ length: reactive.districtIcuDemand.length / n }, (_, d) => reactive.districtIcuDemand![d * n + idx] ?? 0))
      : 0;
    const optimizedPeakIcu = sennagrid.districtIcuDemand
      ? Math.max(...Array.from({ length: sennagrid.districtIcuDemand.length / n }, (_, d) => sennagrid.districtIcuDemand![d * n + idx] ?? 0))
      : 0;

    const expectedReactivePeakOverflow = Math.max(0, reactivePeakIcu - district.icuBeds);
    const expectedOptimizedPeakOverflow = Math.max(0, optimizedPeakIcu - district.icuBeds);

    // Intervention weeks from optimized schedule
    let interventionWeeks = 0;
    for (const weekRow of sennagrid.schedule) {
      if (weekRow[idx] === 1) interventionWeeks++;
    }

    const di = output.impactSummary.districtImpacts[idx]!;
    expect(Number(di.reactivePeakActiveInfections.toFixed(1))).toBe(Number(reactivePeakActive.toFixed(1)));
    expect(Number(di.optimizedPeakActiveInfections.toFixed(1))).toBe(Number(optimizedPeakActive.toFixed(1)));
    expect(Number(di.reactivePeakIcuDemand.toFixed(1))).toBe(Number(reactivePeakIcu.toFixed(1)));
    expect(Number(di.optimizedPeakIcuDemand.toFixed(1))).toBe(Number(optimizedPeakIcu.toFixed(1)));
    expect(Number(di.reactivePeakIcuOverflow.toFixed(1))).toBe(Number(expectedReactivePeakOverflow.toFixed(1)));
    expect(Number(di.optimizedPeakIcuOverflow.toFixed(1))).toBe(Number(expectedOptimizedPeakOverflow.toFixed(1)));
    expect(di.interventionWeeks).toBe(interventionWeeks);
  });

  it('budget boundary 0.10 and 0.40 produce finite results and quota compliance', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);

    for (const budgetRatio of [0.1, 0.4]) {
      const params: SimulationParams = {
        ...DEFAULT_SIMULATION_PARAMS,
        diseaseMode: 'vector_seir_sei',
        budgetRatio,
      };
      const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);
      const expectedK = computeWeeklyQuota(BENCHMARK_CITY.length, budgetRatio);

      expect(output.weeklyQuotaK).toBe(expectedK);
      expect(output.solveTimeMs).toBeLessThan(1500);
      expect(output.sennagrid.hasNaN).toBe(false);
      expect(output.sennagrid.maxMassConservationError).toBeLessThan(1e-9);
      expect(output.sennagrid.totalCostJ).toBeLessThan(output.reactive.totalCostJ);
      expect(Number.isFinite(output.impactRadar.casesControl)).toBe(true);
      expect(Number.isFinite(output.impactRadar.peakIcuSafety)).toBe(true);

      for (const weekRow of output.sennagrid.schedule) {
        const count = weekRow.reduce((acc, v) => acc + v, 0);
        expect(count).toBeLessThanOrEqual(expectedK);
      }
    }
  });

  it('ICU-first acceptance: overflow strictly decreases or cost tie-break at equal overflow', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    // ICU-first rule: for each accepted step,
    // - overflowDelta must never be negative (safety)
    // - if overflowDelta > 0: overflow strictly decreased (primary key), cost unconstrained
    // - if overflowDelta === 0: cost must strictly decrease (tie-breaker at equal overflow)
    for (const step of output.swapTrace) {
      expect(step.overflowDelta).toBeGreaterThanOrEqual(0);
      if (step.overflowDelta > 0) {
        // Primary key: overflow strictly decreased, cost unconstrained
        expect(step.overflowDelta).toBeGreaterThan(0);
      } else {
        // Tie-breaker: equal overflow (overflowDelta === 0), cost must strictly decrease
        expect(step.overflowDelta).toBe(0);
        expect(step.costAfter).toBeLessThan(step.costBefore);
      }
    }
  });

  it('safety and quota rules enforced: overflow <= reactive, collapse <= reactive, weekly quota', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    // Hospital safety guardrail
    expect(output.sennagrid.totalIcuOverflowCost).toBeLessThanOrEqual(output.reactive.totalIcuOverflowCost + 1e-6);
    expect(output.sennagrid.icuCollapseDays).toBeLessThanOrEqual(output.reactive.icuCollapseDays);

    // Weekly quota compliance
    for (const weekRow of output.sennagrid.schedule) {
      const count = weekRow.reduce((acc, v) => acc + v, 0);
      expect(count).toBeLessThanOrEqual(output.weeklyQuotaK);
    }

    // COST_DOMINANCE: final cost strictly less than reactive
    expect(output.sennagrid.totalCostJ).toBeLessThan(output.reactive.totalCostJ);
  });

  it('bounded evaluation accounting: evaluationsCount = 1 reactive + 5 Stage 1 + up to 250 Stage 2 = 256 max', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    // Exact budget: 1 reactive + 5 Stage 1 (4 base + 1 Direct-SEIR) + 250 Stage 2 = 256
    expect(output.evaluationsCount).toBeLessThanOrEqual(256);
    expect(output.evaluationsCount).toBeGreaterThanOrEqual(6); // 1 reactive + 5 Stage 1 minimum
  });

  it('multi-pass behavior: swapTrace pass field increments across passes', () => {
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(BENCHMARK_CITY, params, climate);

    // Multi-pass: swapTrace pass field should contain at least two distinct pass numbers
    const passes = new Set<number>();
    for (const step of output.swapTrace) {
      expect(step.pass).toBeGreaterThanOrEqual(1);
      passes.add(step.pass);
    }
    // BENCHMARK_CITY with Direct-SEIR should exhibit at least 2 passes
    expect(passes.size).toBeGreaterThan(1);
    // pass numbers should be sequential starting from 1
    const passArray = Array.from(passes).sort((a, b) => a - b);
    expect(passArray[0]).toBe(1);
    for (let i = 1; i < passArray.length; i++) {
      expect(passArray[i]!).toBe(passArray[i - 1]! + 1);
    }
  });

  it('never violates Hospital Safety Guardrail via cost-dominance fallback across unseen OOD cities', () => {
    const createRng = (seed: number) => {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    for (let seed = 101; seed <= 110; seed++) {
      const rng = createRng(seed);
      const n = 12 + Math.floor(rng() * 11);
      const districts: DistrictProperties[] = Array.from({ length: n }, (_, i) => {
        const isCore = i < 2;
        const isHub = i >= 2 && i < 5;
        return {
          id: `ood-${seed}-${i}`,
          name: `District ${i}`,
          population: isCore ? Math.round(90_000 + rng() * 90_000) : Math.round(25_000 + rng() * 95_000),
          icuBeds: isCore ? Math.round(28 + rng() * 35) : Math.round(6 + rng() * 16),
          centroid: [100 + rng() * 0.4, -5 + rng() * 0.4],
          initialCases: i < 5 ? Math.round(8 + rng() * 30) : rng() < 0.2 ? Math.round(rng() * 15) : 0,
          zoneType: isCore ? 'core' : isHub ? 'transit_hub' : 'residential',
        };
      });

      const baseTemp = 24 + rng() * 7;
      const climate = buildClimateSeriesFromSamples({
        source: 'fallback_climatology',
        anchorLat: -5,
        anchorLng: 100,
        pastPrecip7dMm: Array.from({ length: 7 }, () => rng() * 20),
        forecastTempsC: Array.from({ length: 14 }, () => baseTemp + (rng() - 0.5) * 3),
        forecastPrecipMm: Array.from({ length: 14 }, () => rng() * 18),
      });

      for (const diseaseMode of ['vector_seir_sei', 'direct_seir'] as const) {
        const output = optimizeResourceAllocation(
          districts,
          { ...DEFAULT_SIMULATION_PARAMS, diseaseMode, budgetRatio: 0.2 },
          climate,
        );

        expect(output.sennagrid.totalIcuOverflowCost).toBeLessThanOrEqual(
          output.reactive.totalIcuOverflowCost + 1e-6,
        );
        expect(output.sennagrid.icuCollapseDays).toBeLessThanOrEqual(output.reactive.icuCollapseDays);
        expect(output.sennagrid.totalCostJ).toBeLessThanOrEqual(output.reactive.totalCostJ + 1e-6);
      }
    }
  }, 20_000);

  it('sanitizes non-finite budgetRatio without producing NaN quotas or gate failures', () => {
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    expect(computeWeeklyQuota(18, Number.NaN)).toBe(3);

    const output = optimizeResourceAllocation(
      BENCHMARK_CITY,
      {
        ...DEFAULT_SIMULATION_PARAMS,
        budgetRatio: Number.NaN,
        icuRate: -0.2,
        mobilityOutflow: Number.POSITIVE_INFINITY,
        interventionEfficacy: Number.NaN,
      },
      climate,
    );

    expect(output.weeklyQuotaK).toBe(2);
    expect(output.params.budgetRatio).toBe(DEFAULT_SIMULATION_PARAMS.budgetRatio);
    expect(output.sennagrid.hasNaN).toBe(false);
    expect(output.gates.gates.find((g) => g.id === 'BUDGET_COMPLIANCE')?.passed).toBe(true);
  });
});
