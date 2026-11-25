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
  buildDistrictShortCode,
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
      return 'border-rose-500/40 bg-rose-50 text-[#9f1239]';
    case 'Mobility Hub Containment':
      return 'border-teal-600/40 bg-teal-50 text-[#115e59]';
    case 'Pre-emptive Surge Intercept':
      return 'border-amber-600/40 bg-amber-50 text-[#92400e]';
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

  const assignmentMap = useMemo(() => {
    const map = new Map<string, RationaleTag>();
    for (const a of output.assignments) {
      map.set(`${a.week}:${a.districtId}`, a.rationale);
    }
    return map;
  }, [output.assignments]);

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
    <div className="space-y-4">
      {/* Visual 13-Week Deployment Matrix */}
      <section
        aria-label="13-week spatial deployment matrix"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0f172a]">
              13-Week Deployment Matrix ({output.weeklyQuotaK} wards/week)
            </h2>
            <p className="text-xs text-slate-600">
              Overview of which districts receive field teams each week. Click any active cell to
              inspect that ward on the Simulator map.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#115e59]">
              <span className="h-3 w-3 rounded-xs bg-[#0f766e]" aria-hidden="true" />
              Hub Containment
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#92400e]">
              <span className="h-3 w-3 rounded-xs bg-amber-500" aria-hidden="true" />
              Surge Intercept
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#9f1239]">
              <span className="h-3 w-3 rounded-xs bg-rose-500" aria-hidden="true" />
              ICU Shield
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-mono text-[11px] text-slate-500">
                <th scope="col" className="py-2 pr-3 font-semibold text-slate-700">
                  District
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-slate-700">
                  Zone
                </th>
                {weekOptions.map((w) => (
                  <th key={w} scope="col" className="px-1 py-2 text-center font-semibold">
                    W{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {output.districts.map((district, dIdx) => (
                <tr key={district.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap py-1.5 pr-3">
                    <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                      {buildDistrictShortCode(district, dIdx)}
                    </span>
                    <span className="font-semibold text-[#0f172a]">{district.name}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-500">
                    {formatZoneLabel(district.zoneType)}
                  </td>
                  {weekOptions.map((w) => {
                    const rationale = assignmentMap.get(`${w}:${district.id}`);
                    if (!rationale) {
                      return (
                        <td key={w} className="px-1 py-1.5 text-center">
                          <span
                            className="inline-block h-4 w-5 rounded-xs bg-slate-100"
                            aria-label={`Week ${w} standby`}
                          />
                        </td>
                      );
                    }
                    const cellColor =
                      rationale === 'ICU Capacity Shield'
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : rationale === 'Pre-emptive Surge Intercept'
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#0f766e] hover:bg-[#0d9488]';
                    return (
                      <td key={w} className="px-1 py-1.5 text-center">
                        <button
                          type="button"
                          title={`Week ${w} · ${district.name}: ${rationale}`}
                          aria-label={`Inspect ${district.name} in Week ${w} (${rationale})`}
                          onClick={() => onInspectDistrictAtWeek(district.id, w)}
                          className={`inline-block h-4 w-5 rounded-xs transition-transform hover:scale-110 ${cellColor}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filterable Operational Dispatch Schedule & Exports */}
      <section
        aria-label="Weekly operational dispatch schedule"
        data-tour="dispatch-export"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Operational Field Schedule (Weeks 1 to {totalWeeks})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Action: <strong className="text-[#0f766e]">{interventionLabel}</strong> · Quota:{' '}
              <strong className="font-mono text-[#0f172a]">{output.weeklyQuotaK} wards/wk</strong> ·
              Showing{' '}
              <span className="font-mono font-semibold tabular-nums text-[#0f172a]">
                {filteredRows.length} of {output.assignments.length}
              </span>{' '}
              dispatches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#0d9488] min-[720px]:min-h-[36px]"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Export Plan (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0f172a] min-[720px]:min-h-[36px]"
            >
              <FileJson className="h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
              <span>Export Full Run (JSON)</span>
            </button>
          </div>
        </div>

        {exportFeedback && (
          <div
            role={exportFeedback.tone === 'error' ? 'alert' : 'status'}
            className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 text-xs font-medium ${
              exportFeedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-[#065f46]'
                : 'border-rose-200 bg-rose-50 text-[#9f1239]'
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
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-4 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-12 min-[1180px]:items-end">
          <div className="min-[1180px]:col-span-2">
            <label htmlFor="sg-filter-week" className="mb-1 block text-xs font-semibold text-slate-700">
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
              className="min-h-[44px] w-full rounded-lg border border-slate-500 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0f172a] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Weeks (1 to {totalWeeks})</option>
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>

          <div className="min-[1180px]:col-span-2">
            <label htmlFor="sg-filter-zone" className="mb-1 block text-xs font-semibold text-slate-700">
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
              className="min-h-[44px] w-full rounded-lg border border-slate-500 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0f172a] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Zones</option>
              {ZONE_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {formatZoneLabel(z)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-[1180px]:col-span-3">
            <label
              htmlFor="sg-filter-rationale"
              className="mb-1 block text-xs font-semibold text-slate-700"
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
              className="min-h-[44px] w-full rounded-lg border border-slate-500 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0f172a] min-[720px]:min-h-[36px]"
            >
              <option value="all">All Rationales</option>
              {RATIONALE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="min-[1180px]:col-span-3">
            <label
              htmlFor="sg-filter-search"
              className="mb-1 block text-xs font-semibold text-slate-700"
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
                placeholder="Search ward name or ID..."
                className="min-h-[44px] w-full rounded-lg border border-slate-500 bg-white py-1.5 pl-9 pr-3 text-xs text-[#0f172a] placeholder:text-slate-400 min-[720px]:min-h-[36px]"
              />
            </div>
          </div>

          <div className="min-[1180px]:col-span-2 min-[1180px]:flex min-[1180px]:justify-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 min-[720px]:min-h-[36px] min-[1180px]:w-auto"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-bold text-[#0f172a]">
              No dispatch assignments match your current filter selection.
            </p>
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-500 bg-white px-4 py-2 text-xs font-semibold text-[#0f766e] hover:bg-teal-50"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
              <span>Clear Filters</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards (< 720px) */}
            <div className="divide-y divide-slate-200 min-[720px]:hidden">
              {filteredRows.map((row) => (
                <article key={`${row.week}-${row.districtId}`} className="space-y-2.5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-[#115e59]">
                        Week {row.week}
                      </span>
                      <button
                        type="button"
                        onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                        className="inline-flex min-h-[44px] items-center gap-1 text-left text-sm font-bold text-[#0f172a] underline decoration-slate-400 underline-offset-4 hover:text-[#0f766e]"
                      >
                        <span>{row.districtName}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-[#0f766e]" aria-hidden="true" />
                      </button>
                    </div>
                    <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {formatZoneLabel(row.zoneType)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getRationaleBadgeClass(row.rationale)}`}
                    >
                      {row.rationale}
                    </span>
                    <span className="text-xs text-slate-600">{row.interventionType}</span>
                  </div>

                  <dl className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] tabular-nums">
                    <div>
                      <dt className="text-slate-500">ICU / Cap</dt>
                      <dd className="mt-0.5 font-semibold text-[#0f172a]">
                        {formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Hub Index</dt>
                      <dd className="mt-0.5 font-semibold text-[#0f172a]">
                        {row.hubCentrality.toFixed(3)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Risk Score</dt>
                      <dd className="mt-0.5 font-semibold text-[#0f766e]">
                        {formatFixed(row.projectedRiskScore, 1)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 720px) */}
            <div className="hidden overflow-x-auto min-[720px]:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.week}-${row.districtId}`}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold tabular-nums text-[#0f766e]">
                        W{row.week}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => onInspectDistrictAtWeek(row.districtId, row.week)}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#0f172a] underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#0f766e]"
                        >
                          <span>{row.districtName}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {formatZoneLabel(row.zoneType)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {row.interventionType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getRationaleBadgeClass(row.rationale)}`}
                        >
                          {row.rationale}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                        {formatFixed(row.icuLoadAtWeekStart, 1)} / {row.icuCapacity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.hubCentrality.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0f766e]">
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
    </div>
  );
}
