import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SIMULATION_PARAMS,
  getFallbackClimateSeries,
  optimizeResourceAllocation,
} from '@sennagrid/engine';
import { METRO_TROPICA_PRESET } from '../../data/regions';
import { generateDispatchCsv, generateFullRunJson } from '../export';
import { clearWeatherCache, fetchRegionClimate, parseOpenMeteoResponse } from '../weather';

describe('weather and export services', () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  it('parses valid Open-Meteo 21-day payload (7 past + 14 forecast) into 92 daily points', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          daily: {
            temperature_2m_mean: Array.from({ length: 21 }, (_, idx) => 28.5 + (idx % 3) * 0.4),
            precipitation_sum: Array.from({ length: 21 }, (_, idx) => (idx % 2 === 0 ? 12.0 : 4.0)),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const climate = await fetchRegionClimate('metro_tropica', { fetchImpl: mockFetch });

    expect(climate.source).toBe('open_meteo');
    expect(climate.days).toHaveLength(92);
    expect(climate.meanTemp14d).toBeGreaterThan(28);
  });

  it('falls back silently to deterministic climatology on network error or malformed payload', async () => {
    const failingFetch: typeof fetch = async () => {
      throw new Error('Network unreachable');
    };

    const fallback = await fetchRegionClimate('harbor_corridor', { fetchImpl: failingFetch });
    expect(fallback.source).toBe('fallback_climatology');
    expect(fallback.days).toHaveLength(92);

    expect(parseOpenMeteoResponse({ daily: { temperature_2m_mean: [28] } }, 0, 0)).toBeNull();
  });

  it('generates valid operational CSV and serializable JSON run exports', () => {
    const climate = getFallbackClimateSeries(
      METRO_TROPICA_PRESET.id,
      METRO_TROPICA_PRESET.anchorLat,
      METRO_TROPICA_PRESET.anchorLng,
    );
    const output = optimizeResourceAllocation(
      METRO_TROPICA_PRESET.districts,
      DEFAULT_SIMULATION_PARAMS,
      climate,
    );

    const csv = generateDispatchCsv(output);
    const csvLines = csv.split('\r\n');
    expect(csvLines[0]).toContain('Week,District ID,District Name');
    expect(csvLines.length).toBe(1 + output.assignments.length);

    const jsonStr = generateFullRunJson(output);
    const parsed = JSON.parse(jsonStr) as {
      product: string;
      assignments: unknown[];
      dailyCurves: { reactiveActive: number[]; sennagridActive: number[] };
    };
    expect(parsed.product).toBe('SennaGrid');
    expect(parsed.assignments.length).toBe(output.assignments.length);
    expect(parsed.dailyCurves.reactiveActive).toHaveLength(92);
    expect(parsed.dailyCurves.sennagridActive).toHaveLength(92);
  });
});
