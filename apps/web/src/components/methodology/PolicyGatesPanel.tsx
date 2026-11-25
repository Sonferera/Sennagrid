import type { PolicyGateSummary } from '@sennagrid/engine';
import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';

interface PolicyGatesPanelProps {
  gates: PolicyGateSummary;
}

export function PolicyGatesPanel({ gates }: PolicyGatesPanelProps) {
  const statusBadgeClass =
    gates.overallStatus === 'PASS'
      ? 'border-emerald-600/40 bg-emerald-50 text-[#065f46]'
      : gates.overallStatus === 'REVIEW'
        ? 'border-amber-600/40 bg-amber-50 text-[#92400e]'
        : 'border-rose-600/40 bg-rose-50 text-[#9f1239]';

  return (
    <section
      aria-label="Deterministic Policy Gates verification"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div className="flex items-start gap-2.5">
          {gates.overallStatus === 'PASS' ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#b45309]" aria-hidden="true" />
          )}
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Policy &amp; Numerical Integrity Gates
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Five deterministic mathematical invariants verified on every optimization run.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono tabular-nums">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass}`}
          >
            {gates.overallStatus === 'PASS' ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            )}
            <span>STATUS: {gates.overallStatus}</span>
          </span>
          <div className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs">
            <span className="text-slate-600">Readiness: </span>
            <strong className="text-[#0f172a]">{gates.readinessScore}/100</strong>
            <span className="ml-1.5 text-slate-500">
              ({gates.passedCount}/{gates.totalGates} passed)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 min-[720px]:grid-cols-5">
        {gates.gates.map((gate) => (
          <article
            key={gate.id}
            className={`flex flex-col justify-between rounded-lg border p-3 ${
              gate.passed
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-rose-200 bg-rose-50/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-bold text-[#0f172a]">{gate.label}</h3>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
                  gate.passed
                    ? 'border-emerald-600/30 bg-emerald-100 text-[#065f46]'
                    : 'border-rose-600/30 bg-rose-100 text-[#9f1239]'
                }`}
              >
                {gate.passed ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{gate.passed ? 'PASS' : 'FAIL'}</span>
              </span>
            </div>

            <div className="mt-3 space-y-1 font-mono text-[11px] tabular-nums">
              <div className="text-slate-700">
                <span className="text-slate-500">Observed: </span>
                <strong className="text-[#0f172a]">{gate.observed}</strong>
              </div>
              <div className="text-slate-500">Target: {gate.threshold}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
