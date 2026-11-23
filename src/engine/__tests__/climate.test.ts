import { describe, expect, it } from 'vitest';
import {
  buildClimateSeriesFromSamples,
  computeRainfallMultiplier,
  computeThermalMultiplier,
  getFallbackClimateSeries,
  precomputeClimateMultipliers,
} from '../climate';

describe('climate modulation engine', () => {
  it('peaks thermal multiplier at 29C and respects lower floor 0.15', () => {
    expect(computeThermalMultiplier(29)).toBeCloseTo(1.0, 12);
    expect(computeThermalMultiplier(25)).toBeLessThan(1.0);
    expect(computeThermalMultiplier(33)).toBeCloseTo(computeThermalMultiplier(25), 12);
    expect(computeThermalMultiplier(5)).toBe(0.15);
    expect(computeThermalMultiplier(Number.NaN)).toBe(0.15);
  });

  it('computes bounded monotonic rainfall multiplier', () => {
    expect(computeRainfallMultiplier(0)).toBeCloseTo(0.75, 12);
    expect(computeRainfallMultiplier(-10)).toBeCloseTo(0.75, 12);
    expect(computeRainfallMultiplier(25)).toBeCloseTo(0.75 + 0.65 * 0.5, 12);
    expect(computeRainfallMultiplier(100)).toBeGreaterThan(computeRainfallMultiplier(25));
    expect(computeRainfallMultiplier(10_000)).toBeLessThan(1.401);
  });

  it('extends 14-day observations smoothly across 92 daily points (day 0..91)', () => {
    const series = buildClimateSeriesFromSamples({
      source: 'open_meteo',
      anchorLat: -6.2088,
      anchorLng: 106.8456,
      pastPrecip7dMm: [10, 10, 10, 10, 10, 10, 10],
      forecastTempsC: Array.from({ length: 14 }, () => 29.0),
      forecastPrecipMm: Array.from({ length: 14 }, () => 5.0),
    });

    expect(series.days).toHaveLength(92);
    expect(series.days[0]?.day).toBe(0);
    expect(series.days[91]?.day).toBe(91);
    // Day 0 rolling sum = 6 pre-horizon days (60mm) + day 0 (5mm) = 65mm.
    expect(series.days[0]?.rollingRain7dMm).toBeCloseTo(65, 5);
    // Day 6 rolling sum = 7 days of 5mm = 35mm.
    expect(series.days[6]?.rollingRain7dMm).toBeCloseTo(35, 5);

    for (const point of series.days) {
      expect(Number.isFinite(point.temperatureC)).toBe(true);
      expect(Number.isFinite(point.precipitationMm)).toBe(true);
      expect(point.precipitationMm).toBeGreaterThanOrEqual(0);
      expect(point.rollingRain7dMm).toBeGreaterThanOrEqual(0);
    }
  });

  it('provides deterministic fallback climatology and precomputed Float64Array multipliers', () => {
    const tropical = getFallbackClimateSeries('metro_tropica', -6.2088, 106.8456);
    const coastal = getFallbackClimateSeries('harbor_corridor', 35.4437, 139.638);

    expect(tropical.source).toBe('fallback_climatology');
    expect(tropical.days).toHaveLength(92);
    expect(coastal.days).toHaveLength(92);
    expect(tropical.meanTemp14d).toBeGreaterThan(coastal.meanTemp14d);

    const { phiT, phiR } = precomputeClimateMultipliers(tropical);
    expect(phiT).toBeInstanceOf(Float64Array);
    expect(phiR).toBeInstanceOf(Float64Array);
    expect(phiT.length).toBe(92);
    expect(phiR.length).toBe(92);

    for (let i = 0; i < 92; i++) {
      expect(phiT[i]).toBeGreaterThanOrEqual(0.15);
      expect(phiT[i]).toBeLessThanOrEqual(1.0);
      expect(phiR[i]).toBeGreaterThanOrEqual(0.75);
      expect(phiR[i]).toBeLessThan(1.41);
    }
  });
});
