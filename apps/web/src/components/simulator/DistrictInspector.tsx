import type { OptimizationOutput } from '@sennagrid/engine';
import { ArrowLeft, Building2, ShieldCheck, Users } from 'lucide-react';
import { useMemo } from 'react';
import {
  buildDistrictWatchlist,
  formatFixed,
  formatInt,
  formatZoneLabel,
  getDistrictSnapshotAtDay,
} from '../../lib/viewModels';

interface DistrictInspectorProps {
  output: OptimizationOutput;
  selectedDistrictId: string | null;
  currentDay: number;
  onSelectDistrict: (districtId: string | null) => void;
}

export function DistrictInspector({
  output,
  selectedDistrictId,
  currentDay,
  onSelectDistrict,
}: DistrictInspectorProps) {
  const snapshot = selectedDistrictId
    ? getDistrictSnapshotAtDay(output, selectedDistrictId, currentDay)
    : null;

  const watchlist = useMemo(
    () => buildDistrictWatchlist(output, currentDay),
    [output, currentDay],
  );

  if (!snapshot) {
    return (
      <aside
        aria-label="District ICU vulnerability watchlist"
        className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-2xs"
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0f172a]">District ICU Watchlist</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
              {watchlist.length} wards
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Ranked by peak baseline ICU pressure. Click any ward to compare strategies.
          </p>
        </div>

        <div className="max-h-[430px] flex-1 divide-y divide-slate-100 overflow-y-auto">
          {watchlist.map((item) => {
            const rPeakPct = Math.round(item.reactivePeakStress * 100);
            const sPeakPct = Math.round(item.optimizedPeakStress * 100);
            return (
              <button
                key={item.district.id}
                type="button"
                onClick={() => onSelectDistrict(item.district.id)}
                className="flex min-h-[44px] w-full flex-col gap-1.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                      {item.shortCode}
                    </span>
                    <span className="text-xs font-bold text-[#0f172a]">{item.district.name}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {formatZoneLabel(item.district.zoneType)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                  <span
                    className={
                      rPeakPct >= 100 ? 'font-semibold text-[#be123c]' : 'text-slate-600'
                    }
                  >
                    Baseline peak: {rPeakPct}%
                  </span>
                  <span className="font-semibold text-[#0f766e]">
                    SennaGrid: {sPeakPct}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        rPeakPct >= 100 ? 'bg-rose-500' : rPeakPct >= 60 ? 'bg-amber-400' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, rPeakPct)}%` }}
                    />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        sPeakPct >= 100 ? 'bg-rose-500' : sPeakPct >= 60 ? 'bg-amber-400' : 'bg-[#0d9488]'
                      }`}
                      style={{ width: `${Math.min(100, sPeakPct)}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  const {
    district,
    shortCode,
    reactive,
    sennagrid,
    impact,
    hubCentrality,
    isTopQuartileHub,
    day,
    weekNumber,
  } = snapshot;

  const reactivePct = Math.round(reactive.stress * 100);
  const optPct = Math.round(sennagrid.stress * 100);

  return (
    <aside
      aria-label={`District inspector for ${district.name}`}
      className="flex h-full flex-col rounded-xl border border-slate-300 bg-white shadow-xs"
    >
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectDistrict(null)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-500 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 min-[720px]:min-h-[30px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Wards</span>
          </button>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
            Day {day} · W{weekNumber}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
            {shortCode}
          </span>
          <h2 className="text-base font-bold text-[#0f172a]">{district.name}</h2>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
            {formatZoneLabel(district.zoneType)}
          </span>
          {isTopQuartileHub && (
            <span className="rounded-full border border-teal-600/30 bg-teal-50 px-2 py-0.5 font-semibold text-[#115e59]">
              Top 25% Mobility Hub
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {formatInt(district.population)} pop
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {district.icuBeds} ICU beds
          </span>
          <span>Hub {hubCentrality.toFixed(2)}</span>
        </div>
      </div>

      {/* Comparison Body */}
      <div className="flex-1 space-y-3 p-4">
        {/* Reactive Baseline */}
        <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#9f1239]">Reactive Baseline</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                reactive.treated
                  ? 'border border-rose-500/40 bg-rose-100 text-[#9f1239]'
                  : 'border border-slate-300 bg-white text-slate-600'
              }`}
            >
              {reactive.treated ? 'Team Active' : 'Standby'}
            </span>
          </div>

          <dl className="mt-2 space-y-1 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-slate-600">
              <dt>Active infections</dt>
              <dd className="font-semibold text-[#0f172a]">{formatInt(reactive.activeInfections)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>ICU demand</dt>
              <dd className={reactivePct >= 100 ? 'font-bold text-[#be123c]' : 'font-semibold text-[#0f172a]'}>
                {formatFixed(reactive.icuDemand, 1)} / {district.icuBeds} ({reactivePct}%)
              </dd>
            </div>
          </dl>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div
              className={`h-full rounded-full ${
                reactivePct >= 100 ? 'bg-rose-500' : reactivePct >= 60 ? 'bg-amber-500' : 'bg-slate-400'
              }`}
              style={{ width: `${Math.min(100, reactivePct)}%` }}
            />
          </div>
        </div>

        {/* SennaGrid Optimized */}
        <div className="rounded-lg border border-teal-200 bg-teal-50/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#115e59]">SennaGrid Optimized</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                sennagrid.treated
                  ? 'border border-teal-600/40 bg-teal-100 text-[#115e59]'
                  : 'border border-slate-300 bg-white text-slate-600'
              }`}
            >
              {sennagrid.treated ? 'Team Active' : 'Standby'}
            </span>
          </div>

          <dl className="mt-2 space-y-1 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-slate-600">
              <dt>Active infections</dt>
              <dd className="font-semibold text-[#0f172a]">
                {formatInt(sennagrid.activeInfections)}
              </dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>ICU demand</dt>
              <dd className={optPct >= 100 ? 'font-bold text-[#b45309]' : 'font-semibold text-[#0f766e]'}>
                {formatFixed(sennagrid.icuDemand, 1)} / {district.icuBeds} ({optPct}%)
              </dd>
            </div>
          </dl>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
            <div
              className={`h-full rounded-full ${
                optPct >= 100 ? 'bg-rose-500' : optPct >= 60 ? 'bg-amber-400' : 'bg-[#0d9488]'
              }`}
              style={{ width: `${Math.min(100, optPct)}%` }}
            />
          </div>
        </div>

        {/* Full 91-Day Peak Summary */}
        {impact && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#0f172a]">91-Day Horizon Peak</span>
              <ShieldCheck className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
            </div>
            <dl className="mt-2 space-y-1 font-mono text-[11px] tabular-nums text-slate-600">
              <div className="flex justify-between">
                <dt>Peak active cases</dt>
                <dd className="font-semibold text-[#0f172a]">
                  {formatInt(impact.reactivePeakActiveInfections)} vs{' '}
                  <span className="text-[#0f766e]">
                    {formatInt(impact.optimizedPeakActiveInfections)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Peak ICU overflow</dt>
                <dd className="font-semibold text-[#0f172a]">
                  {formatFixed(impact.reactivePeakIcuOverflow, 1)} vs{' '}
                  <span className="text-[#0f766e]">
                    {formatFixed(impact.optimizedPeakIcuOverflow, 1)} beds
                  </span>
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <dt>SennaGrid coverage</dt>
                <dd className="font-semibold text-[#0f766e]">
                  {impact.interventionWeeks} of {output.sennagrid.schedule.length} weeks
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </aside>
  );
}
