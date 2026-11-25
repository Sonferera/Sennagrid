import type { OptimizationOutput } from '@sennagrid/engine';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Cpu,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import {
  buildExecutiveNarrative,
  buildKpiViewModel,
  formatFixed,
  formatInt,
} from '../../lib/viewModels';

interface KpiStripProps {
  output: OptimizationOutput;
  isOptimizing: boolean;
  onInspectGates: () => void;
}

export function KpiStrip({ output, isOptimizing, onInspectGates }: KpiStripProps) {
  const vm = buildKpiViewModel(output);
  const narrative = buildExecutiveNarrative(output);

  const maxCollapseDays = Math.max(1, vm.collapse.reactiveDays, vm.collapse.optimizedDays);
  const reactiveCollapsePct = (vm.collapse.reactiveDays / maxCollapseDays) * 100;
  const optCollapsePct = (vm.collapse.optimizedDays / maxCollapseDays) * 100;

  const maxBedDays = Math.max(
    1,
    vm.icuOverflow.reactiveTotalBedDays,
    vm.icuOverflow.optimizedTotalBedDays,
  );
  const reactiveBedDaysPct = (vm.icuOverflow.reactiveTotalBedDays / maxBedDays) * 100;
  const optBedDaysPct = (vm.icuOverflow.optimizedTotalBedDays / maxBedDays) * 100;

  const collapsePillClass =
    vm.collapse.tone === 'positive'
      ? 'border-emerald-600/30 bg-emerald-50 text-[#065f46]'
      : vm.collapse.tone === 'tradeoff'
        ? 'border-amber-600/30 bg-amber-50 text-[#92400e]'
        : 'border-slate-300 bg-slate-100 text-slate-700';

  const casesPillClass = vm.casesImpact.isTradeoff
    ? 'border-amber-600/30 bg-amber-50 text-[#92400e]'
    : vm.casesImpact.tone === 'positive'
      ? 'border-teal-600/30 bg-teal-50 text-[#115e59]'
      : 'border-slate-300 bg-slate-100 text-slate-700';

  const gatePillClass =
    vm.readiness.gateStatus === 'PASS'
      ? 'border-emerald-600/40 bg-emerald-50 text-[#065f46]'
      : vm.readiness.gateStatus === 'REVIEW'
        ? 'border-amber-600/40 bg-amber-50 text-[#92400e]'
        : 'border-rose-600/40 bg-rose-50 text-[#9f1239]';

  return (
    <section
      aria-label="Simulation impact overview"
      className={`space-y-3 ${isOptimizing ? 'opacity-80 transition-opacity' : ''}`}
    >
      {/* Plain-Language Executive Takeaway Banner */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50/90 via-white to-white px-4 py-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0f766e] text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">{narrative.headline}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{narrative.detail}</p>
          </div>
        </div>
      </div>

      {/* 4 Clean Visual Comparison Metric Cards */}
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4">
        {/* Card 1: Hospital Collapse Days */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">Hospital Collapse Days</span>
            <HeartPulse className="h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-2xl font-bold text-[#0f172a]">
                {vm.collapse.optimizedDays}
              </span>
              <span className="text-xs font-medium text-slate-600">days</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${collapsePillClass}`}
            >
              {vm.collapse.tone === 'positive' && (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{vm.collapse.badgeText}</span>
            </span>
          </div>

          <div className="mt-3 space-y-1.5 text-[11px]">
            <div className="space-y-0.5">
              <div className="flex justify-between font-mono tabular-nums text-slate-600">
                <span>Reactive Baseline</span>
                <span className="font-semibold text-[#be123c]">{vm.collapse.reactiveDays} days</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${vm.collapse.reactiveDays > 0 ? Math.max(8, reactiveCollapsePct) : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between font-mono tabular-nums text-slate-600">
                <span>SennaGrid Optimized</span>
                <span className="font-semibold text-[#0f766e]">{vm.collapse.optimizedDays} days</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#0d9488]"
                  style={{ width: `${vm.collapse.optimizedDays > 0 ? Math.max(8, optCollapsePct) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Peak & Cumulative ICU Overflow */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">Peak ICU Overflow</span>
            <BedDouble className="h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-[#0f172a]">
                {formatFixed(vm.icuOverflow.optimizedPeakBeds, 1)}
              </span>
              <span className="ml-1 text-xs font-sans font-medium text-slate-600">peak beds</span>
            </div>
            {vm.icuOverflow.peakBedsPrevented > 0 && (
              <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#065f46]">
                -{formatFixed(vm.icuOverflow.peakBedsPrevented, 1)} beds saved
              </span>
            )}
          </div>

          <div className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between font-mono tabular-nums text-slate-600">
              <span>Reactive total</span>
              <span className="font-semibold text-[#be123c]">
                {formatFixed(vm.icuOverflow.reactiveTotalBedDays, 1)} bed-days
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${vm.icuOverflow.reactiveTotalBedDays > 0 ? Math.max(8, reactiveBedDaysPct) : 0}%` }}
              />
            </div>
            <div className="flex justify-between font-mono tabular-nums text-slate-600">
              <span>SennaGrid total</span>
              <span className="font-semibold text-[#0f766e]">
                {formatFixed(vm.icuOverflow.optimizedTotalBedDays, 1)} bed-days
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0d9488]"
                style={{ width: `${vm.icuOverflow.optimizedTotalBedDays > 0 ? Math.max(8, optBedDaysPct) : 0}%` }}
              />
            </div>
          </div>
        </article>

        {/* Card 3: Cumulative Infections (Honest Signed Framing) */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">{vm.casesImpact.label}</span>
            {vm.casesImpact.isTradeoff ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#b45309]" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 font-mono tabular-nums">
            <span
              className={`text-2xl font-bold ${
                vm.casesImpact.isTradeoff ? 'text-[#b45309]' : 'text-[#0f172a]'
              }`}
            >
              {vm.casesImpact.signedHeadline}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${casesPillClass}`}
            >
              {vm.casesImpact.signedPctLabel}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-[11px] leading-snug text-slate-600">{vm.casesImpact.contextNote}</p>
            <p className="font-mono text-[11px] tabular-nums text-slate-500">
              {formatInt(vm.casesImpact.reactiveCumulative)} baseline vs{' '}
              {formatInt(vm.casesImpact.optimizedCumulative)} optimized
            </p>
          </div>
        </article>

        {/* Card 4: Policy Readiness & Compute */}
        <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">Policy &amp; Solver Audit</span>
            <Cpu className="h-4 w-4 shrink-0 text-[#0f766e]" aria-hidden="true" />
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-[#0f172a]">
                {vm.readiness.readinessScore}
              </span>
              <span className="text-xs font-medium text-slate-500">/100</span>
            </div>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-[#115e59]">
              Cost {vm.readiness.costReductionPct >= 0 ? '-' : '+'}
              {Math.abs(vm.readiness.costReductionPct).toFixed(2)}%
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onInspectGates}
              className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-colors hover:brightness-95 min-[720px]:min-h-[28px] ${gatePillClass}`}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {vm.readiness.gateStatus} {vm.readiness.passedCount}/{vm.readiness.totalGates}
              </span>
            </button>
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {vm.readiness.evaluationsCount} runs · {vm.readiness.solveTimeMs} ms
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
