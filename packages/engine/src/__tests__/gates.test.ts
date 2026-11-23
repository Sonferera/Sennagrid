import { describe, expect, it } from 'vitest';
import { evaluatePolicyGates } from '../gates';
import type { StrategySimulationResult } from '../types';

function makeMockResult(overrides: Partial<StrategySimulationResult>): StrategySimulationResult {
  return {
    name: 'sennagrid',
    schedule: Array.from({ length: 13 }, () => [1, 1, 0, 0, 0, 0, 0, 0]),
    totalCostJ: 8000,
    totalIcuOverflowCost: 0,
    totalInfectionDays: 8000,
    cumulativeCases: 4200,
    peakActiveInfections: 180,
    peakIcuDemand: 20,
    peakIcuOverflow: 0,
    icuCollapseDays: 0,
    maxMassConservationError: 1e-13,
    hasNaN: false,
    dailyTotalActive: [],
    dailyTotalIcuDemand: [],
    dailyCityOverflow: [],
    districtActive: new Float64Array(0),
    districtIcuDemand: new Float64Array(0),
    ...overrides,
  };
}

describe('policy and integrity gates', () => {
  it('returns PASS with high readiness score when all 5 gates pass', () => {
    const reactive = makeMockResult({
      name: 'reactive',
      totalCostJ: 12000,
      icuCollapseDays: 18,
    });
    const sennagrid = makeMockResult({
      name: 'sennagrid',
      totalCostJ: 7500,
      icuCollapseDays: 0,
    });

    const summary = evaluatePolicyGates({
      reactive,
      sennagrid,
      hubCentrality: [0.32, 0.29, 0.14, 0.12, 0.11, 0.1, 0.08, 0.07],
      weeklyQuotaK: 2,
    });

    expect(summary.overallStatus).toBe('PASS');
    expect(summary.passedCount).toBe(5);
    expect(summary.readinessScore).toBe(100);
  });

  it('returns FAIL when weekly budget quota is violated', () => {
    const reactive = makeMockResult({ name: 'reactive', totalCostJ: 12000, icuCollapseDays: 10 });
    const sennagrid = makeMockResult({
      name: 'sennagrid',
      totalCostJ: 7000,
      schedule: Array.from({ length: 13 }, () => [1, 1, 1, 0, 0, 0, 0, 0]),
    });

    const summary = evaluatePolicyGates({
      reactive,
      sennagrid,
      hubCentrality: [0.3, 0.25, 0.2, 0.15, 0.1, 0.09, 0.08, 0.07],
      weeklyQuotaK: 2,
    });

    expect(summary.overallStatus).toBe('FAIL');
    const budgetGate = summary.gates.find((g) => g.id === 'BUDGET_COMPLIANCE');
    expect(budgetGate?.passed).toBe(false);
  });

  it('returns FAIL when mass conservation error exceeds threshold or NaN occurs', () => {
    const reactive = makeMockResult({ name: 'reactive', totalCostJ: 12000 });
    const sennagrid = makeMockResult({
      name: 'sennagrid',
      totalCostJ: 8000,
      maxMassConservationError: 1e-4,
    });

    const summary = evaluatePolicyGates({
      reactive,
      sennagrid,
      hubCentrality: [0.3, 0.25, 0.2, 0.15, 0.1, 0.09, 0.08, 0.07],
      weeklyQuotaK: 2,
    });

    expect(summary.overallStatus).toBe('FAIL');
    const massGate = summary.gates.find((g) => g.id === 'MASS_CONSERVATION');
    expect(massGate?.passed).toBe(false);
  });
});
