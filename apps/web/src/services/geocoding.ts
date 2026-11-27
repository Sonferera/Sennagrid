export interface CitySearchResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  population: number;
}

interface OpenMeteoGeocodingEntry {
  id?: unknown;
  name?: unknown;
  country?: unknown;
  country_code?: unknown;
  admin1?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  population?: unknown;
}

interface OpenMeteoGeocodingPayload {
  results?: OpenMeteoGeocodingEntry[];
}

const GEOCODING_TIMEOUT_MS = 3000;

export function buildOpenMeteoGeocodingUrl(query: string, count = 6): string {
  const safeCount = Math.max(1, Math.min(10, Math.round(count)));
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(safeCount),
    language: 'en',
    format: 'json',
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
}

export function parseOpenMeteoGeocodingResponse(
  payload: OpenMeteoGeocodingPayload | null | undefined,
): CitySearchResult[] {
  const rawResults = payload?.results;
  if (!Array.isArray(rawResults)) {
    return [];
  }

  const parsed: CitySearchResult[] = [];
  const seenKeys = new Set<string>();

  for (const item of rawResults) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'number' && Number.isFinite(item.id) ? Math.round(item.id) : null;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const lat =
      typeof item.latitude === 'number' && Number.isFinite(item.latitude) ? item.latitude : null;
    const lng =
      typeof item.longitude === 'number' && Number.isFinite(item.longitude) ? item.longitude : null;

    if (
      id === null ||
      !name ||
      lat === null ||
      lng === null ||
      lat < -85 ||
      lat > 85 ||
      lng < -180 ||
      lng > 180
    ) {
      continue;
    }

    const country =
      typeof item.country === 'string' && item.country.trim().length > 0
        ? item.country.trim()
        : typeof item.country_code === 'string' && item.country_code.trim().length > 0
          ? item.country_code.trim()
          : 'Unknown';

    const admin1 =
      typeof item.admin1 === 'string' && item.admin1.trim().length > 0
        ? item.admin1.trim()
        : undefined;

    const population =
      typeof item.population === 'number' && Number.isFinite(item.population) && item.population > 0
        ? Math.round(item.population)
        : 0;

    const dedupeKey = `${name.toLowerCase()}|${(admin1 ?? '').toLowerCase()}|${country.toLowerCase()}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    parsed.push({
      id,
      name,
      country,
      admin1,
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      population,
    });
  }

  return parsed;
}

export async function searchCities(
  query: string,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    count?: number;
  } = {},
): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('City search is unavailable in this environment.');
  }

  const timeoutMs = options.timeoutMs ?? GEOCODING_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = buildOpenMeteoGeocodingUrl(trimmed, options.count ?? 6);
    const res = await fetchFn(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Geocoding HTTP ${res.status}`);
    }

    const json = (await res.json()) as OpenMeteoGeocodingPayload;
    return parseOpenMeteoGeocodingResponse(json);
  } finally {
    clearTimeout(timer);
  }
}
