import type { PolicyGateSummary } from '@sennagrid/engine';

interface PolicyGatesPanelProps {
  gates: PolicyGateSummary;
}

export function PolicyGatesPanel({ gates }: PolicyGatesPanelProps) {
  const summaryTone =
    gates.overallStatus === 'FAIL'
      ? 'border-[var(--sg-rose-border)] bg-[var(--sg-rose-tint)] text-[var(--sg-rose-ink)]'
      : gates.overallStatus === 'REVIEW'
        ? 'border-[var(--sg-amber-border)] bg-[var(--sg-amber-tint)] text-[var(--sg-amber-ink)]'
        : 'border-[var(--sg-safe-border)] bg-[var(--sg-safe-tint)] text-[var(--sg-safe-ink)]';

  return (
    <section
      aria-label="Deterministic Policy Gates verification"
      data-tour="methodology-gates"
      className="scroll-mt-20 rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-6 transition-colors"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sg-border-subtle)] pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--sg-text-primary)] sm:text-[26px]">
            Policy &amp; Numerical Integrity Gates
          </h2>
          <p className="mt-1 text-sm text-[var(--sg-text-muted)]">
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

      <div className="grid grid-cols-1 divide-y divide-[var(--sg-border-subtle)] pt-5 min-[720px]:grid-cols-5 min-[720px]:divide-x min-[720px]:divide-y-0">
        {gates.gates.map((gate) => (
          <article
            key={gate.id}
            className="py-3.5 first:pt-0 last:pb-0 min-[720px]:px-4 min-[720px]:py-0 min-[720px]:first:pl-0 min-[720px]:last:pr-0"
          >
            <h3 className="text-[13px] font-medium text-[var(--sg-text-muted)]">{gate.label}</h3>
            <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-[var(--sg-text-primary)]">
              {gate.observed}
            </div>
            <div
              className={`mt-1.5 text-[13px] font-medium ${
                gate.passed ? 'text-[var(--sg-safe-ink)]' : 'text-[var(--sg-rose)]'
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
