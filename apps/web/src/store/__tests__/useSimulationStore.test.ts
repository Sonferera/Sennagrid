import {
  getFallbackClimateSeries,
  optimizeResourceAllocation,
  type ClimateSeries,
  type DistrictProperties,
  type OptimizationOutput,
  type RegionId,
  type SimulationParams,
} from '@sennagrid/engine';
import { describe, expect, it } from 'vitest';
import { HARBOR_CORRIDOR_PRESET, METRO_TROPICA_PRESET } from '../../data/regions';
import { findReactivePeakIcuDay } from '../../lib/viewModels';
import type { OptimizerWorkerClient } from '../../workers/optimizerClient';
import { createSimulationStore } from '../useSimulationStore';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createSyncMockWorkerClient(): OptimizerWorkerClient {
  return {
    async run(
      districts: DistrictProperties[],
      params: SimulationParams,
      climate: ClimateSeries,
    ): Promise<OptimizationOutput> {
      return optimizeResourceAllocation(districts, params, climate);
    },
    terminate() {},
  };
}

describe('useSimulationStore lifecycle and orchestration', () => {
  it('runs initial optimization immediately with fallback climate without blocking on live weather', async () => {
    const weatherDeferred = createDeferred<ClimateSeries>();
    let workerRuns = 0;

    const store = createSimulationStore({
      fetchClimate: () => weatherDeferred.promise,
      createWorkerClient: () => ({
        async run(districts, params, climate) {
          workerRuns++;
          return optimizeResourceAllocation(districts, params, climate);
        },
        terminate() {},
      }),
    });

    // initialize() must resolve even while live weather fetch is still pending.
    await store.getState().initialize();
    const afterInit = store.getState();
    expect(afterInit.output).not.toBeNull();
    expect(afterInit.climate?.source).toBe('fallback_climatology');
    expect(afterInit.isOptimizing).toBe(false);
    expect(afterInit.weatherRefreshPending).toBe(true);
    expect(workerRuns).toBe(1);

    // When Open-Meteo later resolves, store upgrades climate and re-runs cleanly.
    const liveClimate: ClimateSeries = {
      ...getFallbackClimateSeries(
        'metro_tropica',
        METRO_TROPICA_PRESET.anchorLat,
        METRO_TROPICA_PRESET.anchorLng,
      ),
      source: 'open_meteo',
      meanTemp14d: 30.2,
    };
    weatherDeferred.resolve(liveClimate);
    await new Promise((r) => setTimeout(r, 20));

    const afterUpgrade = store.getState();
    expect(afterUpgrade.climate?.source).toBe('open_meteo');
    expect(afterUpgrade.output?.climate.source).toBe('open_meteo');
    expect(afterUpgrade.weatherRefreshPending).toBe(false);
    expect(workerRuns).toBe(2);

    store.getState().dispose();
  });

  it('ignores superseded null worker results (latest-request-wins)', async () => {
    const firstRun = createDeferred<OptimizationOutput | null>();
    const secondRun = createDeferred<OptimizationOutput | null>();
    let callCount = 0;

    const metroClimate = getFallbackClimateSeries(
      'metro_tropica',
      METRO_TROPICA_PRESET.anchorLat,
      METRO_TROPICA_PRESET.anchorLng,
    );
    const secondOutput = optimizeResourceAllocation(
      METRO_TROPICA_PRESET.districts,
      {
        regionId: 'metro_tropica',
        diseaseMode: 'vector_seir_sei',
        budgetRatio: 0.3,
        icuRate: 0.015,
        mobilityOutflow: 0.18,
        horizonDays: 91,
        dt: 0.25,
      },
      metroClimate,
    );

    const store = createSimulationStore({
      fetchClimate: async () => metroClimate,
      createWorkerClient: () => ({
        run() {
          callCount++;
          return callCount === 1 ? firstRun.promise : secondRun.promise;
        },
        terminate() {},
      }),
    });

    const p1 = store.getState().runOptimization();
    const p2 = store.getState().runOptimization({
      ...store.getState().params,
      budgetRatio: 0.3,
    });

    // Older run resolves null when superseded: isOptimizing must stay true!
    firstRun.resolve(null);
    await p1;
    expect(store.getState().isOptimizing).toBe(true);
    expect(store.getState().output).toBeNull();

    // Newer run settles and populates output cleanly.
    secondRun.resolve(secondOutput);
    await p2;
    expect(store.getState().isOptimizing).toBe(false);
    expect(store.getState().output?.params.budgetRatio).toBe(0.3);

    store.getState().dispose();
  });

  it('switches region preset, resets stale district selection, and clamps timeline days', async () => {
    const store = createSimulationStore({
      fetchClimate: async (regionId: RegionId) => {
        const preset = regionId === 'metro_tropica' ? METRO_TROPICA_PRESET : HARBOR_CORRIDOR_PRESET;
        return getFallbackClimateSeries(regionId, preset.anchorLat, preset.anchorLng);
      },
      createWorkerClient: createSyncMockWorkerClient,
    });

    await store.getState().initialize();
    const metroDistrictId = METRO_TROPICA_PRESET.districts[0]!.id;
    store.getState().selectDistrict(metroDistrictId);
    expect(store.getState().selectedDistrictId).toBe(metroDistrictId);

    // Timeline clamping and jump to peak
    store.getState().setCurrentDay(150);
    expect(store.getState().currentDay).toBe(91);
    store.getState().stepDay(-100);
    expect(store.getState().currentDay).toBe(0);
    store.getState().jumpToPeakDay();
    expect(store.getState().currentDay).toBe(findReactivePeakIcuDay(store.getState().output!));

    // Switch to Harbor Corridor
    await store.getState().setRegion('harbor_corridor');
    const harborState = store.getState();
    expect(harborState.params.regionId).toBe('harbor_corridor');
    expect(harborState.params.diseaseMode).toBe('direct_seir');
    expect(harborState.selectedDistrictId).toBeNull();
    expect(harborState.currentDay).toBe(0);
    expect(harborState.output?.districts).toHaveLength(HARBOR_CORRIDOR_PRESET.districts.length);

    // Budget slider + resetDefaults
    store.getState().setBudgetRatio(0.35);
    expect(store.getState().params.budgetRatio).toBe(0.35);
    await store.getState().resetDefaults();
    expect(store.getState().params.budgetRatio).toBe(0.2);
    expect(store.getState().params.diseaseMode).toBe('direct_seir');

    store.getState().dispose();
  });

  it('preserves previous valid output when a subsequent worker run errors', async () => {
    let shouldFail = false;
    const store = createSimulationStore({
      fetchClimate: async () =>
        getFallbackClimateSeries(
          'metro_tropica',
          METRO_TROPICA_PRESET.anchorLat,
          METRO_TROPICA_PRESET.anchorLng,
        ),
      createWorkerClient: () => ({
        async run(districts, params, climate) {
          if (shouldFail) {
            throw new Error('Simulated worker failure');
          }
          return optimizeResourceAllocation(districts, params, climate);
        },
        terminate() {},
      }),
    });

    await store.getState().initialize();
    const validOutput = store.getState().output;
    expect(validOutput).not.toBeNull();

    shouldFail = true;
    await store.getState().runOptimization();
    expect(store.getState().error).toContain('Simulated worker failure');
    expect(store.getState().output).toBe(validOutput);
    expect(store.getState().isOptimizing).toBe(false);

    store.getState().dispose();
  });
});
