import type { OptimizationOutput } from '@sennagrid/engine';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { formatFixed, summarizeSwapTrace } from '../../lib/viewModels';

interface SwapTracePanelProps {
  output: OptimizationOutput;
}

export function SwapTracePanel({ output }: SwapTracePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { swapTrace, evaluationsCount } = output;
  const summary = summarizeSwapTrace(swapTrace);

  return (
    <section
      aria-label="Stage 2 optimization swap trace"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="sg-swap-trace-body"
        className="flex min-h-[48px] w-full flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70"
      >
        <div className="flex items-center gap-2 text-xs">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          )}
          <span className="font-semibold text-[#0f172a]">Stage 2 Swap Trace</span>
          <span className="text-slate-600">
            · {summary.totalSwaps} accepted reallocations ({evaluationsCount} evaluated ·{' '}
            {formatFixed(summary.totalOverflowSavedBedDays, 1)} bed-days saved)
          </span>
        </div>

        <span className="text-xs font-medium text-[#0f766e]">
          {expanded ? 'Collapse Log' : 'Expand Log'}
        </span>
      </button>

      {expanded && (
        <div id="sg-swap-trace-body" className="border-t border-slate-100 px-5 pb-5 pt-3">
          {swapTrace.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-600">
              No Stage 2 swaps were needed. The Stage 1 receding-horizon seed remained locally
              optimal across all {evaluationsCount} evaluations.
            </p>
          ) : (
            <>
              {/* Mobile Stacked Log (< 720px) */}
              <div className="divide-y divide-slate-100 min-[720px]:hidden">
                {swapTrace.map((entry) => (
                  <article
                    key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}
                    className="space-y-1.5 py-3 text-xs"
                  >
                    <div className="flex justify-between font-mono text-slate-600">
                      <span>
                        #{entry.iteration} · P{entry.pass} · W{entry.week}
                      </span>
                      <span className="font-semibold text-[#065f46]">
                        +{entry.overflowDelta.toFixed(2)} bed-days
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#be123c]">{entry.removedDistrictName}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
                      <span className="font-semibold text-[#0f766e]">{entry.addedDistrictName}</span>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop Table (>= 720px) */}
              <div className="hidden max-h-80 overflow-auto min-[720px]:block">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-600">
                      <th scope="col" className="py-2 pr-3 font-mono">
                        ITER
                      </th>
                      <th scope="col" className="px-3 py-2 font-mono">
                        PASS
                      </th>
                      <th scope="col" className="px-3 py-2 font-mono">
                        WEEK
                      </th>
                      <th scope="col" className="px-3 py-2">
                        DISTRICT REALLOCATION
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-mono">
                        OVERFLOW SAVED
                      </th>
                      <th scope="col" className="py-2 pl-3 text-right font-mono">
                        COST DELTA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {swapTrace.map((entry) => (
                      <tr key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}>
                        <td className="whitespace-nowrap py-2.5 pr-3 font-mono tabular-nums text-slate-600">
                          #{entry.iteration}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-600">
                          P{entry.pass}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold tabular-nums text-[#0f172a]">
                          W{entry.week}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[#be123c]">{entry.removedDistrictName}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
                            <span className="font-semibold text-[#0f766e]">
                              {entry.addedDistrictName}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-[#065f46]">
                          {entry.overflowDelta >= 0 ? '+' : ''}
                          {entry.overflowDelta.toFixed(3)} bed-d
                        </td>
                        <td
                          className={`whitespace-nowrap py-2.5 pl-3 text-right font-mono tabular-nums ${
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
        </div>
      )}
    </section>
  );
}
