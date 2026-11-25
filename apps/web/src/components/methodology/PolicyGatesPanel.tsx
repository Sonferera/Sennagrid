import type { PolicyGateSummary } from '@sennagrid/engine';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

interface PolicyGatesPanelProps {
  gates: PolicyGateSummary;
}

export function PolicyGatesPanel({ gates }: PolicyGatesPanelProps) {
  const statusBadgeClass =
    gates.overallStatus === 'PASS'
      ? 'border-emerald-500/50 bg-[#082f23] text-[#6ee7b7]'
      : gates.overallStatus === 'REVIEW'
        ? 'border-amber-500/50 bg-[#2e1f07] text-[#fcd34d]'
        : 'border-rose-500/50 bg-[#3b111c] text-[#fda4af]';

  return (
    <section
      aria-label="Deterministic Policy Gates verification"
      className="rounded-lg border border-slate-800 bg-[#0f172a]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
        <div className="flex items-start gap-2.5">
          {gates.overallStatus === 'PASS' ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Policy Gates (Deterministic Verification)
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Five automated mathematical and operational invariants checked on every optimization
              run.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${statusBadgeClass}`}
          >
            {gates.overallStatus === 'PASS' ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            )}
            <span>STATUS: {gates.overallStatus}</span>
          </span>
          <div className="rounded-md border border-slate-700 bg-[#162033] px-3 py-1.5 text-xs">
            <span className="text-slate-400">Readiness: </span>
            <strong className="text-slate-100">{gates.readinessScore}/100</strong>
            <span className="ml-2 text-slate-400">
              ({gates.passedCount}/{gates.totalGates} passed)
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Stacked Gate Rows (< 720px) */}
      <div className="divide-y divide-slate-800 min-[720px]:hidden">
        {gates.gates.map((gate) => (
          <div key={gate.id} className="space-y-1.5 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-100">{gate.label}</span>
              <span
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                  gate.passed
                    ? 'border-emerald-500/40 bg-[#082f23] text-[#6ee7b7]'
                    : 'border-rose-500/40 bg-[#3b111c] text-[#fda4af]'
                }`}
              >
                {gate.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{gate.passed ? 'PASS' : 'FAIL'}</span>
              </span>
            </div>
            <div className="font-mono text-xs text-slate-200">Observed: {gate.observed}</div>
            <div className="font-mono text-[11px] text-slate-400">
              Threshold: {gate.threshold}
            </div>
          </div>
        ))}
      </div>

      {/* Tablet & Desktop Table (>= 720px) */}
      <div className="hidden overflow-x-auto min-[720px]:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-[#162033] font-mono text-[11px] uppercase tracking-[0.06em] text-slate-300">
              <th scope="col" className="px-4 py-3">
                Policy Gate
              </th>
              <th scope="col" className="px-4 py-3">
                Result
              </th>
              <th scope="col" className="px-4 py-3">
                Observed Value
              </th>
              <th scope="col" className="px-4 py-3">
                Required Threshold
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {gates.gates.map((gate) => (
              <tr key={gate.id} className="hover:bg-[#162033]/60">
                <td className="px-4 py-3 font-medium text-slate-100">{gate.label}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                      gate.passed
                        ? 'border-emerald-500/40 bg-[#082f23] text-[#6ee7b7]'
                        : 'border-rose-500/40 bg-[#3b111c] text-[#fda4af]'
                    }`}
                  >
                    {gate.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{gate.passed ? 'PASS' : 'FAIL'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-slate-200">
                  {gate.observed}
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{gate.threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
