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
      className="rounded-lg border border-slate-800 bg-[#0f172a]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-4">
        <div className="flex items-start gap-2.5">
          <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Stage 2 Optimization Swap Trace
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Auditable multi-pass coordinate descent log showing every accepted district
              reallocation under the Hospital Safety Guardrail.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
          <span className="rounded border border-slate-700 bg-[#162033] px-2.5 py-1 text-slate-200">
            Accepted Swaps: <strong className="text-cyan-300">{summary.totalSwaps}</strong>
          </span>
          <span className="rounded border border-slate-700 bg-[#162033] px-2.5 py-1 text-slate-200">
            Passes: <strong className="text-slate-100">{summary.passesCompleted}</strong>
          </span>
          <span className="rounded border border-emerald-500/40 bg-[#082f23] px-2.5 py-1 text-[#6ee7b7]">
            Overflow Delta: +{formatFixed(summary.totalOverflowSavedBedDays, 1)} bed-days
          </span>
          <span className="rounded border border-slate-700 bg-[#162033] px-2.5 py-1 text-slate-300">
            Evaluations: {evaluationsCount}
          </span>
        </div>
      </div>

      {swapTrace.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-200">
            No Stage 2 swaps were accepted for this configuration.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            The Stage 1 receding-horizon seed schedule was already locally optimal within the{' '}
            {evaluationsCount}-evaluation search budget.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards (< 720px) */}
          <div className="divide-y divide-slate-800 min-[720px]:hidden">
            {swapTrace.map((entry) => (
              <article
                key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}
                className="space-y-2 p-4"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums">
                  <span className="text-slate-300">
                    Eval #{entry.iteration} · Pass {entry.pass} · Week {entry.week}
                  </span>
                  <span
                    className={
                      entry.overflowDelta > 0
                        ? 'font-semibold text-emerald-400'
                        : 'text-slate-300'
                    }
                  >
                    {entry.overflowDelta >= 0 ? '+' : ''}
                    {entry.overflowDelta.toFixed(3)} bed-days
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded border border-rose-500/40 bg-[#3b111c] px-2 py-0.5 text-[#fda4af]">
                    {entry.removedDistrictName}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="rounded border border-cyan-500/40 bg-[#083344] px-2 py-0.5 text-[#67e8f9]">
                    {entry.addedDistrictName}
                  </span>
                </div>

                <div className="font-mono text-[11px] tabular-nums text-slate-400">
                  Cost J delta: {entry.costDelta >= 0 ? '-' : '+'}
                  {formatFixed(Math.abs(entry.costDelta), 1)} (
                  {formatFixed(entry.costBefore, 0)} -&gt; {formatFixed(entry.costAfter, 0)})
                </div>
              </article>
            ))}
          </div>

          {/* Tablet & Desktop Table (>= 720px) */}
          <div className="hidden max-h-96 overflow-auto min-[720px]:block">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#162033]">
                <tr className="border-b border-slate-800 font-mono text-[11px] uppercase tracking-[0.06em] text-slate-300">
                  <th scope="col" className="px-4 py-2.5">
                    Eval #
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Pass
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Week
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Reallocation (Removed -&gt; Added)
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Overflow Saved (bed-days)
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Objective Cost Delta (J)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {swapTrace.map((entry) => (
                  <tr
                    key={`${entry.iteration}-${entry.pass}-${entry.week}-${entry.addedDistrictId}`}
                    className="hover:bg-[#162033]/60"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-300">
                      #{entry.iteration}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-300">
                      P{entry.pass}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-cyan-300">
                      W{entry.week}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-rose-300">{entry.removedDistrictName}</span>
                      <span className="mx-2 font-mono text-slate-400">-&gt;</span>
                      <span className="font-medium text-cyan-300">{entry.addedDistrictName}</span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums ${
                        entry.overflowDelta > 0
                          ? 'font-semibold text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.overflowDelta >= 0 ? '+' : ''}
                      {entry.overflowDelta.toFixed(3)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums ${
                        entry.costDelta >= 0 ? 'text-cyan-300' : 'text-amber-300'
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
