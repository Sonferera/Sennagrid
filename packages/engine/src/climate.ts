import type { BuiltInRegionId, ClimateSeries, DailyClimatePoint, RegionId } from './types';

const OPTIMAL_VECTOR_TEMP_C = 29.0;
const THERMAL_SIGMA_C = 6.5;
const MIN_THERMAL_MULTIPLIER = 0.15;
const RAINFALL_BASE = 0.75;
const RAINFALL_SCALE = 0.65;
const RAINFALL_HALF_SAT_MM = 25.0;

export function computeThermalMultiplier(temperatureC: number): number {
  if (!Number.isFinite(temperatureC)) {
    return MIN_THERMAL_MULTIPLIER;
  }
  const delta = temperatureC - OPTIMAL_VECTOR_TEMP_C;
  const exponent = -(delta * delta) / (2 * THERMAL_SIGMA_C * THERMAL_SIGMA_C);
  return Math.max(MIN_THERMAL_MULTIPLIER, Math.exp(exponent));
}

export function computeRainfallMultiplier(rollingRain7dMm: number): number {
  if (!Number.isFinite(rollingRain7dMm) || rollingRain7dMm <= 0) {
    return RAINFALL_BASE;
  }
  return RAINFALL_BASE + RAINFALL_SCALE * (rollingRain7dMm / (rollingRain7dMm + RAINFALL_HALF_SAT_MM));
}

export interface ClimateBuildInput {
  source: ClimateSeries['source'];
  anchorLat: number;
  anchorLng: number;
  pastPrecip7dMm: readonly number[];
  forecastTempsC: readonly number[];
  forecastPrecipMm: readonly number[];
  horizonDays?: number;
  fetchedAtIso?: string;
  tempAmplitudeC?: number;
}

function meanOf(values: readonly number[], fallback: number): number {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      sum += v;
      count++;
    }
  }
  return count > 0 ? sum / count : fallback;
}

export function buildClimateSeriesFromSamples(input: ClimateBuildInput): ClimateSeries {
  const horizonDays = Math.max(1, Math.round(input.horizonDays ?? 91));
  const totalPoints = horizonDays + 1;

  const meanTemp14d = meanOf(input.forecastTempsC, 28.0);
  const meanPrecip14d = Math.max(0, meanOf(input.forecastPrecipMm, 6.0));
  const tempAmplitudeC = input.tempAmplitudeC ?? 1.4;

  // Keep 6 pre-horizon days so day 0 has a complete 7-day rolling rainfall window.
  const preHorizonPrecip: number[] = [];
  const pastSlice = input.pastPrecip7dMm.slice(-6);
  const missingPast = 6 - pastSlice.length;
  for (let i = 0; i < missingPast; i++) {
    preHorizonPrecip.push(meanPrecip14d);
  }
  for (const p of pastSlice) {
    preHorizonPrecip.push(Number.isFinite(p) && p > 0 ? p : 0);
  }

  const dailyTemp: number[] = new Array(totalPoints);
  const dailyPrecip: number[] = new Array(totalPoints);
  const observedLen = Math.min(input.forecastTempsC.length, input.forecastPrecipMm.length);

  for (let day = 0; day < totalPoints; day++) {
    if (day < observedLen) {
      const t = input.forecastTempsC[day]!;
      const p = input.forecastPrecipMm[day]!;
      dailyTemp[day] = Number.isFinite(t) ? t : meanTemp14d;
      dailyPrecip[day] = Number.isFinite(p) && p > 0 ? p : 0;
    } else {
      const offset = day - observedLen;
      const phase = (2 * Math.PI * offset) / horizonDays;
      dailyTemp[day] = meanTemp14d + tempAmplitudeC * Math.sin(phase);
      const rainWave = 1 + 0.35 * Math.sin((2 * Math.PI * offset) / 45);
      dailyPrecip[day] = Math.max(0, meanPrecip14d * rainWave);
    }
  }

  const days: DailyClimatePoint[] = new Array(totalPoints);
  for (let day = 0; day < totalPoints; day++) {
    let rollingRain = 0;
    for (let lag = 0; lag < 7; lag++) {
      const idx = day - lag;
      if (idx >= 0) {
        rollingRain += dailyPrecip[idx]!;
      } else {
        rollingRain += preHorizonPrecip[6 + idx] ?? 0;
      }
    }

    days[day] = {
      day,
      temperatureC: Number(dailyTemp[day]!.toFixed(2)),
      precipitationMm: Number(dailyPrecip[day]!.toFixed(2)),
      rollingRain7dMm: Number(rollingRain.toFixed(2)),
    };
  }

  return {
    source: input.source,
    fetchedAtIso: input.fetchedAtIso ?? new Date().toISOString(),
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    meanTemp14d: Number(meanTemp14d.toFixed(2)),
    meanPrecip14d: Number(meanPrecip14d.toFixed(2)),
    days,
  };
}

interface ClimatologyProfile {
  pastPrecip7dMm: number[];
  forecastTempsC: number[];
  forecastPrecipMm: number[];
  tempAmplitudeC: number;
}

const FALLBACK_CLIMATOLOGY: Record<BuiltInRegionId, ClimatologyProfile> = {
  metro_tropica: {
    pastPrecip7dMm: [8.4, 12.1, 4.5, 16.2, 9.8, 6.4, 11.0],
    forecastTempsC: [
      29.2, 29.5, 28.9, 29.8, 30.1, 29.4, 28.8, 29.1, 29.6, 30.0, 29.7, 29.0, 28.7, 29.3,
    ],
    forecastPrecipMm: [10.5, 14.2, 6.0, 18.4, 12.1, 5.4, 9.2, 15.0, 11.8, 7.6, 4.2, 13.5, 16.1, 8.9],
    tempAmplitudeC: 1.1,
  },
  harbor_corridor: {
    pastPrecip7dMm: [2.1, 0.0, 4.8, 1.5, 0.0, 3.2, 2.4],
    forecastTempsC: [
      18.4, 17.9, 18.8, 19.2, 18.5, 17.6, 17.2, 18.0, 18.6, 19.1, 18.7, 17.8, 17.5, 18.1,
    ],
    forecastPrecipMm: [1.8, 0.0, 5.2, 2.4, 0.0, 0.6, 4.1, 3.5, 0.0, 1.2, 2.8, 6.0, 1.9, 0.4],
    tempAmplitudeC: 2.2,
  },
  highland_ring: {
    pastPrecip7dMm: [4.2, 7.1, 2.0, 5.5, 6.8, 1.4, 3.9],
    forecastTempsC: [
      22.6, 22.1, 23.0, 23.4, 22.8, 21.9, 22.3, 22.9, 23.2, 22.5, 22.0, 22.4, 23.1, 22.6,
    ],
    forecastPrecipMm: [5.1, 8.3, 2.4, 4.0, 9.2, 1.8, 3.1, 6.4, 7.0, 2.2, 1.5, 5.8, 4.4, 3.0],
    tempAmplitudeC: 1.8,
  },
  monsoon_delta: {
    pastPrecip7dMm: [11.2, 15.4, 8.1, 19.6, 13.5, 7.2, 14.8],
    forecastTempsC: [
      30.4, 30.8, 29.9, 31.1, 30.6, 29.7, 30.1, 30.5, 31.0, 30.3, 29.8, 30.2, 30.7, 30.4,
    ],
    forecastPrecipMm: [12.8, 18.2, 9.4, 21.0, 14.6, 6.8, 11.2, 16.4, 15.0, 8.9, 7.1, 17.5, 19.2, 10.6],
    tempAmplitudeC: 1.3,
  },
};

function selectFallbackProfile(regionId: RegionId, anchorLat: number): ClimatologyProfile {
  if (regionId in FALLBACK_CLIMATOLOGY) {
    return FALLBACK_CLIMATOLOGY[regionId as BuiltInRegionId];
  }
  const absLat = Math.abs(anchorLat);
  if (absLat < 23.5) {
    return FALLBACK_CLIMATOLOGY.metro_tropica;
  }
  if (absLat < 34) {
    return {
      pastPrecip7dMm: [3.2, 5.4, 1.1, 4.2, 2.0, 0.5, 3.8],
      forecastTempsC: [
        23.4, 23.8, 22.9, 24.1, 24.5, 23.7, 23.1, 23.5, 24.0, 24.2, 23.6, 23.0, 23.3, 23.8,
      ],
      forecastPrecipMm: [3.0, 6.2, 1.4, 4.8, 2.2, 0.0, 3.6, 4.5, 2.1, 0.8, 3.4, 5.0, 1.9, 2.7],
      tempAmplitudeC: 2.0,
    };
  }
  return FALLBACK_CLIMATOLOGY.harbor_corridor;
}

export function getFallbackClimateSeries(
  regionId: RegionId,
  anchorLat: number,
  anchorLng: number,
  horizonDays = 91,
): ClimateSeries {
  const preset = selectFallbackProfile(regionId, anchorLat);
  return buildClimateSeriesFromSamples({
    source: 'fallback_climatology',
    anchorLat,
    anchorLng,
    pastPrecip7dMm: preset.pastPrecip7dMm,
    forecastTempsC: preset.forecastTempsC,
    forecastPrecipMm: preset.forecastPrecipMm,
    horizonDays,
    tempAmplitudeC: preset.tempAmplitudeC,
  });
}

export interface PrecomputedClimateMultipliers {
  phiT: Float64Array;
  phiR: Float64Array;
}

export function precomputeClimateMultipliers(climate: ClimateSeries): PrecomputedClimateMultipliers {
  const len = climate.days.length;
  const phiT = new Float64Array(len);
  const phiR = new Float64Array(len);

  for (let i = 0; i < len; i++) {
    const day = climate.days[i]!;
    phiT[i] = computeThermalMultiplier(day.temperatureC);
    phiR[i] = computeRainfallMultiplier(day.rollingRain7dMm);
  }

  return { phiT, phiR };
}
