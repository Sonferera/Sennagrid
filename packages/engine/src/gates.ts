import type { PolicyGateResult, PolicyGateSummary, StrategySimulationResult } from './types';

export interface PolicyGateInput {
  reactive: StrategySimulationResult;
  sennagrid: StrategySimulationResult;
  hubCentrality: readonly number[];
  weeklyQuotaK: number;
}

export function evaluatePolicyGates(input: PolicyGateInput): PolicyGateSummary {
  const { reactive, sennagrid, hubCentrality, weeklyQuotaK } = input;
  const n = hubCentrality.length;

  const maxErr = Math.max(reactive.maxMassConservationError, sennagrid.maxMassConservationError);
  const hasNaN = reactive.hasNaN || sennagrid.hasNaN;
  const massPassed = !hasNaN && maxErr < 1e-9;

  let maxWeeklyAssigned = 0;
  for (const weekRow of sennagrid.schedule) {
    let assigned = 0;
    for (const val of weekRow) {
      if (val > 0) assigned++;
    }
    if (assigned > maxWeeklyAssigned) {
      maxWeeklyAssigned = assigned;
    }
  }
  const budgetPassed = maxWeeklyAssigned <= weeklyQuotaK;

  const costDiff = reactive.totalCostJ - sennagrid.totalCostJ;
  const costReductionPct = reactive.totalCostJ > 0 ? (costDiff / reactive.totalCostJ) * 100 : 0;
  const dominancePassed = sennagrid.totalCostJ < reactive.totalCostJ;

  const reactiveCollapse = reactive.icuCollapseDays;
  const optCollapse = sennagrid.icuCollapseDays;
  const collapseReductionRatio =
    reactiveCollapse > 0 ? (reactiveCollapse - optCollapse) / reactiveCollapse : optCollapse === 0 ? 1 : 0;
  const icuMitigationPassed = optCollapse === 0 || collapseReductionRatio >= 0.4;

  // Evaluate top-quartile hub centrality coverage during the first 4 weeks.
  const rankedHubs = hubCentrality
    .map((centrality, idx) => ({ idx, centrality }))
    .sort((a, b) => b.centrality - a.centrality);
  const topQuartileCount = Math.max(1, Math.ceil(n * 0.25));
  const topHubIndices = rankedHubs.slice(0, topQuartileCount).map((h) => h.idx);

  const earlyWeeks = Math.min(4, sennagrid.schedule.length);
  let coveredHubs = 0;
  for (const idx of topHubIndices) {
    let treatedEarly = false;
    for (let w = 0; w < earlyWeeks; w++) {
      if ((sennagrid.schedule[w]?.[idx] ?? 0) > 0) {
        treatedEarly = true;
        break;
      }
    }
    if (treatedEarly) coveredHubs++;
  }
  const hubCoverageRatio = topQuartileCount > 0 ? coveredHubs / topQuartileCount : 1;
  const hubPassed = hubCoverageRatio >= 0.5;

  const gates: PolicyGateResult[] = [
    {
      id: 'MASS_CONSERVATION',
      label: 'ODE Mass Conservation',
      passed: massPassed,
      observed: hasNaN ? 'NaN detected' : `${maxErr.toExponential(2)}`,
      threshold: '< 1.00e-9 & zero NaN',
    },
    {
      id: 'BUDGET_COMPLIANCE',
      label: 'Weekly Budget Cap',
      passed: budgetPassed,
      observed: `${maxWeeklyAssigned}/${weeklyQuotaK} districts/wk`,
      threshold: `<= ${weeklyQuotaK} districts/wk`,
    },
    {
      id: 'COST_DOMINANCE',
      label: 'Objective Dominance vs Reactive',
      passed: dominancePassed,
      observed: `${costReductionPct >= 0 ? '+' : ''}${costReductionPct.toFixed(1)}% cost reduction`,
      threshold: 'J(SennaGrid) < J(Reactive)',
    },
    {
      id: 'ICU_COLLAPSE_MITIGATION',
      label: 'ICU Collapse Prevention',
      passed: icuMitigationPassed,
      observed: `${optCollapse}d vs ${reactiveCollapse}d reactive`,
      threshold: '0 days or >= 40% reduction',
    },
    {
      id: 'HUB_COVERAGE',
      label: 'Early Mobility Hub Coverage',
      passed: hubPassed,
      observed: `${coveredHubs}/${topQuartileCount} hubs (${Math.round(hubCoverageRatio * 100)}%)`,
      threshold: '>= 50% in Weeks 1-4',
    },
  ];

  const passedCount = gates.filter((g) => g.passed).length;
  const totalGates = gates.length;

  const weightedScore =
    (massPassed ? 25 : 0) +
    (budgetPassed ? 20 : 0) +
    (dominancePassed ? 25 : 0) +
    (icuMitigationPassed ? 20 : Math.max(0, Math.min(12, Math.round(collapseReductionRatio * 20)))) +
    Math.round(Math.min(1, hubCoverageRatio / 0.5) * 10);

  const readinessScore = Math.max(0, Math.min(100, weightedScore));

  let overallStatus: PolicyGateSummary['overallStatus'] = 'REVIEW';
  if (!massPassed || !budgetPassed || passedCount <= 2) {
    overallStatus = 'FAIL';
  } else if (passedCount >= 4 && dominancePassed) {
    overallStatus = 'PASS';
  }

  return {
    overallStatus,
    passedCount,
    totalGates,
    readinessScore,
    gates,
  };
}
