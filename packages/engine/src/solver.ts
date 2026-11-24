import { precomputeClimateMultipliers, type PrecomputedClimateMultipliers } from './climate';
import {
  EPIDEMIC_CONSTANTS,
  type ClimateSeries,
  type DiseaseMode,
  type DistrictProperties,
  type MobilityModel,
  type SimulationParams,
  type StrategyName,
  type StrategySimulationResult,
  type WeeklySchedule,
} from './types';

export function getStateStride(mode: DiseaseMode): number {
  return mode === 'vector_seir_sei' ? 7 : 4;
}

export interface SolverContext {
  n: number;
  stride: number;
  mode: DiseaseMode;
  horizonDays: number;
  weeks: number;
  dt: number;
  substepsPerDay: number;
  icuRate: number;
  populations: Float64Array;
  icuCapacities: Float64Array;
  effectivePresentPop: Float64Array;
  weights: Float64Array;
  climateMultipliers: PrecomputedClimateMultipliers;
  // Reusable scratch buffers to keep Stage 2 local search allocation-free
  k1: Float64Array;
  k2: Float64Array;
  k3: Float64Array;
  k4: Float64Array;
  tmp: Float64Array;
  vecHazard: Float64Array;
  presentInfected: Float64Array;
  infFraction: Float64Array;
  interventionEfficacy: number;
}

export function createSolverContext(
  districts: readonly DistrictProperties[],
  mobility: MobilityModel,
  climate: ClimateSeries,
  params: SimulationParams,
): SolverContext {
  const n = districts.length;
  const stride = getStateStride(params.diseaseMode);
  const stateLen = n * stride;
  const populations = new Float64Array(n);
  const icuCapacities = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    populations[i] = Math.max(1, districts[i]!.population);
    icuCapacities[i] = Math.max(0, districts[i]!.icuBeds);
  }

  const icuRate = Number.isFinite(params.icuRate) && params.icuRate >= 0 ? params.icuRate : 0;

  const modeDefault = params.diseaseMode === 'vector_seir_sei'
    ? EPIDEMIC_CONSTANTS.vector.etaVec
    : EPIDEMIC_CONSTANTS.direct.etaInt;
  const requestedEfficacy = params.interventionEfficacy;
  const interventionEfficacy = requestedEfficacy === undefined || !Number.isFinite(requestedEfficacy)
    ? modeDefault
    : Math.max(0, Math.min(1, requestedEfficacy));

  // Denominator of lambda_{v,i}: sum_k W_{ki} * N_k is constant in time.
  const effectivePresentPop = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) {
      sum += mobility.weights[k * n + i]! * populations[k]!;
    }
    effectivePresentPop[i] = sum > 0 ? sum : populations[i]!;
  }

  const substepsPerDay = Math.max(1, Math.round(1 / params.dt));
  const dt = 1 / substepsPerDay;
  const weeks = Math.ceil(params.horizonDays / 7);

  return {
    n,
    stride,
    mode: params.diseaseMode,
    horizonDays: params.horizonDays,
    weeks,
    dt,
    substepsPerDay,
    icuRate,
    populations,
    icuCapacities,
    effectivePresentPop,
    weights: mobility.weights,
    climateMultipliers: precomputeClimateMultipliers(climate),
    k1: new Float64Array(stateLen),
    k2: new Float64Array(stateLen),
    k3: new Float64Array(stateLen),
    k4: new Float64Array(stateLen),
    tmp: new Float64Array(stateLen),
    vecHazard: new Float64Array(n),
    presentInfected: new Float64Array(n),
    infFraction: new Float64Array(n),
    interventionEfficacy,
  };
}

export function createInitialState(
  districts: readonly DistrictProperties[],
  ctx: SolverContext,
): Float64Array {
  const { n, stride, mode, populations, weights, effectivePresentPop, climateMultipliers } = ctx;
  const state = new Float64Array(n * stride);

  for (let i = 0; i < n; i++) {
    const pop = populations[i]!;
    const initI = Math.max(0, Math.min(pop, districts[i]!.initialCases));
    const initE = Math.min(pop - initI, Math.round(0.6 * initI));
    const initS = pop - initI - initE;
    const base = i * stride;
    state[base] = initS;
    state[base + 1] = initE;
    state[base + 2] = initI;
    state[base + 3] = 0;
  }

  if (mode === 'vector_seir_sei') {
    const { b0, betaHv, sigmaV, muV } = EPIDEMIC_CONSTANTS.vector;
    const phiT0 = climateMultipliers.phiT[0] ?? 1;

    for (let i = 0; i < n; i++) {
      let exposedInfected = 0;
      for (let k = 0; k < n; k++) {
        exposedInfected += weights[k * n + i]! * state[k * stride + 2]!;
      }

      const base = i * stride;
      if (exposedInfected > 0) {
        // Linear quasi-equilibrium of the SEI vector equations scaled to early outbreak onset.
        const lambdaV0 = b0 * phiT0 * betaHv * (exposedInfected / effectivePresentPop[i]!);
        const evEq = lambdaV0 / (sigmaV + muV + lambdaV0);
        const ivEq = (sigmaV / muV) * evEq;
        const ev0 = Math.min(0.05, 0.75 * evEq);
        const iv0 = Math.min(0.04, 0.65 * ivEq);
        state[base + 4] = 1 - ev0 - iv0;
        state[base + 5] = ev0;
        state[base + 6] = iv0;
      } else {
        state[base + 4] = 1;
        state[base + 5] = 0;
        state[base + 6] = 0;
      }
    }
  }

  return state;
}

function evaluateDerivatives(
  state: Float64Array,
  out: Float64Array,
  dayIdx: number,
  intervention: Uint8Array,
  ctx: SolverContext,
): void {
  const { n, stride, mode, weights, populations, effectivePresentPop, climateMultipliers } = ctx;

  if (mode === 'vector_seir_sei') {
    const { b0, betaVh, betaHv, m0, sigmaH, gammaH, sigmaV, muV } =
      EPIDEMIC_CONSTANTS.vector;
    const clampedDay = Math.min(climateMultipliers.phiT.length - 1, Math.max(0, dayIdx));
    const phiT = climateMultipliers.phiT[clampedDay]!;
    const phiR = climateMultipliers.phiR[clampedDay]!;
    const bitingRate = b0 * phiT;
    const baseVecDensity = m0 * phiR;

    const { interventionEfficacy, vecHazard, presentInfected } = ctx;
    presentInfected.fill(0);

    for (let j = 0; j < n; j++) {
      const base = j * stride;
      const u = intervention[j] ?? 0;
      const mEff = baseVecDensity * (1 - interventionEfficacy * u);
      vecHazard[j] = bitingRate * betaVh * mEff * state[base + 6]!;
      const infJ = state[base + 2]!;
      if (infJ > 0) {
        const rowOffset = j * n;
        for (let i = 0; i < n; i++) {
          presentInfected[i] = presentInfected[i]! + weights[rowOffset + i]! * infJ;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const base = i * stride;
      const rowOffset = i * n;
      let lambdaH = 0;
      for (let j = 0; j < n; j++) {
        lambdaH += weights[rowOffset + j]! * vecHazard[j]!;
      }

      const lambdaV = bitingRate * betaHv * (presentInfected[i]! / effectivePresentPop[i]!);

      const S = state[base]!;
      const E = state[base + 1]!;
      const I = state[base + 2]!;
      const sv = state[base + 4]!;
      const ev = state[base + 5]!;
      const iv = state[base + 6]!;

      const newExposedH = lambdaH * S;
      const newInfectedH = sigmaH * E;
      const newRecoveredH = gammaH * I;

      out[base] = -newExposedH;
      out[base + 1] = newExposedH - newInfectedH;
      out[base + 2] = newInfectedH - newRecoveredH;
      out[base + 3] = newRecoveredH;

      const newExposedV = lambdaV * sv;
      out[base + 4] = muV * (1 - sv) - newExposedV;
      out[base + 5] = newExposedV - (sigmaV + muV) * ev;
      out[base + 6] = sigmaV * ev - muV * iv;
    }
  } else {
    const { beta0, sigmaH, gammaH } = EPIDEMIC_CONSTANTS.direct;
    const { infFraction, interventionEfficacy } = ctx;

    for (let j = 0; j < n; j++) {
      infFraction[j] = state[j * stride + 2]! / populations[j]!;
    }

    for (let i = 0; i < n; i++) {
      const base = i * stride;
      const rowOffset = i * n;
      let weightedPrev = 0;
      for (let j = 0; j < n; j++) {
        weightedPrev += weights[rowOffset + j]! * infFraction[j]!;
      }

      const u = intervention[i] ?? 0;
      const lambdaH = beta0 * (1 - interventionEfficacy * u) * weightedPrev;

      const S = state[base]!;
      const E = state[base + 1]!;
      const I = state[base + 2]!;

      const newExposed = lambdaH * S;
      const newInfected = sigmaH * E;
      const newRecovered = gammaH * I;

      out[base] = -newExposed;
      out[base + 1] = newExposed - newInfected;
      out[base + 2] = newInfected - newRecovered;
      out[base + 3] = newRecovered;
    }
  }
}

export function stepStateOneDay(
  state: Float64Array,
  dayIdx: number,
  intervention: Uint8Array,
  ctx: SolverContext,
): { maxConservationError: number; hasNaN: boolean } {
  const { dt, substepsPerDay, k1, k2, k3, k4, tmp, n, stride, mode, populations } = ctx;
  const len = state.length;
  const halfDt = dt * 0.5;
  const sixthDt = dt / 6;

  for (let s = 0; s < substepsPerDay; s++) {
    evaluateDerivatives(state, k1, dayIdx, intervention, ctx);

    for (let idx = 0; idx < len; idx++) {
      tmp[idx] = state[idx]! + halfDt * k1[idx]!;
    }
    evaluateDerivatives(tmp, k2, dayIdx, intervention, ctx);

    for (let idx = 0; idx < len; idx++) {
      tmp[idx] = state[idx]! + halfDt * k2[idx]!;
    }
    evaluateDerivatives(tmp, k3, dayIdx, intervention, ctx);

    for (let idx = 0; idx < len; idx++) {
      tmp[idx] = state[idx]! + dt * k3[idx]!;
    }
    evaluateDerivatives(tmp, k4, dayIdx, intervention, ctx);

    for (let idx = 0; idx < len; idx++) {
      state[idx] = state[idx]! + sixthDt * (k1[idx]! + 2 * k2[idx]! + 2 * k3[idx]! + k4[idx]!);
    }

    // Clamp negative overshoots while preserving exact compartment sums.
    for (let i = 0; i < n; i++) {
      const base = i * stride;
      let clampedHuman = false;
      for (let c = 0; c < 4; c++) {
        if (state[base + c]! < 0) {
          state[base + c] = 0;
          clampedHuman = true;
        }
      }
      if (clampedHuman) {
        const sumH = state[base]! + state[base + 1]! + state[base + 2]! + state[base + 3]!;
        if (sumH > 0) {
          const scale = populations[i]! / sumH;
          state[base] = state[base]! * scale;
          state[base + 1] = state[base + 1]! * scale;
          state[base + 2] = state[base + 2]! * scale;
          state[base + 3] = state[base + 3]! * scale;
        }
      }

      if (mode === 'vector_seir_sei') {
        let clampedVec = false;
        for (let c = 4; c < 7; c++) {
          if (state[base + c]! < 0) {
            state[base + c] = 0;
            clampedVec = true;
          }
        }
        if (clampedVec) {
          const sumV = state[base + 4]! + state[base + 5]! + state[base + 6]!;
          if (sumV > 0) {
            const inv = 1 / sumV;
            state[base + 4] = state[base + 4]! * inv;
            state[base + 5] = state[base + 5]! * inv;
            state[base + 6] = state[base + 6]! * inv;
          } else {
            state[base + 4] = 1;
            state[base + 5] = 0;
            state[base + 6] = 0;
          }
        }
      }
    }
  }

  let maxConservationError = 0;
  let hasNaN = false;

  for (let i = 0; i < n; i++) {
    const base = i * stride;
    for (let c = 0; c < stride; c++) {
      if (!Number.isFinite(state[base + c]!)) {
        hasNaN = true;
      }
    }
    const sumH = state[base]! + state[base + 1]! + state[base + 2]! + state[base + 3]!;
    const relErr = Math.abs(sumH - populations[i]!) / populations[i]!;
    if (relErr > maxConservationError) {
      maxConservationError = relErr;
    }
  }

  return { maxConservationError, hasNaN };
}

export function computeDayObjective(
  state: Float64Array,
  ctx: SolverContext,
): { dayActive: number; dayIcuDemand: number; dayOverflow: number; dayCost: number } {
  const { n, stride, icuRate, icuCapacities } = ctx;
  const { wIcu, wInf } = EPIDEMIC_CONSTANTS.objective;

  let dayActive = 0;
  let dayIcuDemand = 0;
  let dayOverflow = 0;

  for (let i = 0; i < n; i++) {
    const active = state[i * stride + 2]!;
    const icuDemand = icuRate * active;
    const overflow = icuDemand > icuCapacities[i]! ? icuDemand - icuCapacities[i]! : 0;
    dayActive += active;
    dayIcuDemand += icuDemand;
    dayOverflow += overflow;
  }

  return {
    dayActive,
    dayIcuDemand,
    dayOverflow,
    dayCost: wIcu * dayOverflow + wInf * dayActive,
  };
}

export interface FullSimulationWithCheckpoints {
  result: StrategySimulationResult;
  weeklyCheckpoints: Float64Array[]; // state snapshot at start of each week (day = 7w)
  prefixCostBeforeWeek: Float64Array; // sum of daily costs strictly before day 7w
  prefixOverflowBeforeWeek: Float64Array;
  prefixCollapseDaysBeforeWeek: Int32Array;
}

export function simulateFullSchedule(
  name: StrategyName,
  schedule: WeeklySchedule,
  initialState: Float64Array,
  ctx: SolverContext,
): FullSimulationWithCheckpoints {
  const { n, stride, horizonDays, weeks, icuRate, populations } = ctx;
  const totalDays = horizonDays + 1;
  const state = new Float64Array(initialState);

  const dailyTotalActive = new Array<number>(totalDays);
  const dailyTotalIcuDemand = new Array<number>(totalDays);
  const dailyCityOverflow = new Array<number>(totalDays);
  const districtActive = new Float64Array(totalDays * n);
  const districtIcuDemand = new Float64Array(totalDays * n);

  const weeklyCheckpoints = new Array<Float64Array>(weeks);
  const prefixCostBeforeWeek = new Float64Array(weeks);
  const prefixOverflowBeforeWeek = new Float64Array(weeks);
  const prefixCollapseDaysBeforeWeek = new Int32Array(weeks);

  let totalCostJ = 0;
  let totalIcuOverflowCost = 0;
  let totalInfectionDays = 0;
  let peakActiveInfections = 0;
  let peakIcuDemand = 0;
  let peakIcuOverflow = 0;
  let icuCollapseDays = 0;
  let maxMassConservationError = 0;
  let hasNaN = false;

  const zeroIntervention = new Uint8Array(n);

  for (let day = 0; day <= horizonDays; day++) {
    if (day % 7 === 0) {
      const weekIdx = Math.floor(day / 7);
      if (weekIdx < weeks) {
        weeklyCheckpoints[weekIdx] = new Float64Array(state);
        prefixCostBeforeWeek[weekIdx] = totalCostJ;
        prefixOverflowBeforeWeek[weekIdx] = totalIcuOverflowCost;
        prefixCollapseDaysBeforeWeek[weekIdx] = icuCollapseDays;
      }
    }

    const metrics = computeDayObjective(state, ctx);
    dailyTotalActive[day] = metrics.dayActive;
    dailyTotalIcuDemand[day] = metrics.dayIcuDemand;
    dailyCityOverflow[day] = metrics.dayOverflow;

    const rowBase = day * n;
    for (let i = 0; i < n; i++) {
      const active = state[i * stride + 2]!;
      districtActive[rowBase + i] = active;
      districtIcuDemand[rowBase + i] = icuRate * active;
    }

    totalCostJ += metrics.dayCost;
    totalIcuOverflowCost += metrics.dayOverflow;
    totalInfectionDays += metrics.dayActive;

    if (metrics.dayActive > peakActiveInfections) peakActiveInfections = metrics.dayActive;
    if (metrics.dayIcuDemand > peakIcuDemand) peakIcuDemand = metrics.dayIcuDemand;
    if (metrics.dayOverflow > peakIcuOverflow) peakIcuOverflow = metrics.dayOverflow;
    if (metrics.dayOverflow > 1e-6) icuCollapseDays++;

    if (day < horizonDays) {
      const weekIdx = Math.min(weeks - 1, Math.floor(day / 7));
      const intervention = schedule[weekIdx] ?? zeroIntervention;
      const stepCheck = stepStateOneDay(state, day, intervention, ctx);
      if (stepCheck.maxConservationError > maxMassConservationError) {
        maxMassConservationError = stepCheck.maxConservationError;
      }
      if (stepCheck.hasNaN) {
        hasNaN = true;
      }
    }
  }

  let cumulativeCases = 0;
  for (let i = 0; i < n; i++) {
    cumulativeCases += Math.max(0, populations[i]! - state[i * stride]!);
  }

  const plainSchedule: number[][] = schedule.map((weekArr) => Array.from(weekArr));

  return {
    result: {
      name,
      schedule: plainSchedule,
      totalCostJ,
      totalIcuOverflowCost,
      totalInfectionDays,
      cumulativeCases,
      peakActiveInfections,
      peakIcuDemand,
      peakIcuOverflow,
      icuCollapseDays,
      maxMassConservationError,
      hasNaN,
      dailyTotalActive,
      dailyTotalIcuDemand,
      dailyCityOverflow,
      districtActive,
      districtIcuDemand,
    },
    weeklyCheckpoints,
    prefixCostBeforeWeek,
    prefixOverflowBeforeWeek,
    prefixCollapseDaysBeforeWeek,
  };
}

/**
 * Evaluates total objective cost from a cached week checkpoint without
 * recomputing days [0 .. 7*startWeek - 1].
 */
export function evaluateCostFromWeekCheckpoint(
  startWeek: number,
  checkpointState: Float64Array,
  prefixCost: number,
  prefixOverflow: number,
  prefixCollapseDays: number,
  schedule: WeeklySchedule,
  ctx: SolverContext,
): { totalCostJ: number; totalOverflow: number; collapseDays: number } {
  const { horizonDays, weeks, n } = ctx;
  const startDay = startWeek * 7;
  const state = new Float64Array(checkpointState);
  const zeroIntervention = new Uint8Array(n);

  let totalCostJ = prefixCost;
  let totalOverflow = prefixOverflow;
  let collapseDays = prefixCollapseDays;

  for (let day = startDay; day <= horizonDays; day++) {
    const metrics = computeDayObjective(state, ctx);
    totalCostJ += metrics.dayCost;
    totalOverflow += metrics.dayOverflow;
    if (metrics.dayOverflow > 1e-6) {
      collapseDays++;
    }

    if (day < horizonDays) {
      const weekIdx = Math.min(weeks - 1, Math.floor(day / 7));
      const intervention = schedule[weekIdx] ?? zeroIntervention;
      stepStateOneDay(state, day, intervention, ctx);
    }
  }

  return { totalCostJ, totalOverflow, collapseDays };
}

/**
 * Projects unmitigated 14-day infection growth from an arbitrary state snapshot
 * for receding-horizon risk scoring.
 */
export function projectUnmitigatedGrowth14d(
  startState: Float64Array,
  startDay: number,
  ctx: SolverContext,
  lookaheadDays = 14,
): Float64Array {
  const { n, stride, horizonDays } = ctx;
  const state = new Float64Array(startState);
  const zeroIntervention = new Uint8Array(n);
  const endDay = Math.min(horizonDays, startDay + lookaheadDays);

  for (let day = startDay; day < endDay; day++) {
    stepStateOneDay(state, day, zeroIntervention, ctx);
  }

  const delta = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const startActive = startState[i * stride + 2]!;
    const endActive = state[i * stride + 2]!;
    delta[i] = Math.max(0, endActive - startActive);
  }

  return delta;
}
