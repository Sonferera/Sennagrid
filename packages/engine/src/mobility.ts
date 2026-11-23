import type { DistrictProperties, MobilityModel, MobilityOptions } from './types';

const EARTH_RADIUS_KM = 6371.0;
const DEG_TO_RAD = Math.PI / 180;

const DEFAULT_OUTFLOW = 0.18;
const DEFAULT_ALPHA = 0.6;
const DEFAULT_BETA = 0.6;
const DEFAULT_GAMMA = 1.5;
const DEFAULT_D0_KM = 2.0;

export function haversineDistanceKm(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  if (lng1 === lng2 && lat1 === lat2) {
    return 0;
  }

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const h =
    sinHalfLat * sinHalfLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinHalfLng * sinHalfLng;
  const clampedH = h < 0 ? 0 : h > 1 ? 1 : h;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(clampedH));
}

export function buildMobilityModel(
  districts: readonly DistrictProperties[],
  options: MobilityOptions = {},
): MobilityModel {
  const n = districts.length;
  const distancesKm = new Float64Array(n * n);
  const weights = new Float64Array(n * n);
  const hubCentrality = new Float64Array(n);

  if (n === 0) {
    return { n, distancesKm, weights, hubCentrality };
  }

  if (n === 1) {
    weights[0] = 1;
    hubCentrality[0] = 0;
    return { n, distancesKm, weights, hubCentrality };
  }

  const rawOutflow = options.outflow ?? DEFAULT_OUTFLOW;
  const outflow = Math.max(0, Math.min(1, rawOutflow));
  const alpha = options.alpha ?? DEFAULT_ALPHA;
  const beta = options.beta ?? DEFAULT_BETA;
  const gamma = options.gamma ?? DEFAULT_GAMMA;
  const d0Km = Math.max(1e-6, options.d0Km ?? DEFAULT_D0_KM);

  const popAlpha = new Float64Array(n);
  const popBeta = new Float64Array(n);
  let totalPop = 0;

  for (let i = 0; i < n; i++) {
    const pop = Math.max(0, districts[i]!.population);
    totalPop += pop;
    popAlpha[i] = Math.pow(pop, alpha);
    popBeta[i] = Math.pow(pop, beta);
  }

  const meanPop = totalPop > 0 ? totalPop / n : 1;

  for (let i = 0; i < n; i++) {
    const ci = districts[i]!.centroid;
    for (let j = i + 1; j < n; j++) {
      const dist = haversineDistanceKm(ci, districts[j]!.centroid);
      distancesKm[i * n + j] = dist;
      distancesKm[j * n + i] = dist;
    }
  }

  const rowGravity = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    const pAlpha = popAlpha[i]!;

    for (let j = 0; j < n; j++) {
      if (i === j) {
        rowGravity[j] = 0;
        continue;
      }
      const dist = distancesKm[i * n + j]!;
      const g = (pAlpha * popBeta[j]!) / Math.pow(dist + d0Km, gamma);
      rowGravity[j] = g;
      rowSum += g;
    }

    if (rowSum <= 0) {
      weights[i * n + i] = 1;
      continue;
    }

    weights[i * n + i] = 1 - outflow;
    const invRowSum = outflow / rowSum;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      weights[i * n + j] = rowGravity[j]! * invRowSum;
    }
  }

  // Incoming population-weighted commuter flow into district i (column sum excluding diagonal).
  for (let i = 0; i < n; i++) {
    let inflowCentrality = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      inflowCentrality += weights[j * n + i]! * (Math.max(0, districts[j]!.population) / meanPop);
    }
    hubCentrality[i] = inflowCentrality;
  }

  return { n, distancesKm, weights, hubCentrality };
}

export function getMobilityWeight(model: MobilityModel, fromIdx: number, toIdx: number): number {
  return model.weights[fromIdx * model.n + toIdx] ?? 0;
}
