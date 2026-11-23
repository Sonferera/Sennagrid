import { describe, expect, it } from 'vitest';
import { buildMobilityModel, getMobilityWeight, haversineDistanceKm } from '../mobility';
import type { DistrictProperties } from '../types';

const SAMPLE_DISTRICTS: DistrictProperties[] = [
  {
    id: 'd-core',
    name: 'Central Basin',
    population: 220_000,
    icuBeds: 55,
    centroid: [106.8456, -6.2088],
    initialCases: 90,
    zoneType: 'core',
  },
  {
    id: 'd-hub',
    name: 'North Transit Hub',
    population: 180_000,
    icuBeds: 30,
    centroid: [106.8656, -6.1688],
    initialCases: 70,
    zoneType: 'transit_hub',
  },
  {
    id: 'd-res',
    name: 'East Residential',
    population: 160_000,
    icuBeds: 18,
    centroid: [106.9156, -6.2288],
    initialCases: 30,
    zoneType: 'residential',
  },
  {
    id: 'd-peri',
    name: 'South Peri-Urban',
    population: 95_000,
    icuBeds: 12,
    centroid: [106.7956, -6.3088],
    initialCases: 10,
    zoneType: 'peri_urban',
  },
];

describe('mobility engine', () => {
  it('computes symmetric Haversine distances accurately', () => {
    const a: [number, number] = [106.8456, -6.2088];
    const b: [number, number] = [106.8456, -6.1188]; // ~0.09 deg latitude ≈ 10.0 km

    expect(haversineDistanceKm(a, a)).toBe(0);
    const ab = haversineDistanceKm(a, b);
    const ba = haversineDistanceKm(b, a);
    expect(ab).toBeCloseTo(ba, 12);
    expect(ab).toBeGreaterThan(9.9);
    expect(ab).toBeLessThan(10.1);
  });

  it('produces a row-stochastic gravity matrix W with exact diagonal retention', () => {
    const outflow = 0.18;
    const model = buildMobilityModel(SAMPLE_DISTRICTS, { outflow });
    const { n } = model;

    expect(n).toBe(SAMPLE_DISTRICTS.length);

    for (let i = 0; i < n; i++) {
      expect(getMobilityWeight(model, i, i)).toBeCloseTo(1 - outflow, 12);

      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        const w = getMobilityWeight(model, i, j);
        expect(Number.isFinite(w)).toBe(true);
        expect(w).toBeGreaterThanOrEqual(0);
        rowSum += w;
      }
      expect(rowSum).toBeCloseTo(1.0, 12);
    }
  });

  it('assigns higher commuter coupling to closer and more populous districts', () => {
    const model = buildMobilityModel(SAMPLE_DISTRICTS);
    const coreToHub = getMobilityWeight(model, 0, 1);
    const coreToPeri = getMobilityWeight(model, 0, 3);

    expect(coreToHub).toBeGreaterThan(coreToPeri);
    for (let i = 0; i < model.n; i++) {
      expect(model.hubCentrality[i]).toBeGreaterThan(0);
    }
  });

  it('handles degenerate single-district input cleanly', () => {
    const single = buildMobilityModel([SAMPLE_DISTRICTS[0]!]);
    expect(single.n).toBe(1);
    expect(getMobilityWeight(single, 0, 0)).toBe(1);
    expect(single.hubCentrality[0]).toBe(0);
  });
});
