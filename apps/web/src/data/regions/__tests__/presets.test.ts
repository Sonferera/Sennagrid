import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMULATION_PARAMS,
  getFallbackClimateSeries,
  optimizeResourceAllocation,
  type DiseaseMode,
  type SimulationParams,
} from '@sennagrid/engine';
import {
  buildCustomCityPreset,
  HARBOR_CORRIDOR_PRESET,
  HIGHLAND_RING_PRESET,
  METRO_TROPICA_PRESET,
  MONSOON_DELTA_PRESET,
  REGION_PRESET_LIST,
} from '../index';

function polygonSignedArea(ring: readonly [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[i + 1]!;
    area += x0 * y1 - x1 * y0;
  }
  return area * 0.5;
}

describe('city region GeoJSON presets and calibration', () => {
  it('provides valid closed counter-clockwise GeoJSON polygons with expected district counts', () => {
    expect(METRO_TROPICA_PRESET.districts).toHaveLength(18);
    expect(METRO_TROPICA_PRESET.featureCollection.features).toHaveLength(18);
    expect(HARBOR_CORRIDOR_PRESET.districts).toHaveLength(16);
    expect(HARBOR_CORRIDOR_PRESET.featureCollection.features).toHaveLength(16);
    expect(HIGHLAND_RING_PRESET.districts).toHaveLength(16);
    expect(HIGHLAND_RING_PRESET.featureCollection.features).toHaveLength(16);
    expect(MONSOON_DELTA_PRESET.districts).toHaveLength(18);
    expect(MONSOON_DELTA_PRESET.featureCollection.features).toHaveLength(18);

    for (const preset of REGION_PRESET_LIST) {
      const seenIds = new Set<string>();

      for (const feature of preset.featureCollection.features) {
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Polygon');
        expect(seenIds.has(feature.id)).toBe(false);
        seenIds.add(feature.id);

        const ring = feature.geometry.coordinates[0]!;
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        expect(polygonSignedArea(ring)).toBeGreaterThan(0);

        const [lng, lat] = feature.properties.centroid;
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(feature.properties.population).toBeGreaterThan(0);
        expect(feature.properties.icuBeds).toBeGreaterThan(0);
      }
    }
  });

  it('beats reactive baseline on both presets across 15%, 20%, and 30% budgets under 1.5s', () => {
    const modes: DiseaseMode[] = ['vector_seir_sei', 'direct_seir'];
    const budgets = [0.15, 0.2, 0.3];

    for (const preset of REGION_PRESET_LIST) {
      const climate = getFallbackClimateSeries(preset.id, preset.anchorLat, preset.anchorLng);

      for (const diseaseMode of modes) {
        for (const budgetRatio of budgets) {
          const params: SimulationParams = {
            ...DEFAULT_SIMULATION_PARAMS,
            regionId: preset.id,
            diseaseMode,
            budgetRatio,
          };

          const output = optimizeResourceAllocation(preset.districts, params, climate);

          expect(output.solveTimeMs).toBeLessThan(1500);
          expect(output.sennagrid.hasNaN).toBe(false);
          expect(output.sennagrid.maxMassConservationError).toBeLessThan(1e-9);
          expect(output.sennagrid.totalCostJ).toBeLessThan(output.reactive.totalCostJ);
          expect(output.improvementPct).toBeGreaterThan(0);
        }
      }
    }
  }, 15_000);

  it('demonstrates clear ICU overflow prevention on default Metro Tropica (20% Vector-Borne)', () => {
    const climate = getFallbackClimateSeries(
      METRO_TROPICA_PRESET.id,
      METRO_TROPICA_PRESET.anchorLat,
      METRO_TROPICA_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'metro_tropica',
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };

    const output = optimizeResourceAllocation(METRO_TROPICA_PRESET.districts, params, climate);

    // Acceptance criteria: Reactive visibly breaches ICU while SennaGrid sharply reduces or prevents collapse.
    expect(output.reactive.icuCollapseDays).toBeGreaterThan(0);
    expect(output.reactive.peakIcuOverflow).toBeGreaterThan(0);
    expect(output.sennagrid.totalIcuOverflowCost).toBeLessThan(output.reactive.totalIcuOverflowCost);
    expect(output.sennagrid.icuCollapseDays).toBeLessThanOrEqual(output.reactive.icuCollapseDays);
    expect(output.gates.overallStatus).toBe('PASS');
  });

  it('Harbor Corridor Direct SEIR 20% benchmark: overflow <=231.0, collapse, gates, solve time, deterministic', () => {
    const climate = getFallbackClimateSeries(
      HARBOR_CORRIDOR_PRESET.id,
      HARBOR_CORRIDOR_PRESET.anchorLat,
      HARBOR_CORRIDOR_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };

    const output = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);

    // Measured baseline
    expect(output.reactive.totalIcuOverflowCost).toBeCloseTo(292.4, 0);
    expect(output.reactive.icuCollapseDays).toBe(17);
    expect(output.reactive.peakIcuOverflow).toBeCloseTo(34.7, 0);

    // Optimized results - ICU-first acceptance target
    expect(output.sennagrid.totalIcuOverflowCost).toBeLessThanOrEqual(231.0);
    expect(output.sennagrid.totalIcuOverflowCost).toBeLessThan(output.reactive.totalIcuOverflowCost);
    expect(output.sennagrid.icuCollapseDays).toBeLessThanOrEqual(output.reactive.icuCollapseDays);
    expect(output.sennagrid.peakIcuOverflow).toBeLessThan(output.reactive.peakIcuOverflow);
    expect(output.solveTimeMs).toBeLessThan(1500);
    expect(output.evaluationsCount).toBe(256); // 1 reactive + 5 Stage 1 + 250 Stage 2
    expect(output.gates.gates.find((g) => g.id === 'MASS_CONSERVATION')?.passed).toBe(true);
    expect(output.gates.gates.find((g) => g.id === 'BUDGET_COMPLIANCE')?.passed).toBe(true);
    expect(output.gates.gates.find((g) => g.id === 'COST_DOMINANCE')?.passed).toBe(true);
    expect(output.gates.overallStatus).toBe('PASS');

    // Deterministic repeat run - full equality
    const output2 = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);
    expect(output2.sennagrid.totalCostJ).toBe(output.sennagrid.totalCostJ);
    expect(output2.sennagrid.totalIcuOverflowCost).toBe(output.sennagrid.totalIcuOverflowCost);
    expect(output2.sennagrid.icuCollapseDays).toBe(output.sennagrid.icuCollapseDays);
    expect(output2.sennagrid.peakIcuOverflow).toBe(output.sennagrid.peakIcuOverflow);
    expect(output2.sennagrid.cumulativeCases).toBe(output.sennagrid.cumulativeCases);
    expect(output2.evaluationsCount).toBe(output.evaluationsCount);
    // solveTimeMs is a wall-clock timing measurement; only assert it's bounded
    expect(output2.solveTimeMs).toBeLessThan(1500);
    expect(output2.swapTrace.length).toBe(output.swapTrace.length);
    // Full schedule equality
    expect(output2.sennagrid.schedule).toEqual(output.sennagrid.schedule);
    // Full assignments equality
    expect(output2.assignments).toEqual(output.assignments);
    // Full swapTrace equality (includes new pass and overflowDelta fields)
    expect(output2.swapTrace).toEqual(output.swapTrace);
    // Full impactSummary equality
    expect(output2.impactSummary).toEqual(output.impactSummary);
    // Full impactRadar equality
    expect(output2.impactRadar).toEqual(output.impactRadar);
  });

  it('Harbor actual preset exhausts 256-evaluation cap deterministically', () => {
    const climate = getFallbackClimateSeries(
      HARBOR_CORRIDOR_PRESET.id,
      HARBOR_CORRIDOR_PRESET.anchorLat,
      HARBOR_CORRIDOR_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output1 = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);
    const output2 = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);

    // Harbor actual preset with 16 districts should hit the 256 cap (1 reactive + 5 Stage 1 + 250 Stage 2)
    expect(output1.evaluationsCount).toBe(256);
    expect(output2.evaluationsCount).toBe(256);
    expect(output1.evaluationsCount).toBe(output2.evaluationsCount);
  });

  it('multi-pass behavior: swapTrace pass field increments across passes', () => {
    const climate = getFallbackClimateSeries(
      HARBOR_CORRIDOR_PRESET.id,
      HARBOR_CORRIDOR_PRESET.anchorLat,
      HARBOR_CORRIDOR_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);

    // Multi-pass: swapTrace pass field should contain at least two distinct pass numbers
    const passes = new Set<number>();
    for (const step of output.swapTrace) {
      expect(step.pass).toBeGreaterThanOrEqual(1);
      passes.add(step.pass);
    }
    // Harbor actual preset with ICU-first should exhibit at least 2 passes
    expect(passes.size).toBeGreaterThan(1);
    // pass numbers should be sequential starting from 1
    const passArray = Array.from(passes).sort((a, b) => a - b);
    expect(passArray[0]).toBe(1);
    for (let i = 1; i < passArray.length; i++) {
      expect(passArray[i]!).toBe(passArray[i - 1]! + 1);
    }
  });

  it('multi-pass revisits week: a later pass accepts a swap in a week already processed in an earlier pass', () => {
    const climate = getFallbackClimateSeries(
      HARBOR_CORRIDOR_PRESET.id,
      HARBOR_CORRIDOR_PRESET.anchorLat,
      HARBOR_CORRIDOR_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'harbor_corridor',
      diseaseMode: 'direct_seir',
      budgetRatio: 0.2,
    };
    const output = optimizeResourceAllocation(HARBOR_CORRIDOR_PRESET.districts, params, climate);

    // Build map of week -> set of passes where accepted swaps occurred
    const weekToPasses = new Map<number, Set<number>>();
    for (const step of output.swapTrace) {
      const passes = weekToPasses.get(step.week) ?? new Set<number>();
      passes.add(step.pass);
      weekToPasses.set(step.week, passes);
    }
    // At least one week must have accepted swaps from multiple passes
    const revisitedWeeks = Array.from(weekToPasses.entries()).filter(([, passes]) => passes.size > 1);
    // Harbor actual preset with ICU-first should exhibit at least one week revisited across passes
    expect(revisitedWeeks.length).toBeGreaterThan(0);
  });

  it('Metro Tropica Vector SEIR 20% retains 5/5 PASS gate result and quality', () => {
    const climate = getFallbackClimateSeries(
      METRO_TROPICA_PRESET.id,
      METRO_TROPICA_PRESET.anchorLat,
      METRO_TROPICA_PRESET.anchorLng,
    );
    const params: SimulationParams = {
      ...DEFAULT_SIMULATION_PARAMS,
      regionId: 'metro_tropica',
      diseaseMode: 'vector_seir_sei',
      budgetRatio: 0.2,
    };

    const output = optimizeResourceAllocation(METRO_TROPICA_PRESET.districts, params, climate);

    expect(output.sennagrid.totalIcuOverflowCost).toBeLessThan(output.reactive.totalIcuOverflowCost);
    expect(output.sennagrid.icuCollapseDays).toBeLessThanOrEqual(output.reactive.icuCollapseDays);
    expect(output.solveTimeMs).toBeLessThan(1500);
    expect(output.sennagrid.hasNaN).toBe(false);
    expect(output.sennagrid.maxMassConservationError).toBeLessThan(1e-9);
    expect(output.gates.overallStatus).toBe('PASS');
    expect(output.gates.passedCount).toBe(5);
    expect(output.gates.readinessScore).toBe(100);
  });

  it('Highland Ring (Direct SEIR) and Monsoon Delta (Vector SEIR-SEI) show clear reactive breaches and PASS gates at 20%', () => {
    const highlandClimate = getFallbackClimateSeries(
      HIGHLAND_RING_PRESET.id,
      HIGHLAND_RING_PRESET.anchorLat,
      HIGHLAND_RING_PRESET.anchorLng,
    );
    const highlandOut = optimizeResourceAllocation(
      HIGHLAND_RING_PRESET.districts,
      {
        ...DEFAULT_SIMULATION_PARAMS,
        regionId: 'highland_ring',
        diseaseMode: 'direct_seir',
        budgetRatio: 0.2,
      },
      highlandClimate,
    );
    expect(highlandOut.reactive.icuCollapseDays).toBeGreaterThan(0);
    expect(highlandOut.sennagrid.icuCollapseDays).toBeLessThan(highlandOut.reactive.icuCollapseDays);
    expect(highlandOut.sennagrid.totalIcuOverflowCost).toBeLessThan(
      highlandOut.reactive.totalIcuOverflowCost,
    );
    expect(highlandOut.gates.overallStatus).toBe('PASS');

    const deltaClimate = getFallbackClimateSeries(
      MONSOON_DELTA_PRESET.id,
      MONSOON_DELTA_PRESET.anchorLat,
      MONSOON_DELTA_PRESET.anchorLng,
    );
    const deltaOut = optimizeResourceAllocation(
      MONSOON_DELTA_PRESET.districts,
      {
        ...DEFAULT_SIMULATION_PARAMS,
        regionId: 'monsoon_delta',
        diseaseMode: 'vector_seir_sei',
        budgetRatio: 0.2,
      },
      deltaClimate,
    );
    expect(deltaOut.reactive.icuCollapseDays).toBeGreaterThan(0);
    expect(deltaOut.sennagrid.totalIcuOverflowCost).toBeLessThan(
      deltaOut.reactive.totalIcuOverflowCost,
    );
    expect(deltaOut.gates.overallStatus).toBe('PASS');
  });

  it('keeps Harbor Corridor west of Tokyo Bay open water and runs valid custom cities across latitudes', () => {
    for (const feature of HARBOR_CORRIDOR_PRESET.featureCollection.features) {
      for (const [lng, lat] of feature.geometry.coordinates[0]!) {
        expect(lng).toBeLessThanOrEqual(139.66);
        expect(lat).toBeGreaterThanOrEqual(35.39);
      }
    }

    const customLondon = buildCustomCityPreset({
      id: 2643743,
      name: 'London',
      country: 'United Kingdom',
      admin1: 'England',
      latitude: 51.5085,
      longitude: -0.1257,
      population: 8961989,
    });
    expect(customLondon.id).toBe('custom_2643743');
    expect(customLondon.defaultDiseaseMode).toBe('direct_seir');
    expect(customLondon.districts).toHaveLength(18);
    expect(customLondon.districts.reduce((acc, d) => acc + d.icuBeds, 0)).toBeGreaterThan(1000);

    const customClimate = getFallbackClimateSeries(
      customLondon.id,
      customLondon.anchorLat,
      customLondon.anchorLng,
    );
    const out = optimizeResourceAllocation(
      customLondon.districts,
      {
        ...DEFAULT_SIMULATION_PARAMS,
        regionId: customLondon.id,
        diseaseMode: customLondon.defaultDiseaseMode,
        budgetRatio: 0.2,
      },
      customClimate,
    );
    expect(out.solveTimeMs).toBeLessThan(1500);
    expect(out.sennagrid.hasNaN).toBe(false);
    expect(out.sennagrid.totalCostJ).toBeLessThan(out.reactive.totalCostJ);
    expect(out.sennagrid.totalIcuOverflowCost).toBeLessThan(out.reactive.totalIcuOverflowCost * 0.7);
    expect(out.sennagrid.icuCollapseDays).toBeLessThan(out.reactive.icuCollapseDays);
    expect(out.gates.overallStatus).toBe('PASS');
  });
});
