import type { OptimizationOutput } from '@sennagrid/engine';
import { Building2, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import {
  formatFixed,
  formatInt,
  formatZoneLabel,
  getDistrictSnapshotAtDay,
} from '../../lib/viewModels';

interface DistrictInspectorProps {
  output: OptimizationOutput;
  selectedDistrictId: string | null;
  currentDay: number;
  onClose: () => void;
}

export function DistrictInspector({
  output,
  selectedDistrictId,
  currentDay,
  onClose,
}: DistrictInspectorProps) {
  const snapshot = selectedDistrictId
    ? getDistrictSnapshotAtDay(output, selectedDistrictId, currentDay)
    : null;

  if (!snapshot) {
    return (
      <section
        aria-label="District inspector"
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0f172a] px-4 py-3 text-xs text-slate-300"
      >
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-slate-100">No district selected.</strong> Click
            any polygon on either map or choose a district from the map selector to inspect
            side-by-side ICU demand and 91-day peak impact.
          </span>
        </div>
      </section>
    );
  }

  const { district, reactive, sennagrid, impact, hubCentrality, isTopQuartileHub, day, weekNumber } =
    snapshot;

  const reactivePct = Math.round(reactive.stress * 100);
  const optPct = Math.round(sennagrid.stress * 100);

  return (
    <section
      aria-label={`District inspector for ${district.name}`}
      className="rounded-lg border border-slate-700 bg-[#0f172a] p-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">{district.name}</h2>
            <span className="rounded border border-slate-600 bg-[#162033] px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
              {district.id}
            </span>
            <span className="rounded border border-slate-600 bg-[#162033] px-2 py-0.5 text-[11px] font-medium text-slate-200">
              {formatZoneLabel(district.zoneType)}
            </span>
            {isTopQuartileHub && (
              <span className="rounded border border-cyan-400/50 bg-[#083344] px-2 py-0.5 font-mono text-[11px] text-[#67e8f9]">
                Top 25% Mobility Hub
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-slate-300">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Pop: {formatInt(district.population)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              ICU Capacity: {district.icuBeds} beds
            </span>
            <span>Hub Centrality: {hubCentrality.toFixed(3)}</span>
            <span className="text-slate-400">
              Snapshot: Day {day} (Week {weekNumber})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close district inspector"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-500 bg-[#162033] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-slate-100 min-[720px]:min-h-[34px]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>Close</span>
        </button>
      </div>

      {/* Side-by-Side Current Day Comparison + 91-Day Peak Impact */}
      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
        {/* Reactive Baseline Card */}
        <div className="rounded-md border border-rose-500/30 bg-[#162033] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-rose-300">Reactive Baseline</span>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                reactive.treated
                  ? 'border-rose-400/50 bg-[#3b111c] text-[#fda4af]'
                  : 'border-slate-600 bg-[#0f172a] text-slate-400'
              }`}
            >
              {reactive.treated ? `Week ${weekNumber} Dispatched` : 'Standby'}
            </span>
          </div>

          <dl className="mt-2.5 space-y-1.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-slate-300">
              <dt>Active infections</dt>
              <dd className="font-semibold text-slate-100">{formatInt(reactive.activeInfections)}</dd>
            </div>
            <div className="flex justify-between text-slate-300">
              <dt>ICU demand</dt>
              <dd className={reactivePct >= 100 ? 'font-semibold text-rose-400' : 'text-slate-100'}>
                {formatFixed(reactive.icuDemand, 1)} / {district.icuBeds} beds ({reactivePct}%)
              </dd>
            </div>
            <div className="flex justify-between text-slate-300">
              <dt>Current overflow</dt>
              <dd className={reactive.overflowBeds > 0 ? 'font-semibold text-rose-400' : 'text-slate-400'}>
                {formatFixed(reactive.overflowBeds, 1)} beds
              </dd>
            </div>
          </dl>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#090d16]">
            <div
              className={`h-full rounded-full ${
                reactivePct >= 100
                  ? 'bg-rose-500'
                  : reactivePct >= 60
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
              }`}
              style={{ width: `${Math.min(100, reactivePct)}%` }}
            />
          </div>
        </div>

        {/* SennaGrid Optimized Card */}
        <div className="rounded-md border border-cyan-500/35 bg-[#162033] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-cyan-300">SennaGrid Optimized</span>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                sennagrid.treated
                  ? 'border-cyan-400/50 bg-[#083344] text-[#67e8f9]'
                  : 'border-slate-600 bg-[#0f172a] text-slate-400'
              }`}
            >
              {sennagrid.treated ? `Week ${weekNumber} Dispatched` : 'Standby'}
            </span>
          </div>

          <dl className="mt-2.5 space-y-1.5 font-mono text-xs tabular-nums">
            <div className="flex justify-between text-slate-300">
              <dt>Active infections</dt>
              <dd className="font-semibold text-slate-100">
                {formatInt(sennagrid.activeInfections)}
              </dd>
            </div>
            <div className="flex justify-between text-slate-300">
              <dt>ICU demand</dt>
              <dd className={optPct >= 100 ? 'font-semibold text-amber-300' : 'text-cyan-300'}>
                {formatFixed(sennagrid.icuDemand, 1)} / {district.icuBeds} beds ({optPct}%)
              </dd>
            </div>
            <div className="flex justify-between text-slate-300">
              <dt>Current overflow</dt>
              <dd
                className={
                  sennagrid.overflowBeds > 0 ? 'font-semibold text-amber-300' : 'text-emerald-400'
                }
              >
                {formatFixed(sennagrid.overflowBeds, 1)} beds
              </dd>
            </div>
          </dl>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#090d16]">
            <div
              className={`h-full rounded-full ${
                optPct >= 100 ? 'bg-rose-500' : optPct >= 60 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, optPct)}%` }}
            />
          </div>
        </div>

        {/* 91-Day Peak Impact Summary (Engine-Owned districtImpacts) */}
        <div className="rounded-md border border-slate-700 bg-[#162033] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-100">Full-Horizon Peak Impact</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>

          {impact ? (
            <dl className="mt-2.5 space-y-1.5 font-mono text-xs tabular-nums">
              <div className="flex justify-between text-slate-300">
                <dt>Peak active</dt>
                <dd>
                  <span className="text-rose-300">{formatInt(impact.reactivePeakActiveInfections)}</span>{' '}
                  -&gt;{' '}
                  <span className="text-cyan-300">
                    {formatInt(impact.optimizedPeakActiveInfections)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between text-slate-300">
                <dt>Peak ICU load</dt>
                <dd>
                  <span className="text-rose-300">{formatFixed(impact.reactivePeakIcuDemand, 1)}</span>{' '}
                  -&gt;{' '}
                  <span className="text-cyan-300">{formatFixed(impact.optimizedPeakIcuDemand, 1)}</span>
                </dd>
              </div>
              <div className="flex justify-between text-slate-300">
                <dt>Peak overflow</dt>
                <dd>
                  <span className="text-rose-300">
                    {formatFixed(impact.reactivePeakIcuOverflow, 1)}
                  </span>{' '}
                  -&gt;{' '}
                  <span className="text-emerald-400">
                    {formatFixed(impact.optimizedPeakIcuOverflow, 1)} beds
                  </span>
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-700/80 pt-1.5 text-slate-300">
                <dt>SennaGrid dispatch</dt>
                <dd className="font-semibold text-cyan-300">
                  {impact.interventionWeeks} / {output.sennagrid.schedule.length} weeks
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Peak summary unavailable for this district.</p>
          )}
        </div>
      </div>
    </section>
  );
}
