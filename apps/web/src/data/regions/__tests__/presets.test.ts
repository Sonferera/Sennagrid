import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMULATION_PARAMS,
  getFallbackClimateSeries,
  optimizeResourceAllocation,
  type DiseaseMode,
  type SimulationParams,
} from '@sennagrid/engine';
import { HARBOR_CORRIDOR_PRESET, METRO_TROPICA_PRESET, REGION_PRESET_LIST } from '../index';

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
  });

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
});
