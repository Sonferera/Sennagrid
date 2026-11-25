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
 * Contextual district breakdown shown below maps ONLY when a ward is clicked or selected.
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
      className="border-t border-[#e0dbd0] bg-[#f5f2eb] px-5 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5 text-sm">
          <span className="rounded bg-[#1c1917] px-2 py-0.5 font-mono text-xs font-semibold text-[#fbf9f5]">
            {shortCode}
          </span>
          <h3 className="text-[15px] font-bold text-[#1c1917]">{district.name}</h3>
          <span className="text-[13px] text-[#57534e]">
            {formatZoneLabel(district.zoneType)} · {formatInt(district.population)} pop ·{' '}
            {district.icuBeds} ICU beds · Hub {hubCentrality.toFixed(2)}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${district.name} details`}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#d6d0c4] bg-[#fbf9f5] text-[#57534e] transition-colors hover:bg-[#eee9df] hover:text-[#1c1917] min-[720px]:min-h-[34px] min-[720px]:min-w-[34px]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
        <div className="rounded-lg border border-[#e0dbd0] bg-[#fbf9f5] px-4 py-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[#be123c]">Without SennaGrid (Day {day})</span>
            <span className="font-mono text-xs text-[#57534e]">
              {reactive.treated ? `Active W${weekNumber}` : 'Standby'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-[13px] tabular-nums">
            <span className="text-[#57534e]">{formatInt(reactive.activeInfections)} active cases</span>
            <span className={reactivePct >= 100 ? 'font-bold text-[#be123c]' : 'font-semibold text-[#1c1917]'}>
              {formatFixed(reactive.icuDemand, 1)} / {district.icuBeds} ({reactivePct}%)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#e0dbd0] bg-[#fbf9f5] px-4 py-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[#0f766e]">With SennaGrid (Day {day})</span>
            <span className="font-mono text-xs text-[#0f766e]">
              {sennagrid.treated ? `Team Active W${weekNumber}` : 'Standby'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between font-mono text-[13px] tabular-nums">
            <span className="text-[#57534e]">{formatInt(sennagrid.activeInfections)} active cases</span>
            <span className={optPct >= 100 ? 'font-bold text-[#b45309]' : 'font-semibold text-[#0f766e]'}>
              {formatFixed(sennagrid.icuDemand, 1)} / {district.icuBeds} ({optPct}%)
            </span>
          </div>
        </div>

        {impact && (
          <div className="rounded-lg border border-[#e0dbd0] bg-[#fbf9f5] px-4 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-[#1c1917]">91-Day Peak Horizon</span>
              <span className="font-mono text-xs text-[#0f766e]">
                {impact.interventionWeeks} / {output.sennagrid.schedule.length} wks covered
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono text-[13px] tabular-nums text-[#57534e]">
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
 * Warm paper tabular Watchlist view toggled cleanly inside the spatial card.
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
    <div className="max-h-[450px] overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-[#e0dbd0] bg-[#eee9df] text-xs font-semibold text-[#44403c]">
          <tr>
            <th scope="col" className="px-4 py-3">
              District
            </th>
            <th scope="col" className="px-4 py-3">
              Zone
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              ICU Beds
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Without SennaGrid Peak
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              With SennaGrid Peak
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Weeks Covered
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e9e4da]">
          {watchlist.map((item) => {
            const rPct = Math.round(item.reactivePeakStress * 100);
            const sPct = Math.round(item.optimizedPeakStress * 100);
            const selected = item.district.id === selectedDistrictId;

            return (
              <tr
                key={item.district.id}
                className={selected ? 'bg-[#edf6f4]' : 'hover:bg-[#f5f2eb]'}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(item.district.id)}
                    className="inline-flex min-h-[44px] items-center gap-2 text-left font-semibold text-[#1c1917] hover:text-[#0f766e] min-[720px]:min-h-0"
                  >
                    <span className="rounded bg-[#eee9df] px-2 py-0.5 font-mono text-xs font-semibold text-[#44403c]">
                      {item.shortCode}
                    </span>
                    <span>{item.district.name}</span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#57534e]">
                  {formatZoneLabel(item.district.zoneType)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-[#57534e]">
                  {item.district.icuBeds}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                    rPct >= 100
                      ? 'text-[#be123c]'
                      : rPct >= 60
                        ? 'text-[#b45309]'
                        : 'text-[#44403c]'
                  }`}
                >
                  {rPct}%
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                    sPct >= 100
                      ? 'text-[#be123c]'
                      : sPct >= 60
                        ? 'text-[#b45309]'
                        : 'text-[#0f766e]'
                  }`}
                >
                  {sPct}%
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-[#57534e]">
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
