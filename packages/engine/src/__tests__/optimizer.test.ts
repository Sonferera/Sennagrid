import { describe, expect, it } from 'vitest';
import { getFallbackClimateSeries } from '../climate';
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
});
