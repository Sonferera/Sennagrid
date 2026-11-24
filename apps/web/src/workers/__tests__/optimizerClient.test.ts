import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOptimizerWorkerClient } from '../optimizerClient';
import type {
  DistrictProperties,
  SimulationParams,
  ClimateSeries,
  OptimizationOutput,
  WorkerResponse,
  WorkerRunRequest,
} from '@sennagrid/engine';

class MockWorker {
  onmessageFn: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerrorFn: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  terminated = false;

  latestRequestId = 0;
  postedRequests: WorkerRunRequest[] = [];

  static instances: MockWorker[] = [];

  constructor() {
    MockWorker.instances.push(this);
  }

  set onmessage(fn: ((event: MessageEvent<WorkerResponse>) => void) | null) {
    this.onmessageFn = fn;
  }

  set onerror(fn: ((event: MessageEvent<WorkerResponse>) => void) | null) {
    this.onerrorFn = fn;
  }

  isWorkerRunRequest(message: unknown): message is WorkerRunRequest {
    return (
      message !== null &&
      typeof message === 'object' &&
      'type' in message &&
      message.type === 'RUN_OPTIMIZATION' &&
      'requestId' in message &&
      typeof message.requestId === 'number' &&
      'params' in message &&
      'districts' in message &&
      'climate' in message
    );
  }

  postMessage(message: unknown): void {
    if (this.terminated) return;

    if (this.isWorkerRunRequest(message)) {
      const runReq = message;
      this.postedRequests.push(runReq);
      this.latestRequestId = runReq.requestId;
    }
  }

  respondResult(requestId: number, output: OptimizationOutput): void {
    const payload: WorkerResponse = {
      type: 'OPTIMIZATION_RESULT',
      requestId,
      result: output,
    };
    if (this.onmessageFn) {
      this.onmessageFn(
        new MessageEvent<WorkerResponse>('message', { data: payload })
      );
    }
  }

  respondError(requestId: number, error: string): void {
    const payload: WorkerResponse = {
      type: 'OPTIMIZATION_ERROR',
      requestId,
      error,
    };
    if (this.onmessageFn) {
      this.onmessageFn(
        new MessageEvent<WorkerResponse>('message', { data: payload })
      );
    }
  }

  terminate(): void {
    this.terminated = true;
  }
}

MockWorker.instances = [];

function makeStrategyResult(): OptimizationOutput {
  return {
    params: {
      regionId: 'metro_tropica',
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
      icuRate: 0.015,
      mobilityOutflow: 0.18,
      horizonDays: 91,
      dt: 0.25,
    },
    climate: {
      source: 'open_meteo',
      fetchedAtIso: '2024-01-01',
      anchorLat: 0,
      anchorLng: 0,
      meanTemp14d: 25,
      meanPrecip14d: 5,
      days: [],
    },
    districts: [],
    hubCentrality: [],
    totalIcuCapacity: 0,
    weeklyQuotaK: 0,
    reactive: {
      name: 'reactive',
      schedule: [],
      totalCostJ: 0,
      totalIcuOverflowCost: 0,
      totalInfectionDays: 0,
      cumulativeCases: 0,
      peakActiveInfections: 0,
      peakIcuDemand: 0,
      peakIcuOverflow: 0,
      icuCollapseDays: 0,
      maxMassConservationError: 0,
      hasNaN: false,
      dailyTotalActive: [],
      dailyTotalIcuDemand: [],
      dailyCityOverflow: [],
      districtActive: new Float64Array(0),
      districtIcuDemand: new Float64Array(0),
    },
    sennagrid: {
      name: 'sennagrid',
      schedule: [],
      totalCostJ: 0,
      totalIcuOverflowCost: 0,
      totalInfectionDays: 0,
      cumulativeCases: 0,
      peakActiveInfections: 0,
      peakIcuDemand: 0,
      peakIcuOverflow: 0,
      icuCollapseDays: 0,
      maxMassConservationError: 0,
      hasNaN: false,
      dailyTotalActive: [],
      dailyTotalIcuDemand: [],
      dailyCityOverflow: [],
      districtActive: new Float64Array(0),
      districtIcuDemand: new Float64Array(0),
    },
    assignments: [],
    swapTrace: [],
    gates: {
      overallStatus: 'PASS',
      passedCount: 0,
      totalGates: 0,
      readinessScore: 0,
      gates: [],
    },
    impactSummary: {
      casesAverted: 10,
      casesAvertedPct: 5,
      peakIcuOverflowPrevented: 2,
      collapseDaysSaved: 1,
      costReductionPct: 3,
      districtImpacts: [],
    },
    impactRadar: {
      casesControl: 8,
      peakIcuSafety: 7,
      collapsePrevention: 6,
      hubContainment: 9,
      budgetEfficiency: 5,
    },
    evaluationsCount: 0,
    solveTimeMs: 0,
    improvementPct: 0,
  };
}

describe('optimizerWorkerClient lifecycle', () => {
  let client: ReturnType<typeof createOptimizerWorkerClient>;
  let worker: MockWorker;

  const defaultParams: SimulationParams = {
    regionId: 'metro_tropica',
    diseaseMode: 'vector_seir_sei',
    budgetRatio: 0.2,
    icuRate: 0.015,
    mobilityOutflow: 0.18,
    horizonDays: 91,
    dt: 0.25,
  };

  const defaultClimate: ClimateSeries = {
    source: 'open_meteo',
    fetchedAtIso: '2024-01-01',
    anchorLat: 0,
    anchorLng: 0,
    meanTemp14d: 25,
    meanPrecip14d: 5,
    days: [],
  };

  const defaultDistricts: DistrictProperties[] = [
    { id: 'd1', name: 'D1', population: 1000, icuBeds: 50, centroid: [0, 0], initialCases: 5, zoneType: 'core' },
  ];

  beforeEach(() => {
    MockWorker.instances = [];
    vi.unstubAllGlobals();
    vi.stubGlobal('Worker', MockWorker);
    client = createOptimizerWorkerClient();
    worker = MockWorker.instances.at(-1)!;
    if (!worker) throw new Error('MockWorker instance not registered');
  });

  afterEach(() => {
    if (client && typeof client.terminate === 'function') client.terminate();
    vi.unstubAllGlobals();
  });

  it('overlap: A resolves null, B stays unsettled then resolves', async () => {
    const pA = client.run(defaultDistricts, defaultParams, defaultClimate);
    const pB = client.run(defaultDistricts, defaultParams, defaultClimate);
    let bSettled = false;
    void pB.then(
      () => { bSettled = true; },
      () => { bSettled = true; },
    );

    expect(await pA).toBeNull();
    await Promise.resolve();
    expect(bSettled).toBe(false);

    const bId = worker.postedRequests[worker.postedRequests.length - 1]!.requestId;
    const output = makeStrategyResult();
    worker.respondResult(bId, output);
    expect(await pB).toBe(output);
  });

  it('stale A after B starts: B remains unsettled, then resolves', async () => {
    const pA = client.run(defaultDistricts, defaultParams, defaultClimate);
    const pB = client.run(defaultDistricts, defaultParams, defaultClimate);
    let bSettled = false;
    void pB.then(
      () => { bSettled = true; },
      () => { bSettled = true; },
    );

    const aId = worker.postedRequests[worker.postedRequests.length - 2]!.requestId;
    worker.respondResult(aId, makeStrategyResult());
    expect(await pA).toBeNull();
    await Promise.resolve();
    expect(bSettled).toBe(false);

    const bId = worker.postedRequests[worker.postedRequests.length - 1]!.requestId;
    const output = makeStrategyResult();
    worker.respondResult(bId, output);
    expect(await pB).toBe(output);
  });

  it('success: respond to actual ID and assert exact output', async () => {
    const p = client.run(defaultDistricts, defaultParams, defaultClimate);
    const postedId = worker.postedRequests[worker.postedRequests.length - 1]!.requestId;
    const output = makeStrategyResult();
    worker.respondResult(postedId, output);
    expect(await p).toBe(output);
  });

  it('terminate: pending promise resolves null and worker.terminated is true', async () => {
    const p = client.run(defaultDistricts, defaultParams, defaultClimate);
    client.terminate();
    const result = await p;
    expect(result).toBeNull();
    expect(worker.terminated).toBe(true);
  });

  it('post-termination delivery: terminate then respond, promise stays null', async () => {
    const p = client.run(defaultDistricts, defaultParams, defaultClimate);
    client.terminate();
    const postedId = worker.postedRequests[worker.postedRequests.length - 1]?.requestId ?? 1;
    worker.respondResult(postedId, makeStrategyResult());
    const result = await p;
    expect(result).toBeNull();
  });

  it('error: OPTIMIZATION_ERROR response rejects with Worker Error', async () => {
    const p = client.run(defaultDistricts, defaultParams, defaultClimate);
    const postedId = worker.postedRequests[worker.postedRequests.length - 1]?.requestId ?? 1;
    worker.respondError(postedId, 'Worker Error');
    await expect(p).rejects.toThrow('Worker Error');
  });
});