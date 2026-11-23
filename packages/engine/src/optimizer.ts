import { evaluatePolicyGates } from './gates';
import { buildMobilityModel } from './mobility';
import {
  computeDayObjective,
  createInitialState,
  createSolverContext,
  evaluateCostFromWeekCheckpoint,
  projectUnmitigatedGrowth14d,
  simulateFullSchedule,
  stepStateOneDay,
  type SolverContext,
} from './solver';
import {
  EPIDEMIC_CONSTANTS,
  type ClimateSeries,
  type DispatchAssignment,
  type DistrictProperties,
  type MobilityModel,
  type OptimizationOutput,
  type RationaleTag,
  type SimulationParams,
  type SwapTraceEntry,
  type WeeklySchedule,
} from './types';

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function computeWeeklyQuota(districtCount: number, budgetRatio: number): number {
  if (districtCount <= 0) return 0;
  const clampedRatio = Math.max(0.05, Math.min(1, budgetRatio));
  return Math.min(districtCount, Math.max(1, Math.floor(clampedRatio * districtCount)));
}

function cloneSchedule(schedule: WeeklySchedule): WeeklySchedule {
  return schedule.map((week) => new Uint8Array(week));
}

function advanceWeek(
  state: Float64Array,
  weekIdx: number,
  intervention: Uint8Array,
  ctx: SolverContext,
): void {
  const startDay = weekIdx * 7;
  const endDay = Math.min(ctx.horizonDays, startDay + 7);
  for (let day = startDay; day < endDay; day++) {
    stepStateOneDay(state, day, intervention, ctx);
  }
}

export function buildReactiveSchedule(
  initialState: Float64Array,
  quotaK: number,
  ctx: SolverContext,
): WeeklySchedule {
  const { n, stride, weeks, icuRate, icuCapacities } = ctx;
  const state = new Float64Array(initialState);
  const schedule: WeeklySchedule = new Array(weeks);
  const indices = Array.from({ length: n }, (_, i) => i);

  for (let w = 0; w < weeks; w++) {
    indices.sort((a, b) => {
      const infA = state[a * stride + 2]!;
      const infB = state[b * stride + 2]!;
      if (infB !== infA) return infB - infA;
      const stressA = (icuRate * infA) / (icuCapacities[a]! + 1);
      const stressB = (icuRate * infB) / (icuCapacities[b]! + 1);
      if (stressB !== stressA) return stressB - stressA;
      return a - b;
    });

    const u = new Uint8Array(n);
    for (let k = 0; k < quotaK; k++) {
      u[indices[k]!] = 1;
    }
    schedule[w] = u;
    advanceWeek(state, w, u, ctx);
  }

  return schedule;
}

interface SeedProfile {
  susPow: number;
  hubW: number;
  icuW: number;
  overflowBoost: number;
  lookaheadDays: number;
}

const STAGE1_PROFILES: readonly SeedProfile[] = [
  { susPow: 0.5, hubW: 0.85, icuW: 1.5, overflowBoost: 1, lookaheadDays: 14 },
  { susPow: 1.8, hubW: 1.8, icuW: 4.0, overflowBoost: 5, lookaheadDays: 21 },
  { susPow: 2.5, hubW: 2.2, icuW: 10.0, overflowBoost: 12, lookaheadDays: 28 },
  { susPow: 1.0, hubW: 1.2, icuW: 24.0, overflowBoost: 30, lookaheadDays: 28 },
];

function buildPredictiveSeedSchedule(
  initialState: Float64Array,
  quotaK: number,
  mobility: MobilityModel,
  ctx: SolverContext,
  profile: SeedProfile,
): WeeklySchedule {
  const { n, stride, weeks, icuRate, icuCapacities, populations } = ctx;
  const { wIcu } = EPIDEMIC_CONSTANTS.objective;
  const state = new Float64Array(initialState);
  const schedule: WeeklySchedule = new Array(weeks);
  const scores = new Float64Array(n);
  const indices = Array.from({ length: n }, (_, i) => i);

  for (let w = 0; w < weeks; w++) {
    const startDay = w * 7;
    const delta = projectUnmitigatedGrowth14d(state, startDay, ctx, profile.lookaheadDays);

    for (let i = 0; i < n; i++) {
      const S = state[i * stride]!;
      const currentI = state[i * stride + 2]!;
      const susFrac = S / populations[i]!;
      const growth = delta[i]!;
      const projectedH = icuRate * (currentI + growth);
      const cap = icuCapacities[i]!;
      const projectedOverflow = Math.max(0, projectedH - cap);
      const stress = projectedH / (cap + 1);
      const hub = mobility.hubCentrality[i]!;

      scores[i] =
        (growth + 0.15 * currentI + wIcu * profile.overflowBoost * projectedOverflow + 1) *
        Math.pow(Math.max(0.05, susFrac), profile.susPow) *
        (1 + profile.hubW * hub) *
        (1 + (stress > 0.7 ? profile.icuW * stress : 0.35 * stress));
    }

    indices.sort((a, b) => {
      const diff = scores[b]! - scores[a]!;
      return diff !== 0 ? diff : a - b;
    });

    const u = new Uint8Array(n);
    for (let k = 0; k < quotaK; k++) {
      u[indices[k]!] = 1;
    }
    schedule[w] = u;
    advanceWeek(state, w, u, ctx);
  }

  return schedule;
}

function refreshCheckpointsFromWeek(
  fromWeek: number,
  schedule: WeeklySchedule,
  weeklyCheckpoints: Float64Array[],
  prefixCostBeforeWeek: Float64Array,
  prefixOverflowBeforeWeek: Float64Array,
  prefixCollapseDaysBeforeWeek: Int32Array,
  ctx: SolverContext,
): void {
  const { weeks, horizonDays, n } = ctx;
  const state = new Float64Array(weeklyCheckpoints[fromWeek]!);
  const zeroIntervention = new Uint8Array(n);
  let runningCost = prefixCostBeforeWeek[fromWeek]!;
  let runningOverflow = prefixOverflowBeforeWeek[fromWeek]!;
  let runningCollapseDays = prefixCollapseDaysBeforeWeek[fromWeek]!;

  for (let w = fromWeek; w < weeks; w++) {
    weeklyCheckpoints[w] = new Float64Array(state);
    prefixCostBeforeWeek[w] = runningCost;
    prefixOverflowBeforeWeek[w] = runningOverflow;
    prefixCollapseDaysBeforeWeek[w] = runningCollapseDays;

    const startDay = w * 7;
    const endDay = Math.min(horizonDays, startDay + 7);
    const intervention = schedule[w] ?? zeroIntervention;

    for (let day = startDay; day < endDay; day++) {
      const m = computeDayObjective(state, ctx);
      runningCost += m.dayCost;
      runningOverflow += m.dayOverflow;
      if (m.dayOverflow > 1e-6) {
        runningCollapseDays++;
      }
      stepStateOneDay(state, day, intervention, ctx);
    }
  }
}

function classifyRationaleTag(
  icuStress: number,
  hubStrength: number,
  growthRatio: number,
  meanIcuStress: number,
  meanHubStrength: number,
  meanGrowthRatio: number,
): RationaleTag {
  const relIcu = meanIcuStress > 1e-9 ? icuStress / meanIcuStress : 0;
  const relHub = meanHubStrength > 1e-9 ? hubStrength / meanHubStrength : 0;
  const relGrowth = meanGrowthRatio > 1e-9 ? growthRatio / meanGrowthRatio : 0;

  if (icuStress >= 0.7 || (relIcu >= relHub && relIcu >= relGrowth && icuStress >= 0.35)) {
    return 'ICU Capacity Shield';
  }
  if (relHub >= relGrowth || hubStrength >= 0.22) {
    return 'Mobility Hub Containment';
  }
  return 'Pre-emptive Surge Intercept';
}

function buildDispatchAssignments(
  districts: readonly DistrictProperties[],
  schedule: WeeklySchedule,
  weeklyCheckpoints: Float64Array[],
  mobility: MobilityModel,
  ctx: SolverContext,
): DispatchAssignment[] {
  const { n, stride, weeks, icuRate, icuCapacities, mode } = ctx;
  const { lambdaHub, lambdaIcu } = EPIDEMIC_CONSTANTS.optimizer;
  const interventionType: DispatchAssignment['interventionType'] =
    mode === 'vector_seir_sei' ? 'Vector Control / Fogging' : 'Targeted Vaccination';

  const assignments: DispatchAssignment[] = [];

  for (let w = 0; w < weeks; w++) {
    const state = weeklyCheckpoints[w]!;
    const weekRow = schedule[w]!;
    const delta14d = projectUnmitigatedGrowth14d(state, w * 7, ctx, 14);

    let sumIcuStress = 0;
    let sumHub = 0;
    let sumGrowth = 0;
    const icuStressArr = new Float64Array(n);
    const growthRatioArr = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const active = state[i * stride + 2]!;
      const icuLoad = icuRate * active;
      const stress = icuLoad / (icuCapacities[i]! + 1);
      const growthRatio = delta14d[i]! / (active + 1);
      icuStressArr[i] = stress;
      growthRatioArr[i] = growthRatio;
      sumIcuStress += stress;
      sumHub += mobility.hubCentrality[i]!;
      sumGrowth += growthRatio;
    }

    const meanIcu = n > 0 ? sumIcuStress / n : 0;
    const meanHub = n > 0 ? sumHub / n : 0;
    const meanGrowth = n > 0 ? sumGrowth / n : 0;

    const weekEntries: DispatchAssignment[] = [];

    for (let i = 0; i < n; i++) {
      if (weekRow[i] !== 1) continue;
      const district = districts[i]!;
      const active = state[i * stride + 2]!;
      const icuLoad = icuRate * active;
      const stress = icuStressArr[i]!;
      const hub = mobility.hubCentrality[i]!;
      const growthRatio = growthRatioArr[i]!;

      const projectedRiskScore =
        (delta14d[i]! + 0.25 * active) * (1 + lambdaHub * hub) * (1 + lambdaIcu * stress);

      weekEntries.push({
        week: w + 1,
        districtIndex: i,
        districtId: district.id,
        districtName: district.name,
        zoneType: district.zoneType,
        interventionType,
        rationale: classifyRationaleTag(stress, hub, growthRatio, meanIcu, meanHub, meanGrowth),
        projectedRiskScore: Number(projectedRiskScore.toFixed(1)),
        icuLoadAtWeekStart: Number(icuLoad.toFixed(1)),
        icuCapacity: district.icuBeds,
        hubCentrality: Number(hub.toFixed(3)),
      });
    }

    weekEntries.sort((a, b) => b.projectedRiskScore - a.projectedRiskScore);
    assignments.push(...weekEntries);
  }

  return assignments;
}

export function optimizeResourceAllocation(
  districts: readonly DistrictProperties[],
  params: SimulationParams,
  climate: ClimateSeries,
): OptimizationOutput {
  const startedAt = nowMs();
  const n = districts.length;
  const mobility = buildMobilityModel(districts, { outflow: params.mobilityOutflow });
  const ctx = createSolverContext(districts, mobility, climate, params);
  const initialState = createInitialState(districts, ctx);
  const weeklyQuotaK = computeWeeklyQuota(n, params.budgetRatio);

  let totalIcuCapacity = 0;
  for (const d of districts) {
    totalIcuCapacity += d.icuBeds;
  }

  let evaluationsCount = 0;

  // Strategy 1: Reactive baseline (status quo)
  const reactiveSchedule = buildReactiveSchedule(initialState, weeklyQuotaK, ctx);
  const reactiveFull = simulateFullSchedule('reactive', reactiveSchedule, initialState, ctx);
  evaluationsCount++;

  // Hospital safety ceiling: never accept a plan that worsens ICU overflow or collapse days above reactive.
  const maxAllowedOverflow = reactiveFull.result.totalIcuOverflowCost + 1e-6;
  const maxAllowedCollapseDays = reactiveFull.result.icuCollapseDays;

  let bestSchedule = cloneSchedule(reactiveSchedule);
  let bestFull = reactiveFull;

  // Stage 1: Receding-horizon predictive candidate schedules
  for (const profile of STAGE1_PROFILES) {
    const candSched = buildPredictiveSeedSchedule(
      initialState,
      weeklyQuotaK,
      mobility,
      ctx,
      profile,
    );
    const candFull = simulateFullSchedule('sennagrid', candSched, initialState, ctx);
    evaluationsCount++;

    if (
      candFull.result.totalIcuOverflowCost <= maxAllowedOverflow &&
      candFull.result.icuCollapseDays <= maxAllowedCollapseDays &&
      candFull.result.totalCostJ < bestFull.result.totalCostJ
    ) {
      bestSchedule = cloneSchedule(candSched);
      bestFull = candFull;
    }
  }

  let bestCost = bestFull.result.totalCostJ;
  let bestOverflow = bestFull.result.totalIcuOverflowCost;
  const weeklyCheckpoints = bestFull.weeklyCheckpoints.map((s) => new Float64Array(s));
  const prefixCostBeforeWeek = new Float64Array(bestFull.prefixCostBeforeWeek);
  const prefixOverflowBeforeWeek = new Float64Array(bestFull.prefixOverflowBeforeWeek);
  const prefixCollapseDaysBeforeWeek = new Int32Array(bestFull.prefixCollapseDaysBeforeWeek);

  // Stage 2: Checkpointed coordinate descent (2-week sustained block swaps followed by 1-week swaps)
  const { maxSwapEvaluations, timeBudgetMs } = EPIDEMIC_CONSTANTS.optimizer;
  const maxSwapWeek = Math.min(10, ctx.weeks - 1);
  const swapTrace: SwapTraceEntry[] = [];
  let swapEvals = 0;

  if (weeklyQuotaK > 0 && weeklyQuotaK < n) {
    const blockLengths = [2, 1];

    for (const blockLen of blockLengths) {
      for (let w = 0; w <= maxSwapWeek - (blockLen - 1); w++) {
        if (swapEvals >= maxSwapEvaluations || nowMs() - startedAt >= timeBudgetMs) {
          break;
        }

        const weekRow = bestSchedule[w]!;
        const stateAtWeek = weeklyCheckpoints[w]!;
        const delta21 = projectUnmitigatedGrowth14d(stateAtWeek, w * 7, ctx, 21);
        const treated: number[] = [];
        const untreated: number[] = [];

        for (let i = 0; i < n; i++) {
          if (weekRow[i] === 1) treated.push(i);
          else untreated.push(i);
        }

        const priorityScore = (idx: number): number => {
          const active = stateAtWeek[idx * ctx.stride + 2]!;
          const growth = delta21[idx]!;
          const projectedH = ctx.icuRate * (active + growth);
          const cap = ctx.icuCapacities[idx]!;
          const projOverflow = Math.max(0, projectedH - cap);
          const icuStress = projectedH / (cap + 1);
          const hub = mobility.hubCentrality[idx]!;
          return (
            (10 * EPIDEMIC_CONSTANTS.objective.wIcu * projOverflow + growth + 0.25 * active + 1) *
            (1 + 1.8 * hub) *
            (1 + 2.2 * icuStress)
          );
        };

        treated.sort((a, b) => priorityScore(a) - priorityScore(b));
        untreated.sort((a, b) => priorityScore(b) - priorityScore(a));

        const maxTreatedToTest = Math.min(treated.length, 3);
        const maxUntreatedToTest = Math.min(untreated.length, blockLen === 2 ? 6 : 7);

        for (let ti = 0; ti < maxTreatedToTest; ti++) {
          const dOut = treated[ti]!;
          let swappedThisOut = false;

          for (let ui = 0; ui < maxUntreatedToTest; ui++) {
            if (swapEvals >= maxSwapEvaluations || nowMs() - startedAt >= timeBudgetMs) {
              break;
            }

            const dIn = untreated[ui]!;
            let blockFeasible = true;
            for (let b = 0; b < blockLen; b++) {
              const rw = bestSchedule[w + b]!;
              if (rw[dOut] !== 1 || rw[dIn] !== 0) {
                blockFeasible = false;
                break;
              }
            }
            if (!blockFeasible) continue;

            for (let b = 0; b < blockLen; b++) {
              bestSchedule[w + b]![dOut] = 0;
              bestSchedule[w + b]![dIn] = 1;
            }

            const cand = evaluateCostFromWeekCheckpoint(
              w,
              weeklyCheckpoints[w]!,
              prefixCostBeforeWeek[w]!,
              prefixOverflowBeforeWeek[w]!,
              prefixCollapseDaysBeforeWeek[w]!,
              bestSchedule,
              ctx,
            );
            swapEvals++;
            evaluationsCount++;

            if (
              cand.totalOverflow <= maxAllowedOverflow &&
              cand.collapseDays <= maxAllowedCollapseDays &&
              cand.totalCostJ < bestCost - 1e-6
            ) {
              const costBefore = bestCost;
              const overflowBefore = bestOverflow;
              bestCost = cand.totalCostJ;
              bestOverflow = cand.totalOverflow;
              swappedThisOut = true;

              swapTrace.push({
                iteration: evaluationsCount,
                week: w + 1,
                removedDistrictId: districts[dOut]!.id,
                removedDistrictName: districts[dOut]!.name,
                addedDistrictId: districts[dIn]!.id,
                addedDistrictName: districts[dIn]!.name,
                costBefore: Number(costBefore.toFixed(1)),
                costAfter: Number(bestCost.toFixed(1)),
                costDelta: Number((costBefore - bestCost).toFixed(1)),
                overflowSaved: Number(Math.max(0, overflowBefore - bestOverflow).toFixed(1)),
              });

              refreshCheckpointsFromWeek(
                w,
                bestSchedule,
                weeklyCheckpoints,
                prefixCostBeforeWeek,
                prefixOverflowBeforeWeek,
                prefixCollapseDaysBeforeWeek,
                ctx,
              );
              break;
            } else {
              for (let b = 0; b < blockLen; b++) {
                bestSchedule[w + b]![dOut] = 1;
                bestSchedule[w + b]![dIn] = 0;
              }
            }
          }

          if (swappedThisOut) {
            break;
          }
        }
      }
    }
  }

  const finalFull = simulateFullSchedule('sennagrid', bestSchedule, initialState, ctx);
  const hubCentralityArr = Array.from(mobility.hubCentrality);
  const assignments = buildDispatchAssignments(
    districts,
    bestSchedule,
    finalFull.weeklyCheckpoints,
    mobility,
    ctx,
  );
  const gates = evaluatePolicyGates({
    reactive: reactiveFull.result,
    sennagrid: finalFull.result,
    hubCentrality: hubCentralityArr,
    weeklyQuotaK,
  });

  const improvementPct =
    reactiveFull.result.totalCostJ > 0
      ? ((reactiveFull.result.totalCostJ - finalFull.result.totalCostJ) /
          reactiveFull.result.totalCostJ) *
        100
      : 0;

  const solveTimeMs = Number((nowMs() - startedAt).toFixed(1));

  return {
    params,
    climate,
    districts: [...districts],
    hubCentrality: hubCentralityArr,
    totalIcuCapacity,
    weeklyQuotaK,
    reactive: reactiveFull.result,
    sennagrid: finalFull.result,
    assignments,
    swapTrace,
    gates,
    evaluationsCount,
    solveTimeMs,
    improvementPct: Number(improvementPct.toFixed(2)),
  };
}
