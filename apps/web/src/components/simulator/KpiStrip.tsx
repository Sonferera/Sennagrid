import type { OptimizationOutput } from '@sennagrid/engine';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Cpu,
  HeartPulse,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { buildKpiViewModel, formatFixed, formatInt } from '../../lib/viewModels';

interface KpiStripProps {
  output: OptimizationOutput;
  isOptimizing: boolean;
  onInspectGates: () => void;
}

export function KpiStrip({ output, isOptimizing, onInspectGates }: KpiStripProps) {
  const vm = buildKpiViewModel(output);

  const collapsePillClass =
    vm.collapse.tone === 'positive'
      ? 'border-emerald-500/40 bg-[#082f23] text-[#6ee7b7]'
      : vm.collapse.tone === 'tradeoff'
        ? 'border-amber-500/40 bg-[#2e1f07] text-[#fcd34d]'
        : 'border-slate-600 bg-[#162033] text-slate-300';

  const casesPillClass = vm.casesImpact.isTradeoff
    ? 'border-amber-500/40 bg-[#2e1f07] text-[#fcd34d]'
    : vm.casesImpact.tone === 'positive'
      ? 'border-cyan-400/40 bg-[#083344] text-[#67e8f9]'
      : 'border-slate-600 bg-[#162033] text-slate-300';

  const gatePillClass =
    vm.readiness.gateStatus === 'PASS'
      ? 'border-emerald-500/50 bg-[#082f23] text-[#6ee7b7]'
      : vm.readiness.gateStatus === 'REVIEW'
        ? 'border-amber-500/50 bg-[#2e1f07] text-[#fcd34d]'
        : 'border-rose-500/50 bg-[#3b111c] text-[#fda4af]';

  return (
    <section
      aria-label="Simulation impact overview"
      className={`grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4 ${
        isOptimizing ? 'opacity-80 transition-opacity' : ''
      }`}
    >
      {/* KPI 1: Hospital Collapse Days */}
      <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0f172a] p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
            Hospital Collapse Days
          </span>
          <HeartPulse className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
          <span className="text-sm font-medium text-rose-400">
            Reactive: {vm.collapse.reactiveDays}d
          </span>
          <span className="text-slate-400" aria-hidden="true">
            -&gt;
          </span>
          <span className="text-2xl font-bold text-slate-100">
            {vm.collapse.optimizedDays}d
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${collapsePillClass}`}
          >
            {vm.collapse.tone === 'positive' && (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{vm.collapse.badgeText}</span>
          </span>
          <span className="text-[11px] text-slate-400">Days with any district ICU breach</span>
        </div>
      </article>

      {/* KPI 2: Peak ICU Overflow (beds) vs Total Overflow (bed-days) */}
      <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0f172a] p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
            Peak ICU Overflow
          </span>
          <BedDouble className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
          <span className="text-2xl font-bold text-slate-100">
            {vm.icuOverflow.peakBedsPrevented > 0
              ? `-${formatFixed(vm.icuOverflow.peakBedsPrevented, 1)} beds`
              : `${formatFixed(vm.icuOverflow.optimizedPeakBeds, 1)} beds`}
          </span>
          <span className="text-xs text-slate-300">
            ({formatFixed(vm.icuOverflow.reactivePeakBeds, 1)} -&gt;{' '}
            {formatFixed(vm.icuOverflow.optimizedPeakBeds, 1)} beds)
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 text-[11px]">
          <span className="font-mono tabular-nums text-slate-300">
            Total: {formatFixed(vm.icuOverflow.reactiveTotalBedDays, 1)} -&gt;{' '}
            <strong className="text-cyan-300">
              {formatFixed(vm.icuOverflow.optimizedTotalBedDays, 1)} bed-days
            </strong>
          </span>
          {vm.icuOverflow.totalBedDaysReductionPct !== null && (
            <span className="font-mono font-semibold tabular-nums text-emerald-400">
              -{Math.max(0, vm.icuOverflow.totalBedDaysReductionPct).toFixed(1)}%
            </span>
          )}
        </div>
      </article>

      {/* KPI 3: Cumulative Cases Impact (Honest Signed Framing) */}
      <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0f172a] p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
            {vm.casesImpact.label}
          </span>
          {vm.casesImpact.isTradeoff ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
          <span
            className={`text-2xl font-bold ${
              vm.casesImpact.isTradeoff ? 'text-amber-300' : 'text-slate-100'
            }`}
          >
            {vm.casesImpact.signedHeadline}
          </span>
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${casesPillClass}`}
          >
            {vm.casesImpact.signedPctLabel}
          </span>
        </div>

        <div className="mt-2.5 space-y-1">
          <p className="text-[11px] leading-snug text-slate-300">{vm.casesImpact.contextNote}</p>
          <p className="font-mono text-[11px] tabular-nums text-slate-400">
            Reactive {formatInt(vm.casesImpact.reactiveCumulative)} vs SennaGrid{' '}
            {formatInt(vm.casesImpact.optimizedCumulative)}
          </p>
        </div>
      </article>

      {/* KPI 4: Solver & Policy Readiness */}
      <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0f172a] p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
            Solver &amp; Policy Readiness
          </span>
          <Cpu className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
          <span className="text-2xl font-bold text-slate-100">
            {vm.readiness.readinessScore}/100
          </span>
          <span className="text-xs text-cyan-300">
            Cost J {vm.readiness.costReductionPct >= 0 ? '-' : '+'}
            {Math.abs(vm.readiness.costReductionPct).toFixed(2)}%
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onInspectGates}
            className={`inline-flex min-h-[44px] items-center gap-1 rounded border px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums transition-colors hover:brightness-110 min-[720px]:min-h-[30px] min-[720px]:px-2 min-[720px]:py-0.5 ${gatePillClass}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {vm.readiness.gateStatus} {vm.readiness.passedCount}/{vm.readiness.totalGates}
            </span>
          </button>
          <span className="font-mono text-[11px] tabular-nums text-slate-400">
            {vm.readiness.evaluationsCount} evals / {vm.readiness.solveTimeMs} ms
          </span>
        </div>
      </article>
    </section>
  );
}
