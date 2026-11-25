import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore, type ActiveTab } from '../../store/useSimulationStore';

/**
 * Grounded 3-column editorial web footer with direct in-app section links
 * and honest research benchmark attribution.
 */
export function Footer() {
  const { params, setActiveTab, openTour } = useSimulationStore(
    useShallow((s) => ({
      params: s.params,
      setActiveTab: s.setActiveTab,
      openTour: s.openTour,
    })),
  );

  const navigateToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <footer className="mt-8 border-t border-[var(--sg-border-subtle)] bg-[var(--sg-footer)] transition-colors">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 pb-6 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Col 1: Brand & Scientific Summary */}
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 grid-cols-2 gap-0.5 rounded-[5px] bg-[#0f766e] p-1"
              >
                <span className="rounded-[1px] bg-[#fbf9f5]" />
                <span className="rounded-[1px] bg-teal-200" />
                <span className="rounded-[1px] bg-teal-200" />
                <span className="rounded-[1px] bg-[#fbf9f5]" />
              </span>
              <span className="text-[15px] font-bold tracking-tight text-[var(--sg-text-primary)]">
                SennaGrid
              </span>
            </div>
            <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-[var(--sg-text-muted)]">
              Spatial Epidemic Digital Twin &amp; Constrained Resource Optimizer. Evaluates
              multi-district dispatch schedules deterministically in your browser using a 4th-order
              Runge-Kutta SEIR solver.
            </p>
          </div>

          {/* Col 2: Engine & Scope */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-[var(--sg-text-secondary)] uppercase">
              Engine &amp; Scope
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-[13px] text-[var(--sg-text-muted)]">
              <li>
                RK4 Solver (dt = {params.dt}d · {params.horizonDays}-Day Horizon)
              </li>
              <li>Haversine Gravity Kernel &amp; Climate Forcing</li>
              <li>Benchmarks: Metro Tropica (18) &amp; Harbor Corridor (16)</li>
            </ul>
          </div>

          {/* Col 3: Workspace Navigation */}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-[var(--sg-text-secondary)] uppercase">
              Workspace
            </h2>
            <ul className="mt-2.5 space-y-1 text-[13px]">
              <li>
                <button
                  type="button"
                  onClick={() => navigateToTab('simulator')}
                  className="inline-flex min-h-[44px] items-center text-[var(--sg-text-secondary)] transition-colors hover:text-[var(--sg-teal)] md:min-h-[28px]"
                >
                  Outbreak Simulator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateToTab('schedule')}
                  className="inline-flex min-h-[44px] items-center text-[var(--sg-text-secondary)] transition-colors hover:text-[var(--sg-teal)] md:min-h-[28px]"
                >
                  13-Week Dispatch Plan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigateToTab('methodology')}
                  className="inline-flex min-h-[44px] items-center text-[var(--sg-text-secondary)] transition-colors hover:text-[var(--sg-teal)] md:min-h-[28px]"
                >
                  Policy Gates &amp; Equations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openTour}
                  className="inline-flex min-h-[44px] items-center text-[var(--sg-text-secondary)] transition-colors hover:text-[var(--sg-teal)] md:min-h-[28px]"
                >
                  Interactive Guided Tour
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Baseline Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sg-border-row)] pt-4 text-[13px] text-[var(--sg-text-dim)]">
          <span>SennaGrid · Open-Source Research Workbench (MIT License)</span>
          <span>100% Client-Side Web Worker · Synthetic Urban Benchmarks, Not Clinical Directives.</span>
        </div>
      </div>
    </footer>
  );
}
