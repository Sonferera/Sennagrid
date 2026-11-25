import {
  buildMobilityModel,
  type DailyClimatePoint,
  type DispatchAssignment,
  type DistrictImpactSummary,
  type DistrictProperties,
  type OptimizationOutput,
  type RationaleTag,
  type SwapTraceEntry,
  type ZoneType,
} from '@sennagrid/engine';

export type MetricTone = 'positive' | 'tradeoff' | 'neutral';

export interface KpiViewModel {
  collapse: {
    reactiveDays: number;
    optimizedDays: number;
    savedDays: number;
    badgeText: string;
    tone: MetricTone;
  };
  icuOverflow: {
    reactivePeakBeds: number;
    optimizedPeakBeds: number;
    peakBedsPrevented: number;
    reactiveTotalBedDays: number;
    optimizedTotalBedDays: number;
    totalBedDaysReductionPct: number | null;
    tone: MetricTone;
  };
  casesImpact: {
    label: 'Cases Averted' | 'Mild-Case Trade-off';
    isTradeoff: boolean;
    casesAverted: number;
    casesAvertedPct: number;
    reactiveCumulative: number;
    optimizedCumulative: number;
    signedHeadline: string;
    signedPctLabel: string;
    contextNote: string;
    tone: MetricTone;
  };
  readiness: {
    costReductionPct: number;
    evaluationsCount: number;
    solveTimeMs: number;
    gateStatus: OptimizationOutput['gates']['overallStatus'];
    passedCount: number;
    totalGates: number;
    readinessScore: number;
  };
}

export interface ExecutiveNarrative {
  headline: string;
  detail: string;
  tone: MetricTone;
}

export interface TimelineMeta {
  day: number;
  maxDay: number;
  totalDaysCount: number;
  weekIndex: number;
  weekNumber: number;
  totalWeeks: number;
  isTerminalDay: boolean;
  weekLabel: string;
  climatePoint: DailyClimatePoint | null;
}

export interface StrategyDistrictDayState {
  activeInfections: number;
  icuDemand: number;
  stress: number;
  overflowBeds: number;
  treated: boolean;
}

export interface DistrictDaySnapshot {
  district: DistrictProperties;
  districtIndex: number;
  shortCode: string;
  hubCentrality: number;
  isTopQuartileHub: boolean;
  day: number;
  weekNumber: number;
  reactive: StrategyDistrictDayState;
  sennagrid: StrategyDistrictDayState;
  impact: DistrictImpactSummary | null;
}

export interface DistrictWatchlistEntry {
  district: DistrictProperties;
  shortCode: string;
  hubCentrality: number;
  isTopQuartileHub: boolean;
  reactiveStressNow: number;
  sennagridStressNow: number;
  reactiveTreatedNow: boolean;
  sennagridTreatedNow: boolean;
  reactivePeakStress: number;
  optimizedPeakStress: number;
  peakOverflowSavedBeds: number;
  interventionWeeks: number;
}

export interface CommuterCorridorArc {
  id: string;
  from: [number, number];
  to: [number, number];
  strength: number; // normalized 0..1
}

export interface DailyChartPoint {
  day: number;
  week: number;
  reactiveActive: number;
  sennagridActive: number;
  reactiveIcu: number;
  sennagridIcu: number;
  reactiveOverflow: number;
  sennagridOverflow: number;
  totalIcuCapacity: number;
}

export interface RadarChartDatum {
  key: keyof OptimizationOutput['impactRadar'];
  axis: string;
  score: number;
  description: string;
}

export interface DispatchFilterState {
  week: 'all' | number;
  zoneType: 'all' | ZoneType;
  rationale: 'all' | RationaleTag;
  search: string;
}

export interface SwapTraceSummary {
  totalSwaps: number;
  passesCompleted: number;
  totalOverflowSavedBedDays: number;
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatFixed(value: number, decimals = 1): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatZoneLabel(zone: ZoneType): string {
  switch (zone) {
    case 'core':
      return 'Medical Core';
    case 'transit_hub':
      return 'Transit Hub';
    case 'residential':
      return 'Residential';
    case 'peri_urban':
      return 'Peri-Urban';
  }
}

export function buildDistrictShortCode(district: DistrictProperties, index: number): string {
  const words = district.name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase();
    return `${initials}${String(index + 1).padStart(2, '0')}`;
  }
  return `${(words[0] ?? 'WD').slice(0, 2).toUpperCase()}${String(index + 1).padStart(2, '0')}`;
}

export function computeDistrictStress(icuDemand: number, icuBeds: number): number {
  if (!Number.isFinite(icuDemand) || !Number.isFinite(icuBeds) || icuBeds <= 0) {
    return 0;
  }
  return Math.max(0, icuDemand / icuBeds);
}

export function classifyStressBand(stress: number): 'safe' | 'strained' | 'overflow' {
  if (stress >= 1.0) return 'overflow';
  if (stress >= 0.6) return 'strained';
  return 'safe';
}

export function buildExecutiveNarrative(output: OptimizationOutput): ExecutiveNarrative {
  const { impactSummary, reactive, sennagrid, weeklyQuotaK, districts } = output;
  const quotaPhrase = `${weeklyQuotaK} of ${districts.length} districts per week`;

  if (impactSummary.collapseDaysSaved > 0 && sennagrid.icuCollapseDays === 0) {
    return {
      headline: `Eliminated all ${reactive.icuCollapseDays} hospital collapse days using the same ${quotaPhrase} capacity.`,
      detail: `Reactive Baseline suffered ${formatFixed(reactive.totalIcuOverflowCost, 1)} ICU overflow bed-days chasing current case counts. SennaGrid reduced ICU overflow to 0.0 bed-days by pre-emptively containing mobility hubs and low-bed wards.`,
      tone: 'positive',
    };
  }

  if (reactive.totalIcuOverflowCost > sennagrid.totalIcuOverflowCost + 0.1) {
    const pctSaved =
      reactive.totalIcuOverflowCost > 0
        ? ((reactive.totalIcuOverflowCost - sennagrid.totalIcuOverflowCost) /
            reactive.totalIcuOverflowCost) *
          100
        : 0;
    return {
      headline: `Cut cumulative ICU overflow by ${pctSaved.toFixed(1)}% (${formatFixed(reactive.totalIcuOverflowCost, 1)} down to ${formatFixed(sennagrid.totalIcuOverflowCost, 1)} bed-days) at identical budget.`,
      detail: `Under ${quotaPhrase} capacity, predictive multi-pass scheduling lowered peak hospital overflow by ${formatFixed(impactSummary.peakIcuOverflowPrevented, 1)} beds compared with Reactive Baseline.`,
      tone: 'positive',
    };
  }

  if (impactSummary.casesAverted > 0) {
    return {
      headline: `Averted ${formatInt(impactSummary.casesAverted)} cumulative infections (${impactSummary.casesAvertedPct.toFixed(1)}% reduction) with zero ICU breaches.`,
      detail: `Both strategies remained within local ICU bed capacity across the 91-day horizon, while SennaGrid intercepted transmission earlier along commuter corridors (${quotaPhrase}).`,
      tone: 'positive',
    };
  }

  return {
    headline: `Reduced composite epidemic cost by ${impactSummary.costReductionPct.toFixed(2)}% within the ${quotaPhrase} operational quota.`,
    detail: `Deterministic 13-week schedule verified across ${output.gates.passedCount}/${output.gates.totalGates} Policy Gates in ${output.solveTimeMs} ms.`,
    tone: 'neutral',
  };
}

export function buildKpiViewModel(output: OptimizationOutput): KpiViewModel {
  const { impactSummary, reactive, sennagrid, gates } = output;

  const savedDays = impactSummary.collapseDaysSaved;
  let collapseBadgeText = '0 breaches in both';
  let collapseTone: MetricTone = 'neutral';
  if (savedDays > 0) {
    collapseBadgeText = `${savedDays} ${savedDays === 1 ? 'day' : 'days'} saved`;
    collapseTone = 'positive';
  } else if (reactive.icuCollapseDays > 0 && savedDays === 0) {
    collapseBadgeText = 'Parity with baseline';
    collapseTone = 'neutral';
  } else if (savedDays < 0) {
    collapseBadgeText = `${Math.abs(savedDays)} additional days`;
    collapseTone = 'tradeoff';
  }

  const reactiveTotalBedDays = reactive.totalIcuOverflowCost;
  const optimizedTotalBedDays = sennagrid.totalIcuOverflowCost;
  const totalBedDaysReductionPct =
    reactiveTotalBedDays > 1e-6
      ? ((reactiveTotalBedDays - optimizedTotalBedDays) / reactiveTotalBedDays) * 100
      : null;

  const peakBedsPrevented = impactSummary.peakIcuOverflowPrevented;
  const icuTone: MetricTone =
    peakBedsPrevented > 0 || (totalBedDaysReductionPct !== null && totalBedDaysReductionPct > 0)
      ? 'positive'
      : 'neutral';

  const isTradeoff = impactSummary.casesAverted < 0;
  const absCases = Math.abs(impactSummary.casesAverted);
  const absPct = Math.abs(impactSummary.casesAvertedPct);

  const casesImpact: KpiViewModel['casesImpact'] = isTradeoff
    ? {
        label: 'Mild-Case Trade-off',
        isTradeoff: true,
        casesAverted: impactSummary.casesAverted,
        casesAvertedPct: impactSummary.casesAvertedPct,
        reactiveCumulative: reactive.cumulativeCases,
        optimizedCumulative: sennagrid.cumulativeCases,
        signedHeadline: `+${formatInt(absCases)} cases`,
        signedPctLabel: `+${absPct.toFixed(2)}%`,
        contextNote: 'Accepted minor mild-case drift to prioritize protecting scarce ICU beds.',
        tone: 'tradeoff',
      }
    : {
        label: 'Cases Averted',
        isTradeoff: false,
        casesAverted: impactSummary.casesAverted,
        casesAvertedPct: impactSummary.casesAvertedPct,
        reactiveCumulative: reactive.cumulativeCases,
        optimizedCumulative: sennagrid.cumulativeCases,
        signedHeadline: formatInt(absCases),
        signedPctLabel: `${absPct.toFixed(2)}% fewer`,
        contextNote: 'Cumulative infections prevented under the exact same weekly budget.',
        tone: impactSummary.casesAverted > 0 ? 'positive' : 'neutral',
      };

  return {
    collapse: {
      reactiveDays: reactive.icuCollapseDays,
      optimizedDays: sennagrid.icuCollapseDays,
      savedDays,
      badgeText: collapseBadgeText,
      tone: collapseTone,
    },
    icuOverflow: {
      reactivePeakBeds: reactive.peakIcuOverflow,
      optimizedPeakBeds: sennagrid.peakIcuOverflow,
      peakBedsPrevented,
      reactiveTotalBedDays,
      optimizedTotalBedDays,
      totalBedDaysReductionPct,
      tone: icuTone,
    },
    casesImpact,
    readiness: {
      costReductionPct: impactSummary.costReductionPct,
      evaluationsCount: output.evaluationsCount,
      solveTimeMs: output.solveTimeMs,
      gateStatus: gates.overallStatus,
      passedCount: gates.passedCount,
      totalGates: gates.totalGates,
      readinessScore: gates.readinessScore,
    },
  };
}

export function getTimelineMeta(output: OptimizationOutput, rawDay: number): TimelineMeta {
  const totalDaysCount = Math.max(1, output.reactive.dailyTotalActive.length);
  const maxDay = totalDaysCount - 1;
  const day = Math.max(0, Math.min(maxDay, Math.round(rawDay)));
  const totalWeeks = Math.max(1, output.sennagrid.schedule.length);
  const weekIndex = Math.min(totalWeeks - 1, Math.floor(day / 7));
  const weekNumber = weekIndex + 1;
  const isTerminalDay = day === maxDay;
  const weekLabel = isTerminalDay
    ? `End of Week ${totalWeeks}`
    : `Week ${weekNumber} of ${totalWeeks}`;
  const climatePoint =
    output.climate.days[day] ?? output.climate.days[output.climate.days.length - 1] ?? null;

  return {
    day,
    maxDay,
    totalDaysCount,
    weekIndex,
    weekNumber,
    totalWeeks,
    isTerminalDay,
    weekLabel,
    climatePoint,
  };
}

/**
 * Returns the engine-derived Reactive peak ICU demand day (tie-breaking on highest overflow).
 */
export function findReactivePeakIcuDay(output: OptimizationOutput): number {
  const demands = output.reactive.dailyTotalIcuDemand;
  const overflows = output.reactive.dailyCityOverflow;
  if (demands.length === 0) return 0;

  let bestDay = 0;
  let bestDemand = demands[0] ?? 0;
  let bestOverflow = overflows[0] ?? 0;

  for (let d = 1; d < demands.length; d++) {
    const demand = demands[d] ?? 0;
    const overflow = overflows[d] ?? 0;
    if (demand > bestDemand || (demand === bestDemand && overflow > bestOverflow)) {
      bestDay = d;
      bestDemand = demand;
      bestOverflow = overflow;
    }
  }

  return bestDay;
}

/**
 * Returns the day where Reactive local ICU overflow peaks (if any breach occurs),
 * falling back to Reactive peak city-wide ICU demand day.
 */
export function findCrisisFocusDay(output: OptimizationOutput): number {
  const overflows = output.reactive.dailyCityOverflow;
  let bestOverflowDay = -1;
  let bestOverflow = 1e-6;

  for (let d = 0; d < overflows.length; d++) {
    const ov = overflows[d] ?? 0;
    if (ov > bestOverflow) {
      bestOverflow = ov;
      bestOverflowDay = d;
    }
  }

  return bestOverflowDay >= 0 ? bestOverflowDay : findReactivePeakIcuDay(output);
}

export function getTopQuartileHubThreshold(hubCentrality: readonly number[]): number {
  if (hubCentrality.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...hubCentrality].sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.25));
  return sorted[topCount - 1] ?? Number.POSITIVE_INFINITY;
}

export function getDistrictSnapshotAtDay(
  output: OptimizationOutput,
  districtId: string,
  rawDay: number,
): DistrictDaySnapshot | null {
  const districtIndex = output.districts.findIndex((d) => d.id === districtId);
  if (districtIndex < 0) return null;

  const district = output.districts[districtIndex];
  if (!district) return null;

  const n = output.districts.length;
  const meta = getTimelineMeta(output, rawDay);
  const flatIdx = meta.day * n + districtIndex;

  const reactiveActive = output.reactive.districtActive[flatIdx] ?? 0;
  const reactiveIcu = output.reactive.districtIcuDemand[flatIdx] ?? 0;
  const reactiveTreated = (output.reactive.schedule[meta.weekIndex]?.[districtIndex] ?? 0) === 1;

  const optActive = output.sennagrid.districtActive[flatIdx] ?? 0;
  const optIcu = output.sennagrid.districtIcuDemand[flatIdx] ?? 0;
  const optTreated = (output.sennagrid.schedule[meta.weekIndex]?.[districtIndex] ?? 0) === 1;

  const hubCentrality = output.hubCentrality[districtIndex] ?? 0;
  const hubThreshold = getTopQuartileHubThreshold(output.hubCentrality);
  const impact =
    output.impactSummary.districtImpacts[districtIndex] ??
    output.impactSummary.districtImpacts.find((entry) => entry.districtId === district.id) ??
    null;

  return {
    district,
    districtIndex,
    shortCode: buildDistrictShortCode(district, districtIndex),
    hubCentrality,
    isTopQuartileHub: hubCentrality >= hubThreshold,
    day: meta.day,
    weekNumber: meta.weekNumber,
    reactive: {
      activeInfections: reactiveActive,
      icuDemand: reactiveIcu,
      stress: computeDistrictStress(reactiveIcu, district.icuBeds),
      overflowBeds: Math.max(0, reactiveIcu - district.icuBeds),
      treated: reactiveTreated,
    },
    sennagrid: {
      activeInfections: optActive,
      icuDemand: optIcu,
      stress: computeDistrictStress(optIcu, district.icuBeds),
      overflowBeds: Math.max(0, optIcu - district.icuBeds),
      treated: optTreated,
    },
    impact,
  };
}

export function buildDistrictWatchlist(
  output: OptimizationOutput,
  rawDay: number,
): DistrictWatchlistEntry[] {
  const meta = getTimelineMeta(output, rawDay);
  const n = output.districts.length;
  const hubThreshold = getTopQuartileHubThreshold(output.hubCentrality);

  const entries: DistrictWatchlistEntry[] = output.districts.map((district, i) => {
    const flatIdx = meta.day * n + i;
    const rIcu = output.reactive.districtIcuDemand[flatIdx] ?? 0;
    const sIcu = output.sennagrid.districtIcuDemand[flatIdx] ?? 0;
    const impact = output.impactSummary.districtImpacts[i];
    const rPeakIcu = impact?.reactivePeakIcuDemand ?? rIcu;
    const sPeakIcu = impact?.optimizedPeakIcuDemand ?? sIcu;
    const hub = output.hubCentrality[i] ?? 0;

    return {
      district,
      shortCode: buildDistrictShortCode(district, i),
      hubCentrality: hub,
      isTopQuartileHub: hub >= hubThreshold,
      reactiveStressNow: computeDistrictStress(rIcu, district.icuBeds),
      sennagridStressNow: computeDistrictStress(sIcu, district.icuBeds),
      reactiveTreatedNow: (output.reactive.schedule[meta.weekIndex]?.[i] ?? 0) === 1,
      sennagridTreatedNow: (output.sennagrid.schedule[meta.weekIndex]?.[i] ?? 0) === 1,
      reactivePeakStress: computeDistrictStress(rPeakIcu, district.icuBeds),
      optimizedPeakStress: computeDistrictStress(sPeakIcu, district.icuBeds),
      peakOverflowSavedBeds: Math.max(
        0,
        (impact?.reactivePeakIcuOverflow ?? 0) - (impact?.optimizedPeakIcuOverflow ?? 0),
      ),
      interventionWeeks: impact?.interventionWeeks ?? 0,
    };
  });

  return entries.sort((a, b) => {
    if (b.reactivePeakStress !== a.reactivePeakStress) {
      return b.reactivePeakStress - a.reactivePeakStress;
    }
    return b.hubCentrality - a.hubCentrality;
  });
}

export function getDispatchedDistrictsForWeek(
  output: OptimizationOutput,
  strategy: 'reactive' | 'sennagrid',
  weekIndex: number,
): Array<{ id: string; name: string; shortCode: string }> {
  const row =
    strategy === 'reactive'
      ? output.reactive.schedule[weekIndex]
      : output.sennagrid.schedule[weekIndex];
  if (!row) return [];

  const result: Array<{ id: string; name: string; shortCode: string }> = [];
  for (let i = 0; i < output.districts.length; i++) {
    if (row[i] === 1) {
      const d = output.districts[i];
      if (d) {
        result.push({
          id: d.id,
          name: d.name,
          shortCode: buildDistrictShortCode(d, i),
        });
      }
    }
  }
  return result;
}

/**
 * Extracts the top symmetric commuter coupling corridors from the engine's gravity matrix
 * so users can visualize cross-district transmission bridges on the map.
 */
export function buildTopCommuterCorridors(
  output: OptimizationOutput,
  maxCorridors = 18,
): CommuterCorridorArc[] {
  const { districts, params } = output;
  const n = districts.length;
  if (n < 2 || params.mobilityOutflow <= 0) return [];

  const mobility = buildMobilityModel(districts, { outflow: params.mobilityOutflow });
  const rawPairs: Array<{ i: number; j: number; flow: number }> = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const flowIJ = (mobility.weights[i * n + j] ?? 0) * districts[i]!.population;
      const flowJI = (mobility.weights[j * n + i] ?? 0) * districts[j]!.population;
      rawPairs.push({ i, j, flow: flowIJ + flowJI });
    }
  }

  rawPairs.sort((a, b) => b.flow - a.flow);
  const top = rawPairs.slice(0, maxCorridors);
  const maxFlow = top[0]?.flow ?? 1;

  return top.map((pair) => {
    const dA = districts[pair.i]!;
    const dB = districts[pair.j]!;
    return {
      id: `${dA.id}-${dB.id}`,
      from: dA.centroid,
      to: dB.centroid,
      strength: maxFlow > 0 ? pair.flow / maxFlow : 0.5,
    };
  });
}

export function buildDailyChartSeries(output: OptimizationOutput): DailyChartPoint[] {
  const days = output.reactive.dailyTotalActive.length;
  const totalWeeks = Math.max(1, output.sennagrid.schedule.length);
  const series: DailyChartPoint[] = new Array(days);

  for (let d = 0; d < days; d++) {
    series[d] = {
      day: d,
      week: Math.min(totalWeeks, Math.floor(d / 7) + 1),
      reactiveActive: Math.round(output.reactive.dailyTotalActive[d] ?? 0),
      sennagridActive: Math.round(output.sennagrid.dailyTotalActive[d] ?? 0),
      reactiveIcu: Number((output.reactive.dailyTotalIcuDemand[d] ?? 0).toFixed(1)),
      sennagridIcu: Number((output.sennagrid.dailyTotalIcuDemand[d] ?? 0).toFixed(1)),
      reactiveOverflow: Number((output.reactive.dailyCityOverflow[d] ?? 0).toFixed(1)),
      sennagridOverflow: Number((output.sennagrid.dailyCityOverflow[d] ?? 0).toFixed(1)),
      totalIcuCapacity: output.totalIcuCapacity,
    };
  }

  return series;
}

export function buildRadarSeries(output: OptimizationOutput): RadarChartDatum[] {
  const r = output.impactRadar;
  return [
    {
      key: 'collapsePrevention',
      axis: 'Collapse Prevention',
      score: r.collapsePrevention,
      description: 'Relative reduction in hospital collapse days vs Reactive Baseline (0 to 100).',
    },
    {
      key: 'peakIcuSafety',
      axis: 'Peak ICU Safety',
      score: r.peakIcuSafety,
      description: 'Relative peak ICU overflow reduction vs Reactive Baseline (0 to 100).',
    },
    {
      key: 'hubContainment',
      axis: 'Hub Containment',
      score: r.hubContainment,
      description: 'Share of top-quartile mobility hubs intervened during Weeks 1 to 4 (0 to 100).',
    },
    {
      key: 'budgetEfficiency',
      axis: 'Cost Efficiency',
      score: r.budgetEfficiency,
      description: 'Relative composite objective cost reduction vs Reactive Baseline (0 to 100).',
    },
    {
      key: 'casesControl',
      axis: 'Cases Control',
      score: r.casesControl,
      description: 'Relative cumulative case reduction vs Reactive Baseline (0 to 100).',
    },
  ];
}

export function filterDispatchAssignments(
  assignments: readonly DispatchAssignment[],
  filters: DispatchFilterState,
): DispatchAssignment[] {
  const needle = filters.search.trim().toLowerCase();
  return assignments.filter((entry) => {
    if (filters.week !== 'all' && entry.week !== filters.week) return false;
    if (filters.zoneType !== 'all' && entry.zoneType !== filters.zoneType) return false;
    if (filters.rationale !== 'all' && entry.rationale !== filters.rationale) return false;
    if (needle.length > 0) {
      const hay = `${entry.districtName} ${entry.districtId}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function summarizeSwapTrace(swapTrace: readonly SwapTraceEntry[]): SwapTraceSummary {
  let passesCompleted = 0;
  let totalOverflowSavedBedDays = 0;

  for (const entry of swapTrace) {
    if (entry.pass > passesCompleted) {
      passesCompleted = entry.pass;
    }
    totalOverflowSavedBedDays += Math.max(0, entry.overflowDelta);
  }

  return {
    totalSwaps: swapTrace.length,
    passesCompleted,
    totalOverflowSavedBedDays: Number(totalOverflowSavedBedDays.toFixed(1)),
  };
}

/**
 * Selects a compact, non-overlapping set of key district IDs to label on a strategy map
 * at a given day: prioritizing selected wards, breached wards (>=100% ICU), active weekly teams,
 * or highest-stress wards when no breach or active focus exists.
 */
export function selectPriorityBadgeDistrictIds(
  output: OptimizationOutput,
  strategy: 'reactive' | 'sennagrid',
  rawDay: number,
  selectedDistrictId: string | null,
  maxBadges = 3,
): Set<string> {
  const n = output.districts.length;
  if (n === 0 || maxBadges <= 0) return new Set();

  const meta = getTimelineMeta(output, rawDay);
  const strat = strategy === 'reactive' ? output.reactive : output.sennagrid;
  const rowBase = meta.day * n;
  const weekRow = strat.schedule[meta.weekIndex];

  const scored = output.districts.map((district, i) => {
    const icuDemand = strat.districtIcuDemand[rowBase + i] ?? 0;
    const stress = computeDistrictStress(icuDemand, district.icuBeds);
    const treated = (weekRow?.[i] ?? 0) === 1;
    const selected = district.id === selectedDistrictId;
    return { id: district.id, stress, treated, selected };
  });

  const chosen = new Set<string>();
  if (selectedDistrictId && scored.some((s) => s.id === selectedDistrictId)) {
    chosen.add(selectedDistrictId);
  }

  // Always surface breaching wards first (highest stress first)
  const breaching = scored.filter((s) => s.stress >= 1.0).sort((a, b) => b.stress - a.stress);
  for (const item of breaching) {
    if (chosen.size >= maxBadges) break;
    chosen.add(item.id);
  }

  // For SennaGrid (and Reactive when below breach), surface active weekly interventions
  const treatedList = scored.filter((s) => s.treated).sort((a, b) => b.stress - a.stress);
  if (strategy === 'sennagrid' || breaching.length === 0) {
    for (const item of treatedList) {
      if (chosen.size >= maxBadges) break;
      chosen.add(item.id);
    }
  }

  // Fallback to top stressed wards so maps never appear unlabeled
  if (chosen.size === 0) {
    const topStress = [...scored].sort((a, b) => b.stress - a.stress).slice(0, Math.min(3, maxBadges));
    for (const item of topStress) {
      chosen.add(item.id);
    }
  }

  return chosen;
}

export function formatPopulationCompact(districts: readonly DistrictProperties[]): string {
  const total = districts.reduce((sum, d) => sum + d.population, 0);
  if (total >= 1_000_000) {
    return `${(total / 1_000_000).toFixed(2)}M pop`;
  }
  return `${Math.round(total / 1000)}K pop`;
}
