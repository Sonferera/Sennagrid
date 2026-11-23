import type { ClimateSeries, DailyClimatePoint, RegionId } from './types';

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

const FALLBACK_CLIMATOLOGY: Record<
  RegionId,
  {
    pastPrecip7dMm: number[];
    forecastTempsC: number[];
    forecastPrecipMm: number[];
    tempAmplitudeC: number;
  }
> = {
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
};

export function getFallbackClimateSeries(
  regionId: RegionId,
  anchorLat: number,
  anchorLng: number,
  horizonDays = 91,
): ClimateSeries {
  const preset = FALLBACK_CLIMATOLOGY[regionId];
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
