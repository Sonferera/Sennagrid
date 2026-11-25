import type { PolicyGateSummary } from '@sennagrid/engine';

interface PolicyGatesPanelProps {
  gates: PolicyGateSummary;
}

export function PolicyGatesPanel({ gates }: PolicyGatesPanelProps) {
  const summaryTone =
    gates.overallStatus === 'FAIL'
      ? 'border-rose-200 bg-rose-50 text-[#9f1239]'
      : gates.overallStatus === 'REVIEW'
        ? 'border-amber-200 bg-amber-50 text-[#92400e]'
        : 'border-emerald-200 bg-emerald-50 text-[#065f46]';

  return (
    <section
      aria-label="Deterministic Policy Gates verification"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
            Policy &amp; Numerical Integrity Gates
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Five deterministic mathematical checks verified automatically on every optimization run.
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums ${summaryTone}`}
        >
          Readiness {gates.readinessScore} / 100 · {gates.passedCount} / {gates.totalGates}{' '}
          {gates.overallStatus === 'PASS' ? 'Passed' : gates.overallStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 pt-5 min-[720px]:grid-cols-5 min-[720px]:divide-x min-[720px]:divide-y-0">
        {gates.gates.map((gate) => (
          <article key={gate.id} className="py-3 first:pt-0 last:pb-0 min-[720px]:px-4 min-[720px]:py-0 min-[720px]:first:pl-0 min-[720px]:last:pr-0">
            <h3 className="text-xs font-medium text-slate-600">{gate.label}</h3>
            <div className="mt-2 font-mono text-lg font-semibold tabular-nums text-[#0f172a]">
              {gate.observed}
            </div>
            <div
              className={`mt-1.5 text-xs font-medium ${
                gate.passed ? 'text-[#065f46]' : 'text-[#be123c]'
              }`}
            >
              Target {gate.threshold} · {gate.passed ? 'Pass' : 'Fail'}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
