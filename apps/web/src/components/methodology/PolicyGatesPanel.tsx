import type { PolicyGateSummary } from '@sennagrid/engine';

interface PolicyGatesPanelProps {
  gates: PolicyGateSummary;
}

export function PolicyGatesPanel({ gates }: PolicyGatesPanelProps) {
  const summaryTone =
    gates.overallStatus === 'FAIL'
      ? 'border-[#e7b4bd] bg-[#fdf0f2] text-[#9f1239]'
      : gates.overallStatus === 'REVIEW'
        ? 'border-[#ebd69c] bg-[#fcf6e8] text-[#92400e]'
        : 'border-[#b9dfd0] bg-[#e9f5ef] text-[#065f46]';

  return (
    <section
      aria-label="Deterministic Policy Gates verification"
      className="rounded-xl border border-[#e0dbd0] bg-[#fbf9f5] p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e0dbd0] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1c1917] sm:text-[26px]">
            Policy &amp; Numerical Integrity Gates
          </h2>
          <p className="mt-1 text-sm text-[#57534e]">
            Five deterministic mathematical checks verified automatically on every optimization run.
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-lg border px-3.5 py-2 font-mono text-[13px] font-semibold tabular-nums ${summaryTone}`}
        >
          Readiness {gates.readinessScore} / 100 · {gates.passedCount} / {gates.totalGates}{' '}
          {gates.overallStatus === 'PASS' ? 'Passed' : gates.overallStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-[#e0dbd0] pt-5 min-[720px]:grid-cols-5 min-[720px]:divide-x min-[720px]:divide-y-0">
        {gates.gates.map((gate) => (
          <article
            key={gate.id}
            className="py-3.5 first:pt-0 last:pb-0 min-[720px]:px-4 min-[720px]:py-0 min-[720px]:first:pl-0 min-[720px]:last:pr-0"
          >
            <h3 className="text-[13px] font-medium text-[#57534e]">{gate.label}</h3>
            <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#1c1917]">
              {gate.observed}
            </div>
            <div
              className={`mt-1.5 text-[13px] font-medium ${
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
