import type { OptimizationOutput, RationaleTag, ZoneType } from '@sennagrid/engine';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FilterX,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
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

function getRationaleBadgeClass(rationale: RationaleTag): string {
  switch (rationale) {
    case 'ICU Capacity Shield':
      return 'border-rose-400/50 bg-[#3b111c] text-[#fda4af]';
    case 'Mobility Hub Containment':
      return 'border-cyan-400/50 bg-[#083344] text-[#67e8f9]';
    case 'Pre-emptive Surge Intercept':
      return 'border-amber-400/50 bg-[#2e1f07] text-[#fcd34d]';
  }
}

export function DispatchSchedule({
  output,
  onInspectDistrictAtWeek,
}: DispatchScheduleProps) {
  const [filters, setFilters] = useState<DispatchFilterState>(INITIAL_FILTERS);
  const [exportFeedback, setExportFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const totalWeeks = Math.max(1, output.sennagrid.schedule.length);
  const weekOptions = useMemo(
    () => Array.from({ length: totalWeeks }, (_, idx) => idx + 1),
    [totalWeeks],
  );

  const filteredRows = useMemo(
    () => filterDispatchAssignments(output.assignments, filters),
    [output.assignments, filters],
  );

  const hasActiveFilters =
    filters.week !== 'all' ||
    filters.zoneType !== 'all' ||
    filters.rationale !== 'all' ||
    filters.search.trim().length > 0;

  const budgetPct = Math.round(output.params.budgetRatio * 100);
  const interventionLabel =
    output.params.diseaseMode === 'vector_seir_sei'
      ? 'Vector Control / Fogging'
      : 'Targeted Vaccination';

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

  return (
    <section
      aria-label="Weekly operational dispatch schedule"
      data-tour="dispatch-export"
      className="rounded-lg border border-slate-800 bg-[#0f172a]"
    >
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Weekly Dispatch Schedule (Weeks 1 to {totalWeeks})
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Quota: <span className="font-mono text-slate-200">{output.weeklyQuotaK} districts/week</span>{' '}
            ({budgetPct}% budget) · Action:{' '}
            <span className="font-medium text-cyan-300">{interventionLabel}</span> · Showing{' '}
            <span className="font-mono tabular-nums text-slate-200">
              {filteredRows.length} / {output.assignments.length}
            </span>{' '}
            assignments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-[#04111a] transition-colors hover:bg-cyan-300"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Export Plan (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-500 bg-[#162033] px-3.5 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-cyan-400 hover:text-cyan-300"
          >
            <FileJson className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            <span>Export Full Run (JSON)</span>
          </button>
        </div>
      </div>

      {/* Accessible Export Feedback Banner */}
      {exportFeedback && (
        <div
          role={exportFeedback.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 text-xs ${
            exportFeedback.tone === 'success'
              ? 'border-emerald-500/40 bg-[#082f23] text-[#6ee7b7]'
              : 'border-rose-500/40 bg-[#3b111c] text-[#fda4af]'
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
          <Download className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 border-b border-slate-800 bg-[#121a2d] p-4 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-12 min-[1180px]:items-end">
        <div className="min-[1180px]:col-span-2">
          <label
            htmlFor="sg-filter-week"
            className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400"
          >
            Week
          </label>
          <select
            id="sg-filter-week"
            value={filters.week === 'all' ? 'all' : String(filters.week)}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                week: e.target.value === 'all' ? 'all' : Number(e.target.value),
              }))
            }
            className="min-h-[44px] w-full rounded-md border border-slate-500 bg-[#162033] px-2.5 py-2 text-xs font-medium text-slate-100"
          >
            <option value="all" className="bg-[#0f172a]">
              All Weeks (1 to {totalWeeks})
            </option>
            {weekOptions.map((w) => (
              <option key={w} value={w} className="bg-[#0f172a]">
                Week {w}
              </option>
            ))}
          </select>
        </div>

        <div className="min-[1180px]:col-span-2">
          <label
            htmlFor="sg-filter-zone"
            className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400"
          >
            Zone Type
          </label>
          <select
            id="sg-filter-zone"
            value={filters.zoneType}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                zoneType: e.target.value as DispatchFilterState['zoneType'],
              }))
            }
            className="min-h-[44px] w-full rounded-md border border-slate-500 bg-[#162033] px-2.5 py-2 text-xs font-medium text-slate-100"
          >
            <option value="all" className="bg-[#0f172a]">
              All Zones
            </option>
            {ZONE_OPTIONS.map((z) => (
              <option key={z} value={z} className="bg-[#0f172a]">
                {formatZoneLabel(z)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-[1180px]:col-span-3">
          <label
            htmlFor="sg-filter-rationale"
            className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400"
          >
            Rationale
          </label>
          <select
            id="sg-filter-rationale"
            value={filters.rationale}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                rationale: e.target.value as DispatchFilterState['rationale'],
              }))
            }
            className="min-h-[44px] w-full rounded-md border border-slate-500 bg-[#162033] px-2.5 py-2 text-xs font-medium text-slate-100"
          >
            <option value="all" className="bg-[#0f172a]">
              All Rationales
            </option>
            {RATIONALE_OPTIONS.map((r) => (
              <option key={r} value={r} className="bg-[#0f172a]">
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="min-[1180px]:col-span-3">
          <label
            htmlFor="sg-filter-search"
            className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-slate-400"
          >
            District Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="sg-filter-search"
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Filter by district name or ID..."
              className="min-h-[44px] w-full rounded-md border border-slate-500 bg-[#162033] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="min-[1180px]:col-span-2 min-[1180px]:flex min-[1180px]:justify-end">
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-slate-500 bg-[#0f172a] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-40 min-[1180px]:w-auto"
          >
            <FilterX className="h-4 w-4" aria-hidden="true" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-200">
            No dispatch assignments match your current filter selection.
          </p>
          <p className="text-xs text-slate-400">
            Reset filters to view all {output.assignments.length} scheduled district interventions.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-500 bg-[#162033] px-4 py-2 text-xs font-medium text-cyan-300 hover:border-cyan-400"
          >
            <FilterX className="h-4 w-4" aria-hidden="true" />
            <span>Clear Filters</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Readable Stacked Cards (< 720px) */}
          <div className="divide-y divide-slate-800 min-[720px]:hidden">
            {filteredRows.map((row) => (
              <article key={`${row.week}-${row.districtId}`} className="space-y-2.5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-slate-600 bg-[#162033] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-cyan-300">
                      Week {row.week}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                      className="inline-flex min-h-[44px] items-center gap-1 text-left text-sm font-semibold text-slate-100 underline decoration-slate-500 underline-offset-4 hover:text-cyan-300"
                    >
                      <span>{row.districtName}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="rounded border border-slate-600 bg-[#162033] px-2 py-0.5 text-[11px] text-slate-300">
                    {formatZoneLabel(row.zoneType)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${getRationaleBadgeClass(row.rationale)}`}
                  >
                    {row.rationale}
                  </span>
                  <span className="text-xs text-slate-300">{row.interventionType}</span>
                </div>

                <dl className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-[#162033] p-2.5 font-mono text-[11px] tabular-nums">
                  <div>
                    <dt className="text-slate-400">ICU / Cap</dt>
                    <dd className="mt-0.5 font-semibold text-slate-100">
                      {formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Hub Index</dt>
                    <dd className="mt-0.5 font-semibold text-slate-100">
                      {row.hubCentrality.toFixed(3)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Risk Score</dt>
                    <dd className="mt-0.5 font-semibold text-cyan-300">
                      {formatFixed(row.projectedRiskScore, 1)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          {/* Tablet & Desktop Structured Table (>= 720px) */}
          <div className="hidden overflow-x-auto min-[720px]:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#162033] font-mono text-[11px] uppercase tracking-[0.06em] text-slate-300">
                  <th scope="col" className="px-4 py-3">
                    Week
                  </th>
                  <th scope="col" className="px-4 py-3">
                    District
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Zone
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Rationale
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    ICU Load / Cap
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Hub Index
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Risk Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRows.map((row) => (
                  <tr
                    key={`${row.week}-${row.districtId}`}
                    className="transition-colors hover:bg-[#162033]/70"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold tabular-nums text-cyan-300">
                      W{row.week}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                        className="inline-flex items-center gap-1.5 font-semibold text-slate-100 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-300 hover:decoration-cyan-400"
                      >
                        <span>{row.districtName}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      </button>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        {row.districtId}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-300">
                      {formatZoneLabel(row.zoneType)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-300">
                      {row.interventionType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${getRationaleBadgeClass(row.rationale)}`}
                      >
                        {row.rationale}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-200">
                      {formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">
                      {row.hubCentrality.toFixed(3)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-cyan-300">
                      {formatFixed(row.projectedRiskScore, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
