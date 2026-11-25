import type { OptimizationOutput } from '@sennagrid/engine';
import { ArrowRight } from 'lucide-react';
import { buildKpiViewModel, formatFixed, formatInt } from '../../lib/viewModels';

interface KpiStripProps {
  output: OptimizationOutput;
  isOptimizing: boolean;
  onInspectGates: () => void;
}

export function KpiStrip({ output, isOptimizing, onInspectGates }: KpiStripProps) {
  const vm = buildKpiViewModel(output);
  const bedDaysAverted = Math.max(
    0,
    vm.icuOverflow.reactiveTotalBedDays - vm.icuOverflow.optimizedTotalBedDays,
  );

  const gateHeadlineColor =
    vm.readiness.gateStatus === 'FAIL'
      ? 'text-[#be123c]'
      : vm.readiness.gateStatus === 'REVIEW'
        ? 'text-[#b45309]'
        : 'text-[#0f766e]';

  const absCases = Math.abs(vm.casesImpact.casesAverted);
  const absPct = Math.abs(vm.casesImpact.casesAvertedPct);

  return (
    <section
      aria-label="91-day outbreak impact summary"
      className={`rounded-xl border border-[#e0dbd0] bg-[#fbf9f5] transition-opacity ${
        isOptimizing ? 'opacity-75' : 'opacity-100'
      }`}
    >
      <div className="grid grid-cols-1 divide-y divide-[#e0dbd0] min-[720px]:grid-cols-3 min-[720px]:divide-x min-[720px]:divide-y-0">
        {/* Metric 1: Hospital Collapse Days */}
        <article className="p-5 sm:p-6">
          <h2 className="text-[13px] font-medium text-[#57534e]">Hospital Collapse</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-2.5 font-mono tabular-nums">
            <del
              aria-label={`Reactive baseline ${vm.collapse.reactiveDays} days`}
              className="text-xl font-medium text-[#be123c]/85"
            >
              {vm.collapse.reactiveDays}d
            </del>
            <ArrowRight className="h-4 w-4 text-[#57534e]" aria-hidden="true" />
            <span className="text-3xl font-bold tracking-tight text-[#0f766e] sm:text-4xl">
              {vm.collapse.optimizedDays} {vm.collapse.optimizedDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-[#57534e]">
            {vm.collapse.optimizedDays === 0
              ? 'Zero ICU capacity breaches across 91 days'
              : vm.collapse.savedDays > 0
                ? `${vm.collapse.savedDays} fewer collapse days than reactive baseline`
                : 'Matches baseline collapse duration under quota'}
          </p>
        </article>

        {/* Metric 2: Peak & Total ICU Overflow */}
        <article className="p-5 sm:p-6">
          <h2 className="text-[13px] font-medium text-[#57534e]">Peak ICU Overflow</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-2.5 font-mono tabular-nums">
            <del
              aria-label={`Reactive peak overflow ${formatFixed(vm.icuOverflow.reactivePeakBeds, 1)} beds`}
              className="text-xl font-medium text-[#be123c]/85"
            >
              {formatFixed(vm.icuOverflow.reactivePeakBeds, 1)}
            </del>
            <ArrowRight className="h-4 w-4 text-[#57534e]" aria-hidden="true" />
            <span className="text-3xl font-bold tracking-tight text-[#0f766e] sm:text-4xl">
              {formatFixed(vm.icuOverflow.optimizedPeakBeds, 1)} beds
            </span>
          </div>
          <p className="mt-2 text-[13px] text-[#57534e]">
            {bedDaysAverted > 0.05
              ? `${formatFixed(bedDaysAverted, 1)} bed-days averted (${formatFixed(vm.icuOverflow.reactiveTotalBedDays, 1)} vs ${formatFixed(vm.icuOverflow.optimizedTotalBedDays, 1)})`
              : `${formatFixed(vm.icuOverflow.optimizedTotalBedDays, 1)} total overflow bed-days`}
          </p>
        </article>

        {/* Metric 3: Policy Gates & Case Trade-off */}
        <article className="p-5 sm:p-6">
          <h2 className="text-[13px] font-medium text-[#57534e]">Policy Gates &amp; Trade-off</h2>
          <div className="mt-2">
            <button
              type="button"
              onClick={onInspectGates}
              aria-label={`Policy gates: ${vm.readiness.passedCount} of ${vm.readiness.totalGates} passed. Open methodology gates.`}
              className={`inline-flex min-h-[44px] items-baseline gap-1 font-mono text-3xl font-bold tracking-tight transition-opacity hover:opacity-80 sm:text-4xl min-[720px]:min-h-0 ${gateHeadlineColor}`}
            >
              <span>
                {vm.readiness.passedCount} / {vm.readiness.totalGates}
              </span>
              <span className="ml-1.5 text-2xl font-bold sm:text-3xl">
                {vm.readiness.gateStatus === 'PASS' ? 'Passed' : vm.readiness.gateStatus}
              </span>
            </button>
          </div>
          <p
            className={`mt-2 text-[13px] ${
              vm.casesImpact.isTradeoff ? 'font-medium text-[#b45309]' : 'text-[#57534e]'
            }`}
          >
            {vm.casesImpact.isTradeoff
              ? `Trade-off: +${absPct.toFixed(2)}% mild cases (+${formatInt(absCases)}) to shield ICUs`
              : `${formatInt(absCases)} fewer cumulative cases (-${absPct.toFixed(2)}%)`}
          </p>
        </article>
      </div>
    </section>
  );
}
