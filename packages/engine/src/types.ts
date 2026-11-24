export type DiseaseMode = 'vector_seir_sei' | 'direct_seir';
export type RegionId = 'metro_tropica' | 'harbor_corridor';
export type ZoneType = 'core' | 'transit_hub' | 'residential' | 'peri_urban';

export type RationaleTag =
  | 'Mobility Hub Containment'
  | 'Pre-emptive Surge Intercept'
  | 'ICU Capacity Shield';

export type StrategyName = 'reactive' | 'sennagrid';

export interface DistrictProperties {
  id: string;
  name: string;
  population: number;
  icuBeds: number;
  centroid: [number, number]; // [lng, lat] in WGS84 degrees
  initialCases: number;
  zoneType: ZoneType;
}

export interface DailyClimatePoint {
  day: number;
  temperatureC: number;
  precipitationMm: number;
  rollingRain7dMm: number;
}

export interface ClimateSeries {
  source: 'open_meteo' | 'fallback_climatology';
  fetchedAtIso: string;
  anchorLat: number;
  anchorLng: number;
  meanTemp14d: number;
  meanPrecip14d: number;
  days: DailyClimatePoint[]; // length horizonDays + 1 (day 0..91)
}

export interface SimulationParams {
  regionId: RegionId;
  diseaseMode: DiseaseMode;
  budgetRatio: number; // 0.10..0.40
  icuRate: number;
  mobilityOutflow: number;
  interventionEfficacy?: number; // 0..1; omitted uses the disease-mode default
  horizonDays: number;
  dt: number;
}

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  regionId: 'metro_tropica',
  diseaseMode: 'vector_seir_sei',
  budgetRatio: 0.2,
  icuRate: 0.015,
  mobilityOutflow: 0.18,
  horizonDays: 91,
  dt: 0.25,
};

export const EPIDEMIC_CONSTANTS = {
  vector: {
    b0: 0.5,
    betaVh: 0.4,
    betaHv: 0.4,
    m0: 1.6,
    etaVec: 0.65,
    sigmaH: 1 / 5.5,
    gammaH: 1 / 7.0,
    sigmaV: 1 / 8.0,
    muV: 1 / 14.0,
  },
  direct: {
    beta0: 0.42,
    etaInt: 0.6,
    sigmaH: 1 / 4.0,
    gammaH: 1 / 6.5,
  },
  objective: {
    wIcu: 25.0,
    wInf: 1.0,
  },
  optimizer: {
    lambdaHub: 0.85,
    lambdaIcu: 1.5,
    maxSwapEvaluations: 250,
    timeBudgetMs: 1150,
  },
} as const;

export interface MobilityModel {
  n: number;
  distancesKm: Float64Array; // n * n symmetric pairwise Haversine distances
  weights: Float64Array; // n * n row-stochastic commuter coupling matrix W
  hubCentrality: Float64Array; // length n
}

export interface MobilityOptions {
  outflow?: number;
  alpha?: number;
  beta?: number;
  gamma?: number;
  d0Km?: number;
}

export type WeeklySchedule = Uint8Array[];

export interface StrategySimulationResult {
  name: StrategyName;
  schedule: number[][]; // [weeks][n] binary 0/1
  totalCostJ: number;
  totalIcuOverflowCost: number;
  totalInfectionDays: number;
  cumulativeCases: number;
  peakActiveInfections: number;
  peakIcuDemand: number;
  peakIcuOverflow: number;
  icuCollapseDays: number;
  maxMassConservationError: number;
  hasNaN: boolean;
  dailyTotalActive: number[];
  dailyTotalIcuDemand: number[];
  dailyCityOverflow: number[];
  // Flattened [day * n + districtIdx] for zero-allocation playback updates
  districtActive: Float64Array;
  districtIcuDemand: Float64Array;
}

export interface DispatchAssignment {
  week: number; // 1..13
  districtIndex: number;
  districtId: string;
  districtName: string;
  zoneType: ZoneType;
  interventionType: 'Vector Control / Fogging' | 'Targeted Vaccination';
  rationale: RationaleTag;
  projectedRiskScore: number;
  icuLoadAtWeekStart: number;
  icuCapacity: number;
  hubCentrality: number;
}

export interface SwapTraceEntry {
  iteration: number;
  week: number; // 1..13
  pass: number; // 1-based pass number in multi-pass Stage 2
  removedDistrictId: string;
  removedDistrictName: string;
  addedDistrictId: string;
  addedDistrictName: string;
  costBefore: number;
  costAfter: number;
  costDelta: number;
  overflowSaved: number; // non-negative overflow reduction, 1 decimal place
  overflowDelta: number; // signed overflowBefore - overflowAfter, 6 decimal places
}

export type PolicyGateId =
  | 'MASS_CONSERVATION'
  | 'BUDGET_COMPLIANCE'
  | 'COST_DOMINANCE'
  | 'ICU_COLLAPSE_MITIGATION'
  | 'HUB_COVERAGE';

export interface PolicyGateResult {
  id: PolicyGateId;
  label: string;
  passed: boolean;
  observed: string;
  threshold: string;
}

export interface PolicyGateSummary {
  overallStatus: 'PASS' | 'REVIEW' | 'FAIL';
  passedCount: number;
  totalGates: number;
  readinessScore: number; // 0..100
  gates: PolicyGateResult[];
}

export interface DistrictImpactSummary {
  districtId: string;
  districtName: string;
  reactivePeakActiveInfections: number;
  optimizedPeakActiveInfections: number;
  reactivePeakIcuDemand: number;
  optimizedPeakIcuDemand: number;
  reactivePeakIcuOverflow: number;
  optimizedPeakIcuOverflow: number;
  interventionWeeks: number;
}

export interface ImpactSummary {
  casesAverted: number;
  casesAvertedPct: number;
  peakIcuOverflowPrevented: number;
  collapseDaysSaved: number;
  costReductionPct: number;
  districtImpacts: DistrictImpactSummary[];
}

export interface ImpactRadar {
  casesControl: number;
  peakIcuSafety: number;
  collapsePrevention: number;
  hubContainment: number;
  budgetEfficiency: number;
}

export interface OptimizationOutput {
  params: SimulationParams;
  climate: ClimateSeries;
  districts: DistrictProperties[];
  hubCentrality: number[];
  totalIcuCapacity: number;
  weeklyQuotaK: number;
  reactive: StrategySimulationResult;
  sennagrid: StrategySimulationResult;
  assignments: DispatchAssignment[];
  swapTrace: SwapTraceEntry[];
  gates: PolicyGateSummary;
  impactSummary: ImpactSummary;
  impactRadar: ImpactRadar;
  evaluationsCount: number;
  solveTimeMs: number;
  improvementPct: number;
}

export interface WorkerRunRequest {
  type: 'RUN_OPTIMIZATION';
  requestId: number;
  params: SimulationParams;
  districts: DistrictProperties[];
  climate: ClimateSeries;
}

export type WorkerResponse =
  | { type: 'OPTIMIZATION_RESULT'; requestId: number; result: OptimizationOutput }
  | { type: 'OPTIMIZATION_ERROR'; requestId: number; error: string };
