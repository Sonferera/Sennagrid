import type { OptimizationOutput, RationaleTag, ZoneType } from '@sennagrid/engine';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { getRegionPreset } from '../../data/regions';
import {
  computeDistrictStress,
  filterDispatchAssignments,
  formatFixed,
  formatZoneLabel,
  type DispatchFilterState,
} from '../../lib/viewModels';
import {
  downloadTextFile,
  generateDispatchCsv,
  generateFullRunJson,
} from '../../services/export';

interface DispatchScheduleProps {
  output: OptimizationOutput;
  onInspectDistrictAtWeek: (districtId: string, week: number) => void;
}

const INITIAL_FILTERS: DispatchFilterState = {
  week: 'all',
  zoneType: 'all',
  rationale: 'all',
  search: '',
};

const RATIONALE_OPTIONS: readonly RationaleTag[] = [
  'Mobility Hub Containment',
  'Pre-emptive Surge Intercept',
  'ICU Capacity Shield',
];

const ZONE_OPTIONS: readonly ZoneType[] = ['core', 'transit_hub', 'residential', 'peri_urban'];
const PAGE_SIZE = 10;

function getRationaleIndicator(rationale: RationaleTag): {
  letter: 'H' | 'S' | 'I';
  cellClass: string;
  dotColor: string;
  textColor: string;
  shortLabel: string;
} {
  switch (rationale) {
    case 'Mobility Hub Containment':
      return {
        letter: 'H',
        cellClass: 'bg-[#d7f0ea] text-[#115e59] hover:bg-[#bfe7de]',
        dotColor: 'bg-[#0f766e]',
        textColor: 'text-[#0f766e]',
        shortLabel: 'Hub Containment',
      };
    case 'Pre-emptive Surge Intercept':
      return {
        letter: 'S',
        cellClass: 'bg-[#faecc8] text-[#92400e] hover:bg-[#f5dfaa]',
        dotColor: 'bg-[#d97706]',
        textColor: 'text-[#92400e]',
        shortLabel: 'Surge Intercept',
      };
    case 'ICU Capacity Shield':
      return {
        letter: 'I',
        cellClass: 'bg-[#fbe3e7] text-[#9f1239] hover:bg-[#f6ccd4]',
        dotColor: 'bg-[#e11d48]',
        textColor: 'text-[#9f1239]',
        shortLabel: 'ICU Shield',
      };
  }
}

export function DispatchSchedule({
  output,
  onInspectDistrictAtWeek,
}: DispatchScheduleProps) {
  const [filters, setFilters] = useState<DispatchFilterState>(INITIAL_FILTERS);
  const [showAllMatrixWards, setShowAllMatrixWards] = useState(false);
  const [page, setPage] = useState(1);
  const [exportFeedback, setExportFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const preset = getRegionPreset(output.params.regionId);
  const totalWeeks = Math.max(1, output.sennagrid.schedule.length);
  const weekOptions = useMemo(
    () => Array.from({ length: totalWeeks }, (_, idx) => idx + 1),
    [totalWeeks],
  );

  const { assignmentMap, activeDistrictCountMap } = useMemo(() => {
    const map = new Map<string, RationaleTag>();
    const counts = new Map<string, number>();
    for (const a of output.assignments) {
      map.set(`${a.week}:${a.districtId}`, a.rationale);
      counts.set(a.districtId, (counts.get(a.districtId) ?? 0) + 1);
    }
    return { assignmentMap: map, activeDistrictCountMap: counts };
  }, [output.assignments]);

  const matrixDistricts = useMemo(() => {
    const active = output.districts.filter((d) => (activeDistrictCountMap.get(d.id) ?? 0) > 0);
    if (showAllMatrixWards || active.length === 0) {
      return output.districts;
    }
    return [...active].sort(
      (a, b) => (activeDistrictCountMap.get(b.id) ?? 0) - (activeDistrictCountMap.get(a.id) ?? 0),
    );
  }, [output.districts, activeDistrictCountMap, showAllMatrixWards]);

  const filteredRows = useMemo(
    () => filterDispatchAssignments(output.assignments, filters),
    [output.assignments, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const hasActiveFilters =
    filters.week !== 'all' ||
    filters.zoneType !== 'all' ||
    filters.rationale !== 'all' ||
    filters.search.trim().length > 0;

  const budgetPct = Math.round(output.params.budgetRatio * 100);
  const interventionLabel =
    output.params.diseaseMode === 'vector_seir_sei'
      ? 'Dengue · Vector Control'
      : 'Respiratory · Targeted Vaccination';

  const handleFilterChange = (updater: (prev: DispatchFilterState) => DispatchFilterState) => {
    setFilters(updater);
    setPage(1);
  };

  const handleExportCsv = () => {
    try {
      const csv = generateDispatchCsv(output);
      const filename = `sennagrid-dispatch-${output.params.regionId}-${budgetPct}pct.csv`;
      downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
      setExportFeedback({
        tone: 'success',
        message: `Exported ${output.assignments.length} dispatch rows to ${filename}.`,
      });
    } catch (err) {
      setExportFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? `CSV export failed: ${err.message}`
            : 'CSV export failed in this browser environment.',
      });
    }
  };

  const handleExportJson = () => {
    try {
      const json = generateFullRunJson(output);
      const filename = `sennagrid-full-run-${output.params.regionId}-${budgetPct}pct.json`;
      downloadTextFile(filename, json, 'application/json;charset=utf-8');
      setExportFeedback({
        tone: 'success',
        message: `Exported full simulation payload to ${filename}.`,
      });
    } catch (err) {
      setExportFeedback({
        tone: 'error',
        message:
          err instanceof Error
            ? `JSON export failed: ${err.message}`
            : 'JSON export failed in this browser environment.',
      });
    }
  };

  const rangeStart = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filteredRows.length, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Title & Export Bar */}
      <div
        data-tour="dispatch-export"
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1c1917] sm:text-[26px]">
            13-Week Dispatch Schedule
          </h2>
          <p className="mt-1 text-sm text-[#57534e]">
            {preset.name} · {interventionLabel} · {output.weeklyQuotaK} of {output.districts.length}{' '}
            districts per week ({output.assignments.length} deployments)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#d6d0c4] bg-[#fbf9f5] px-4 py-2 text-[13px] font-semibold text-[#1c1917] transition-colors hover:bg-[#eee9df] min-[720px]:min-h-[38px]"
          >
            <FileJson className="h-4 w-4 text-[#57534e]" aria-hidden="true" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-[13px] font-semibold text-[#fbf9f5] transition-colors hover:bg-[#115e59] min-[720px]:min-h-[38px]"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {exportFeedback && (
        <div
          role={exportFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-[13px] font-medium ${
            exportFeedback.tone === 'success'
              ? 'border-[#b9dfd0] bg-[#e9f5ef] text-[#065f46]'
              : 'border-[#e7b4bd] bg-[#fdf0f2] text-[#9f1239]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {exportFeedback.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{exportFeedback.message}</span>
          </span>
          <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        </div>
      )}

      {/* Card 1: Calm Weekly Coverage Matrix */}
      <section
        aria-label="13-week spatial deployment matrix"
        className="rounded-xl border border-[#e0dbd0] bg-[#fbf9f5] p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#1c1917]">
            Weekly Coverage Matrix (W01–W{String(totalWeeks).padStart(2, '0')})
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#57534e]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" aria-hidden="true" />
              <span>Hub Containment (H)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" aria-hidden="true" />
              <span>Surge Intercept (S)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e11d48]" aria-hidden="true" />
              <span>ICU Shield (I)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#e0dbd0] font-mono text-xs font-medium text-[#57534e]">
                <th scope="col" className="py-2.5 pr-4">
                  DISTRICT
                </th>
                {weekOptions.map((w) => (
                  <th key={w} scope="col" className="px-1 py-2.5 text-center font-mono">
                    W{String(w).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe6dc]">
              {matrixDistricts.map((district) => (
                <tr key={district.id} className="hover:bg-[#f5f2eb]">
                  <td className="whitespace-nowrap py-3 pr-4 font-medium text-[#1c1917]">
                    {district.name}
                  </td>
                  {weekOptions.map((w) => {
                    const rationale = assignmentMap.get(`${w}:${district.id}`);
                    if (!rationale) {
                      return (
                        <td key={w} className="px-1 py-2.5 text-center font-mono text-[#c7c0b3]">
                          ·
                        </td>
                      );
                    }
                    const style = getRationaleIndicator(rationale);
                    return (
                      <td key={w} className="px-1 py-2 text-center">
                        <button
                          type="button"
                          title={`Week ${w} · ${district.name}: ${rationale}`}
                          aria-label={`Inspect ${district.name} in Week ${w} (${rationale})`}
                          onClick={() => onInspectDistrictAtWeek(district.id, w)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-semibold transition-colors ${style.cellClass}`}
                        >
                          {style.letter}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e0dbd0] pt-3.5 text-[13px] text-[#57534e]">
          <span className="font-mono tabular-nums">
            {output.weeklyQuotaK} / {output.weeklyQuotaK} teams per week ·{' '}
            {output.assignments.length} total allocations
          </span>
          {output.districts.length > matrixDistricts.length || showAllMatrixWards ? (
            <button
              type="button"
              onClick={() => setShowAllMatrixWards((v) => !v)}
              className="min-h-[44px] font-medium text-[#0f766e] hover:underline min-[720px]:min-h-0"
            >
              {showAllMatrixWards
                ? 'Show active wards only'
                : `Show all ${output.districts.length} wards`}
            </button>
          ) : null}
        </div>
      </section>

      {/* Card 2: Clean 5-Column Dispatch Table */}
      <section
        aria-label="Weekly field assignments"
        className="rounded-xl border border-[#e0dbd0] bg-[#fbf9f5] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#1c1917]">Field Assignments</h3>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sg-filter-week" className="sr-only">
              Filter by week
            </label>
            <select
              id="sg-filter-week"
              value={filters.week === 'all' ? 'all' : String(filters.week)}
              onChange={(e) =>
                handleFilterChange((prev) => ({
                  ...prev,
                  week: e.target.value === 'all' ? 'all' : Number(e.target.value),
                }))
              }
              className="min-h-[44px] rounded-lg border border-[#d6d0c4] bg-[#fbf9f5] px-3 py-1 text-[13px] font-medium text-[#1c1917] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Weeks</option>
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>

            <label htmlFor="sg-filter-zone" className="sr-only">
              Filter by zone type
            </label>
            <select
              id="sg-filter-zone"
              value={filters.zoneType}
              onChange={(e) =>
                handleFilterChange((prev) => ({
                  ...prev,
                  zoneType: e.target.value as DispatchFilterState['zoneType'],
                }))
              }
              className="min-h-[44px] rounded-lg border border-[#d6d0c4] bg-[#fbf9f5] px-3 py-1 text-[13px] font-medium text-[#1c1917] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Zones</option>
              {ZONE_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {formatZoneLabel(z)}
                </option>
              ))}
            </select>

            <label htmlFor="sg-filter-rationale" className="sr-only">
              Filter by rationale
            </label>
            <select
              id="sg-filter-rationale"
              value={filters.rationale}
              onChange={(e) =>
                handleFilterChange((prev) => ({
                  ...prev,
                  rationale: e.target.value as DispatchFilterState['rationale'],
                }))
              }
              className="min-h-[44px] rounded-lg border border-[#d6d0c4] bg-[#fbf9f5] px-3 py-1 text-[13px] font-medium text-[#1c1917] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Rationales</option>
              {RATIONALE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="relative">
              <label htmlFor="sg-filter-search" className="sr-only">
                Filter district
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#57534e]"
                aria-hidden="true"
              />
              <input
                id="sg-filter-search"
                type="search"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Filter district..."
                className="min-h-[44px] w-48 rounded-lg border border-[#d6d0c4] bg-[#fbf9f5] py-1 pl-9 pr-3 text-[13px] text-[#1c1917] placeholder:text-[#57534e] min-[720px]:min-h-[36px]"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => handleFilterChange(() => INITIAL_FILTERS)}
                className="min-h-[44px] rounded-lg px-3 py-1 text-[13px] font-medium text-[#0f766e] hover:bg-[#edf6f4] min-[720px]:min-h-[36px]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-[#1c1917]">
              No assignments match your current filter.
            </p>
            <button
              type="button"
              onClick={() => handleFilterChange(() => INITIAL_FILTERS)}
              className="mt-2 min-h-[44px] text-sm font-semibold text-[#0f766e] hover:underline min-[720px]:min-h-0"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Stacked List (< 720px) */}
            <div className="mt-4 divide-y divide-[#ebe6dc] min-[720px]:hidden">
              {pagedRows.map((row) => {
                const style = getRationaleIndicator(row.rationale);
                const icuPct = Math.round(
                  computeDistrictStress(row.icuLoadAtWeekStart, row.icuCapacity) * 100,
                );
                return (
                  <article key={`${row.week}-${row.districtId}`} className="space-y-2 py-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                        className="min-h-[44px] text-left text-[15px] font-semibold text-[#1c1917] hover:text-[#0f766e]"
                      >
                        <span className="mr-2 font-mono text-[13px] text-[#57534e]">
                          W{String(row.week).padStart(2, '0')}
                        </span>
                        {row.districtName}
                      </button>
                      <span className="font-mono text-[13px] tabular-nums text-[#1c1917]">
                        {icuPct}% ({formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${style.textColor}`}>
                        <span className={`h-2 w-2 rounded-full ${style.dotColor}`} aria-hidden="true" />
                        <span>{style.shortLabel}</span>
                      </span>
                      <span className="text-[#57534e]">{row.interventionType}</span>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Clean 5-Column Desktop Table (>= 720px) */}
            <div className="mt-4 hidden overflow-x-auto min-[720px]:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e0dbd0] text-xs font-medium text-[#57534e]">
                    <th scope="col" className="py-3 pr-3 font-mono">
                      WEEK
                    </th>
                    <th scope="col" className="px-3 py-3">
                      DISTRICT
                    </th>
                    <th scope="col" className="px-3 py-3">
                      RATIONALE
                    </th>
                    <th scope="col" className="px-3 py-3">
                      PROTOCOL
                    </th>
                    <th scope="col" className="py-3 pl-3 text-right font-mono">
                      FORECAST ICU
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebe6dc]">
                  {pagedRows.map((row) => {
                    const style = getRationaleIndicator(row.rationale);
                    const icuPct = Math.round(
                      computeDistrictStress(row.icuLoadAtWeekStart, row.icuCapacity) * 100,
                    );
                    return (
                      <tr
                        key={`${row.week}-${row.districtId}`}
                        className="transition-colors hover:bg-[#f5f2eb]"
                      >
                        <td className="whitespace-nowrap py-3.5 pr-3 font-mono font-semibold tabular-nums text-[#1c1917]">
                          W{String(row.week).padStart(2, '0')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <button
                            type="button"
                            onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                            className="font-semibold text-[#1c1917] hover:text-[#0f766e] hover:underline"
                          >
                            {row.districtName}
                          </button>{' '}
                          <span className="text-[#57534e]">({formatZoneLabel(row.zoneType)})</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${style.textColor}`}>
                            <span className={`h-2 w-2 rounded-full ${style.dotColor}`} aria-hidden="true" />
                            <span>{style.shortLabel}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[#57534e]">
                          {row.interventionType}
                        </td>
                        <td className="whitespace-nowrap py-3.5 pl-3 text-right font-mono tabular-nums text-[#1c1917]">
                          <strong>{icuPct}%</strong>{' '}
                          <span className="text-[#57534e]">
                            ({formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Clean Pagination Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e0dbd0] pt-3.5 text-[13px] text-[#57534e]">
              <span className="tabular-nums">
                Showing {rangeStart}–{rangeEnd} of {filteredRows.length} assignments
              </span>
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-[44px] rounded px-2.5 font-sans font-medium text-[#1c1917] hover:bg-[#eee9df] disabled:opacity-40 min-[720px]:min-h-[30px]"
                >
                  Prev
                </button>
                <span className="tabular-nums">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-[44px] rounded px-2.5 font-sans font-medium text-[#1c1917] hover:bg-[#eee9df] disabled:opacity-40 min-[720px]:min-h-[30px]"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
