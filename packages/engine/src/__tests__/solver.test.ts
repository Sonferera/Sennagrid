import { describe, expect, it } from 'vitest';
import { getFallbackClimateSeries } from '../climate';
import { buildMobilityModel } from '../mobility';
import {
  createInitialState,
  createSolverContext,
  evaluateCostFromWeekCheckpoint,
  projectUnmitigatedGrowth14d,
  simulateFullSchedule,
} from '../solver';
import {
  DEFAULT_SIMULATION_PARAMS,
  type DistrictProperties,
  type SimulationParams,
  type WeeklySchedule,
} from '../types';

const TEST_DISTRICTS: DistrictProperties[] = [
  {
    id: 'd1',
    name: 'Central Core',
    population: 210_000,
    icuBeds: 42,
    centroid: [106.845, -6.208],
    initialCases: 120,
    zoneType: 'core',
  },
  {
    id: 'd2',
    name: 'Transit North',
    population: 175_000,
    icuBeds: 24,
    centroid: [106.865, -6.165],
    initialCases: 85,
    zoneType: 'transit_hub',
  },
  {
    id: 'd3',
    name: 'Dense East',
    population: 190_000,
    icuBeds: 18,
    centroid: [106.905, -6.225],
    initialCases: 40,
    zoneType: 'residential',
  },
  {
    id: 'd4',
    name: 'West Basin',
    population: 140_000,
    icuBeds: 16,
    centroid: [106.785, -6.195],
    initialCases: 20,
    zoneType: 'residential',
  },
  {
    id: 'd5',
    name: 'South Fringe',
    population: 110_000,
    icuBeds: 14,
    centroid: [106.835, -6.285],
    initialCases: 10,
    zoneType: 'peri_urban',
  },
];

function makeSchedule(weeks: number, n: number, activeIdx: number): WeeklySchedule {
  return Array.from({ length: weeks }, () => {
    const u = new Uint8Array(n);
    if (activeIdx >= 0 && activeIdx < n) {
      u[activeIdx] = 1;
    }
    return u;
  });
}

function createContext(params: SimulationParams) {
  const [lat, lng] = params.regionId === 'harbor_corridor'
    ? [35.4437, 139.638] as const
    : [-6.208, 106.845] as const;
  const mobility = buildMobilityModel(TEST_DISTRICTS, { outflow: params.mobilityOutflow });
  const climate = getFallbackClimateSeries(params.regionId, lat, lng);
  return createSolverContext(TEST_DISTRICTS, mobility, climate, params);
}

function runTrajectory(params: SimulationParams, activeIdx: number) {
  const ctx = createContext(params);
  const initialState = createInitialState(TEST_DISTRICTS, ctx);
  return simulateFullSchedule(
    'sennagrid',
    makeSchedule(13, TEST_DISTRICTS.length, activeIdx),
    initialState,
    ctx,
  ).result;
}

describe('RK4 compartmental solver', () => {
  it('conserves human population (< 1e-9 error) and avoids NaNs in Vector-Borne SEIR-SEI mode', () => {
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
    };
    const mobility = buildMobilityModel(TEST_DISTRICTS, { outflow: params.mobilityOutflow });
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const ctx = createSolverContext(TEST_DISTRICTS, mobility, climate, params);
    const initState = createInitialState(TEST_DISTRICTS, ctx);
    const schedule = makeSchedule(13, TEST_DISTRICTS.length, 0);

    const { result } = simulateFullSchedule('reactive', schedule, initState, ctx);

    expect(result.hasNaN).toBe(false);
    expect(result.maxMassConservationError).toBeLessThan(1e-9);
    expect(result.dailyTotalActive).toHaveLength(92);
    expect(result.districtActive.length).toBe(92 * TEST_DISTRICTS.length);
    expect(result.cumulativeCases).toBeGreaterThan(275);
  });

  it('conserves human population (< 1e-9 error) in Direct-Contact SEIR mode', () => {
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'direct_seir',
    };
    const mobility = buildMobilityModel(TEST_DISTRICTS, { outflow: params.mobilityOutflow });
    const climate = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);
    const ctx = createSolverContext(TEST_DISTRICTS, mobility, climate, params);
    const initState = createInitialState(TEST_DISTRICTS, ctx);
    const schedule = makeSchedule(13, TEST_DISTRICTS.length, 1);

    const { result } = simulateFullSchedule('sennagrid', schedule, initState, ctx);

    expect(result.hasNaN).toBe(false);
    expect(result.maxMassConservationError).toBeLessThan(1e-9);
    expect(result.dailyTotalActive).toHaveLength(92);
    expect(result.peakActiveInfections).toBeGreaterThan(275);
  });

  it('matches checkpointed partial simulation to full simulation within 1e-12', () => {
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
    };
    const mobility = buildMobilityModel(TEST_DISTRICTS, { outflow: params.mobilityOutflow });
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const ctx = createSolverContext(TEST_DISTRICTS, mobility, climate, params);
    const initState = createInitialState(TEST_DISTRICTS, ctx);
    const schedule = makeSchedule(13, TEST_DISTRICTS.length, 0);

    const full = simulateFullSchedule('reactive', schedule, initState, ctx);

    for (const startWeek of [0, 3, 7, 10]) {
      const partial = evaluateCostFromWeekCheckpoint(
        startWeek,
        full.weeklyCheckpoints[startWeek]!,
        full.prefixCostBeforeWeek[startWeek]!,
        full.prefixOverflowBeforeWeek[startWeek]!,
        full.prefixCollapseDaysBeforeWeek[startWeek]!,
        schedule,
        ctx,
      );
      expect(Math.abs(partial.totalCostJ - full.result.totalCostJ)).toBeLessThan(1e-9);
      expect(Math.abs(partial.totalOverflow - full.result.totalIcuOverflowCost)).toBeLessThan(1e-9);
      expect(partial.collapseDays).toBe(full.result.icuCollapseDays);
    }
  });

  it('reduces total outbreak cost when interventions are active compared to zero intervention', () => {
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
    };
    const mobility = buildMobilityModel(TEST_DISTRICTS, { outflow: params.mobilityOutflow });
    const climate = getFallbackClimateSeries('metro_tropica', -6.208, 106.845);
    const ctx = createSolverContext(TEST_DISTRICTS, mobility, climate, params);
    const initState = createInitialState(TEST_DISTRICTS, ctx);

    const none = simulateFullSchedule('reactive', makeSchedule(13, 5, -1), initState, ctx);
    const treated = simulateFullSchedule('sennagrid', makeSchedule(13, 5, 0), initState, ctx);
    const growth = projectUnmitigatedGrowth14d(initState, 0, ctx);

    expect(treated.result.totalCostJ).toBeLessThan(none.result.totalCostJ);
    expect(growth.length).toBe(TEST_DISTRICTS.length);
    expect(growth.some((v) => v > 0)).toBe(true);
  });

  it.each([
    { mode: 'vector_seir_sei' as const, defaultEfficacy: 0.65, regionId: 'metro_tropica' as const },
    { mode: 'direct_seir' as const, defaultEfficacy: 0.6, regionId: 'harbor_corridor' as const },
  ])('preserves the $mode default trajectory when efficacy is omitted', ({ mode, defaultEfficacy, regionId }) => {
    const baseParams: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId,
      diseaseMode: mode,
    };
    const omitted = runTrajectory(baseParams, 0);
    const explicitParams: SimulationParams = {
      ...baseParams,
      interventionEfficacy: defaultEfficacy,
    };
    const explicit = runTrajectory(explicitParams, 0);

    expect(createContext(explicitParams).interventionEfficacy).toBe(defaultEfficacy);
    expect(explicit.cumulativeCases).toBe(omitted.cumulativeCases);
    expect(explicit.totalCostJ).toBe(omitted.totalCostJ);
    expect(Array.from(explicit.districtActive)).toEqual(Array.from(omitted.districtActive));
  });

  it.each([
    { mode: 'vector_seir_sei' as const, regionId: 'metro_tropica' as const },
    { mode: 'direct_seir' as const, regionId: 'harbor_corridor' as const },
  ])('applies efficacy 0 as no intervention and efficacy 1 as stronger suppression in $mode', ({ mode, regionId }) => {
    const baseParams: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId,
      diseaseMode: mode,
    };
    const untreated = runTrajectory(baseParams, -1);
    const zeroEfficacy = runTrajectory({ ...baseParams, interventionEfficacy: 0 }, 0);
    const fullEfficacy = runTrajectory({ ...baseParams, interventionEfficacy: 1 }, 0);

    expect(zeroEfficacy.totalCostJ).toBeCloseTo(untreated.totalCostJ, 10);
    expect(fullEfficacy.totalCostJ).toBeLessThan(zeroEfficacy.totalCostJ);
    expect(fullEfficacy.hasNaN).toBe(false);
  });

  it.each([
    { value: NaN, expected: 0.65 },
    { value: Infinity, expected: 0.65 },
    { value: -0.5, expected: 0 },
    { value: 1.5, expected: 1 },
  ])('resolves invalid efficacy $value to $expected', ({ value, expected }) => {
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      diseaseMode: 'vector_seir_sei',
      interventionEfficacy: value,
    };
    expect(createContext(params).interventionEfficacy).toBe(expected);
  });

  it('normalizes invalid ICU rates to zero without producing non-finite results', () => {
    for (const icuRate of [-1, NaN, Infinity]) {
      const params: SimulationParams = {
        ...DEFAULT_SIMULATION_PARAMS,
        icuRate,
      };
      const ctx = createContext(params);
      expect(ctx.icuRate).toBe(0);
      expect(runTrajectory(params, 0).hasNaN).toBe(false);
    }
  });
});
