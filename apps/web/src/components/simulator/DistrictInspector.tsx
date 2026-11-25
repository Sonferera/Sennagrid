import type { OptimizationOutput } from '@sennagrid/engine';
import { X } from 'lucide-react';
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
  selectedDistrictId: string;
  currentDay: number;
  onClose: () => void;
}

/**
 * Clean contextual drawer-strip shown inside the Spatial card ONLY when a user clicks a ward.
 */
export function DistrictInspector({
  output,
  selectedDistrictId,
  currentDay,
  onClose,
}: DistrictInspectorProps) {
  const snapshot = getDistrictSnapshotAtDay(output, selectedDistrictId, currentDay);
  if (!snapshot) return null;

  const { district, shortCode, reactive, sennagrid, impact, hubCentrality, day, weekNumber } =
    snapshot;
  const reactivePct = Math.round(reactive.stress * 100);
  const optPct = Math.round(sennagrid.stress * 100);

  return (
    <section
      aria-label={`District comparison for ${district.name}`}
      className="border-t border-slate-200 bg-slate-50/75 px-5 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-[#0f172a] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
            {shortCode}
          </span>
          <h3 className="text-sm font-bold text-[#0f172a]">{district.name}</h3>
          <span className="text-slate-600">
            {formatZoneLabel(district.zoneType)} · {formatInt(district.population)} pop ·{' '}
            {district.icuBeds} ICU beds · Hub {hubCentrality.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${district.name} details`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0f172a] min-[720px]:min-h-[30px] min-[720px]:min-w-[30px]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#be123c]">Without SennaGrid (Day {day})</span>
            <span className="font-mono text-[11px] text-slate-600">
              {reactive.treated ? `Active W${weekNumber}` : 'Standby'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-xs tabular-nums">
            <span className="text-slate-600">{formatInt(reactive.activeInfections)} active cases</span>
            <span className={reactivePct >= 100 ? 'font-bold text-[#be123c]' : 'font-semibold text-[#0f172a]'}>
              {formatFixed(reactive.icuDemand, 1)} / {district.icuBeds} ({reactivePct}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0f766e]">With SennaGrid (Day {day})</span>
            <span className="font-mono text-[11px] text-[#0f766e]">
              {sennagrid.treated ? `Team Active W${weekNumber}` : 'Standby'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-xs tabular-nums">
            <span className="text-slate-600">{formatInt(sennagrid.activeInfections)} active cases</span>
            <span className={optPct >= 100 ? 'font-bold text-[#b45309]' : 'font-semibold text-[#0f766e]'}>
              {formatFixed(sennagrid.icuDemand, 1)} / {district.icuBeds} ({optPct}%)
            </span>
          </div>
        </div>

        {impact && (
          <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0f172a]">91-Day Peak Horizon</span>
              <span className="font-mono text-[11px] text-[#0f766e]">
                {impact.interventionWeeks} / {output.sennagrid.schedule.length} wks covered
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono text-xs tabular-nums text-slate-600">
              <span>
                Peak overflow: {formatFixed(impact.reactivePeakIcuOverflow, 1)} vs{' '}
                <strong className="text-[#0f766e]">
                  {formatFixed(impact.optimizedPeakIcuOverflow, 1)} beds
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface DistrictWatchlistGridProps {
  output: OptimizationOutput;
  selectedDistrictId: string | null;
  currentDay: number;
  onSelectDistrict: (districtId: string) => void;
}

/**
 * Clean tabular grid alternate view ("Watchlist") inside the spatial card, toggled via Map | Watchlist.
 */
export function DistrictWatchlistGrid({
  output,
  selectedDistrictId,
  currentDay,
  onSelectDistrict,
}: DistrictWatchlistGridProps) {
  const watchlist = useMemo(
    () => buildDistrictWatchlist(output, currentDay),
    [output, currentDay],
  );

  return (
    <div className="max-h-[430px] overflow-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-2.5">
              District
            </th>
            <th scope="col" className="px-4 py-2.5">
              Zone
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              ICU Beds
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              Without SennaGrid Peak
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              With SennaGrid Peak
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              Weeks Covered
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {watchlist.map((item) => {
            const rPct = Math.round(item.reactivePeakStress * 100);
            const sPct = Math.round(item.optimizedPeakStress * 100);
            const selected = item.district.id === selectedDistrictId;

            return (
              <tr
                key={item.district.id}
                className={selected ? 'bg-[#f0fdfa]' : 'hover:bg-slate-50'}
              >
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(item.district.id)}
                    className="inline-flex min-h-[44px] items-center gap-2 text-left font-semibold text-[#0f172a] hover:text-[#0f766e] min-[720px]:min-h-0"
                  >
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                      {item.shortCode}
                    </span>
                    <span>{item.district.name}</span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {formatZoneLabel(item.district.zoneType)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                  {item.district.icuBeds}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                    rPct >= 100
                      ? 'text-[#be123c]'
                      : rPct >= 60
                        ? 'text-[#b45309]'
                        : 'text-slate-700'
                  }`}
                >
                  {rPct}%
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                    sPct >= 100
                      ? 'text-[#be123c]'
                      : sPct >= 60
                        ? 'text-[#b45309]'
                        : 'text-[#0f766e]'
                  }`}
                >
                  {sPct}%
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                  {item.interventionWeeks} wks
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
