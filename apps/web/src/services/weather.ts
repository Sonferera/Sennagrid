import {
  buildClimateSeriesFromSamples,
  getFallbackClimateSeries,
  type ClimateSeries,
  type RegionId,
} from '@sennagrid/engine';
import { getRegionPreset } from '../data/regions';

const OPEN_METEO_TIMEOUT_MS = 3000;

interface OpenMeteoDailyPayload {
  daily?: {
    temperature_2m_mean?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
}

const sessionCache = new Map<string, ClimateSeries>();

export function buildOpenMeteoUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    daily: 'temperature_2m_mean,precipitation_sum',
    past_days: '7',
    forecast_days: '14',
    timezone: 'auto',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function parseOpenMeteoResponse(
  payload: OpenMeteoDailyPayload,
  anchorLat: number,
  anchorLng: number,
  horizonDays = 91,
): ClimateSeries | null {
  const temps = payload.daily?.temperature_2m_mean;
  const precips = payload.daily?.precipitation_sum;
  if (!Array.isArray(temps) || !Array.isArray(precips) || temps.length < 14 || precips.length < 14) {
    return null;
  }

  const sanitizedTemps = temps.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN));
  const sanitizedPrecips = precips.map((v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0,
  );

  // Open-Meteo returns past_days=7 followed by forecast_days=14 (21 points total).
  const pastCount = Math.min(7, Math.max(0, sanitizedPrecips.length - 14));
  const pastPrecip7dMm = sanitizedPrecips.slice(0, pastCount);
  const forecastTempsC = sanitizedTemps.slice(pastCount, pastCount + 14);
  const forecastPrecipMm = sanitizedPrecips.slice(pastCount, pastCount + 14);

  if (forecastTempsC.filter(Number.isFinite).length < 7) {
    return null;
  }

  return buildClimateSeriesFromSamples({
    source: 'open_meteo',
    anchorLat,
    anchorLng,
    pastPrecip7dMm,
    forecastTempsC,
    forecastPrecipMm,
    horizonDays,
  });
}

export function clearWeatherCache(): void {
  sessionCache.clear();
}

export async function fetchRegionClimate(
  regionId: RegionId,
  options: {
    anchorLat?: number;
    anchorLng?: number;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    bypassCache?: boolean;
  } = {},
): Promise<ClimateSeries> {
  if (!options.bypassCache) {
    const cached = sessionCache.get(regionId);
    if (cached) {
      return cached;
    }
  }

  const preset = getRegionPreset(regionId);
  const anchorLat =
    typeof options.anchorLat === 'number' && Number.isFinite(options.anchorLat)
      ? options.anchorLat
      : preset.anchorLat;
  const anchorLng =
    typeof options.anchorLng === 'number' && Number.isFinite(options.anchorLng)
      ? options.anchorLng
      : preset.anchorLng;

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? OPEN_METEO_TIMEOUT_MS;

  if (typeof fetchFn !== 'function') {
    const fallback = getFallbackClimateSeries(regionId, anchorLat, anchorLng);
    sessionCache.set(regionId, fallback);
    return fallback;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = buildOpenMeteoUrl(anchorLat, anchorLng);
    const res = await fetchFn(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = (await res.json()) as OpenMeteoDailyPayload;
    const parsed = parseOpenMeteoResponse(json, anchorLat, anchorLng);
    if (!parsed) {
      throw new Error('Malformed Open-Meteo daily arrays');
    }

    sessionCache.set(regionId, parsed);
    return parsed;
  } catch {
    const fallback = getFallbackClimateSeries(regionId, anchorLat, anchorLng);
    sessionCache.set(regionId, fallback);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
