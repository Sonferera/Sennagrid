import type { OptimizationOutput } from '@sennagrid/engine';
import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { formatFixed, summarizeSwapTrace } from '../../lib/viewModels';

interface SwapTracePanelProps {
  output: OptimizationOutput;
}

export function SwapTracePanel({ output }: SwapTracePanelProps) {
  const { swapTrace, evaluationsCount } = output;
  const summary = summarizeSwapTrace(swapTrace);

  return (
    <section
      aria-label="Stage 2 optimization swap trace"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="flex items-start gap-2.5">
          <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Stage 2 Coordinate-Descent Audit Log
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Every accepted district reallocation during multi-pass search under the Hospital
              Safety Guardrail.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-700">
            Swaps: <strong className="text-[#0f766e]">{summary.totalSwaps}</strong>
          </span>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-700">
            Passes: <strong className="text-[#0f172a]">{summary.passesCompleted}</strong>
          </span>
          <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 font-semibold text-[#065f46]">
            Saved: +{formatFixed(summary.totalOverflowSavedBedDays, 1)} bed-days
          </span>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-600">
            Runs: {evaluationsCount}
          </span>
        </div>
      </div>

      {swapTrace.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-bold text-[#0f172a]">
            No Stage 2 swaps were needed for this configuration.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            The Stage 1 receding-horizon seed schedule was already locally optimal across all{' '}
            {evaluationsCount} candidate evaluations.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards (< 720px) */}
          <div className="divide-y divide-slate-200 min-[720px]:hidden">
            {swapTrace.map((entry) => (
              <article
                key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}
                className="space-y-2 p-4"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums">
                  <span className="text-slate-600">
                    Run #{entry.iteration} · Pass {entry.pass} · Week {entry.week}
                  </span>
                  <span
                    className={
                      entry.overflowDelta > 0
                        ? 'font-semibold text-[#065f46]'
                        : 'text-slate-600'
                    }
                  >
                    {entry.overflowDelta >= 0 ? '+' : ''}
                    {entry.overflowDelta.toFixed(2)} bed-days
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                  <span className="rounded-full border border-rose-500/30 bg-rose-50 px-2.5 py-0.5 text-[#9f1239]">
                    {entry.removedDistrictName}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="rounded-full border border-teal-600/30 bg-teal-50 px-2.5 py-0.5 text-[#115e59]">
                    {entry.addedDistrictName}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Tablet & Desktop Table (>= 720px) */}
          <div className="hidden max-h-88 overflow-auto min-[720px]:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th scope="col" className="px-4 py-2.5">
                    Eval
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Pass
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Week
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    District Reallocation
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Overflow Saved (bed-days)
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Objective Cost Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {swapTrace.map((entry) => (
                  <tr
                    key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-600">
                      #{entry.iteration}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-600">
                      P{entry.pass}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold tabular-nums text-[#0f766e]">
                      W{entry.week}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-[#be123c]">{entry.removedDistrictName}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        <span className="font-semibold text-[#0f766e]">{entry.addedDistrictName}</span>
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums ${
                        entry.overflowDelta > 0
                          ? 'font-semibold text-[#065f46]'
                          : 'text-slate-500'
                      }`}
                    >
                      {entry.overflowDelta >= 0 ? '+' : ''}
                      {entry.overflowDelta.toFixed(3)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums ${
                        entry.costDelta >= 0 ? 'text-[#0f766e]' : 'text-[#b45309]'
                      }`}
                    >
                      {entry.costDelta >= 0 ? '-' : '+'}
                      {formatFixed(Math.abs(entry.costDelta), 1)}
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
