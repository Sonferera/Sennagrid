import type { OptimizationOutput } from '@sennagrid/engine';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateDispatchCsv(output: OptimizationOutput): string {
  const headers = [
    'Week',
    'District ID',
    'District Name',
    'Zone Type',
    'Intervention Type',
    'Rationale',
    'ICU Load at Week Start',
    'ICU Capacity',
    'Hub Centrality',
    'Projected Risk Score',
  ];

  const rows = output.assignments.map((a) =>
    [
      a.week,
      a.districtId,
      a.districtName,
      a.zoneType,
      a.interventionType,
      a.rationale,
      a.icuLoadAtWeekStart.toFixed(1),
      a.icuCapacity,
      a.hubCentrality.toFixed(3),
      a.projectedRiskScore.toFixed(1),
    ]
      .map(escapeCsvCell)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\r\n');
}

export function generateFullRunJson(output: OptimizationOutput): string {
  const serializable = {
    exportedAtIso: new Date().toISOString(),
    product: 'SennaGrid',
    params: output.params,
    weeklyQuotaK: output.weeklyQuotaK,
    totalIcuCapacity: output.totalIcuCapacity,
    solveTimeMs: output.solveTimeMs,
    evaluationsCount: output.evaluationsCount,
    improvementPct: output.improvementPct,
    climate: {
      source: output.climate.source,
      fetchedAtIso: output.climate.fetchedAtIso,
      anchorLat: output.climate.anchorLat,
      anchorLng: output.climate.anchorLng,
      meanTemp14d: output.climate.meanTemp14d,
      meanPrecip14d: output.climate.meanPrecip14d,
      days: output.climate.days,
    },
    gates: output.gates,
    summary: {
      reactive: {
        totalCostJ: output.reactive.totalCostJ,
        cumulativeCases: output.reactive.cumulativeCases,
        peakActiveInfections: output.reactive.peakActiveInfections,
        peakIcuDemand: output.reactive.peakIcuDemand,
        peakIcuOverflow: output.reactive.peakIcuOverflow,
        icuCollapseDays: output.reactive.icuCollapseDays,
        maxMassConservationError: output.reactive.maxMassConservationError,
      },
      sennagrid: {
        totalCostJ: output.sennagrid.totalCostJ,
        cumulativeCases: output.sennagrid.cumulativeCases,
        peakActiveInfections: output.sennagrid.peakActiveInfections,
        peakIcuDemand: output.sennagrid.peakIcuDemand,
        peakIcuOverflow: output.sennagrid.peakIcuOverflow,
        icuCollapseDays: output.sennagrid.icuCollapseDays,
        maxMassConservationError: output.sennagrid.maxMassConservationError,
      },
    },
    districts: output.districts,
    hubCentrality: output.hubCentrality,
    assignments: output.assignments,
    swapTrace: output.swapTrace,
    dailyCurves: {
      reactiveActive: output.reactive.dailyTotalActive,
      sennagridActive: output.sennagrid.dailyTotalActive,
      reactiveIcuDemand: output.reactive.dailyTotalIcuDemand,
      sennagridIcuDemand: output.sennagrid.dailyTotalIcuDemand,
      reactiveOverflow: output.reactive.dailyCityOverflow,
      sennagridOverflow: output.sennagrid.dailyCityOverflow,
    },
  };

  return JSON.stringify(serializable, null, 2);
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
