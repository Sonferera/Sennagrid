import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { useEffect } from 'react';

interface InteractiveTourProps {
  isOpen: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

interface TourStepSpec {
  target: string;
  title: string;
  body: string;
}

const TOUR_STEPS: readonly TourStepSpec[] = [
  {
    target: 'control-bar',
    title: '1. Configure Scenario & Weekly Budget',
    body: 'Switch between Metro Tropica (Vector SEIR-SEI) and Harbor Corridor (Direct SEIR), adjust the weekly district quota (10% to 40%), or open Advanced Parameters to test sensitivity.',
  },
  {
    target: 'split-map',
    title: '2. Compare Reactive vs SennaGrid Side-by-Side',
    body: 'Both MapLibre canvases share synchronized pan and zoom. Polygon fill encodes local ICU stress (load / beds), while bright outlines mark districts receiving active weekly dispatch. Click any district to open the inspector.',
  },
  {
    target: 'timeline-player',
    title: '3. Scrub the 91-Day Timeline or Jump to Peak',
    body: 'Play the outbreak forward at 1x, 2x, or 4x speed, or click Jump to Peak to inspect the exact day Reactive Baseline hits maximum ICU demand across maps and charts simultaneously.',
  },
  {
    target: 'dispatch-export',
    title: '4. Audit & Export the Weekly Dispatch Schedule',
    body: 'Filter Weeks 1 to 13 by zone or deterministic rationale, inspect Stage 2 swap decisions below, and export operational field plans as CSV or full reproducible runs as JSON.',
  },
];

export function InteractiveTour({
  isOpen,
  step,
  onStepChange,
  onClose,
}: InteractiveTourProps) {
  const safeStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, step));
  const activeSpec = TOUR_STEPS[safeStep]!;

  useEffect(() => {
    if (!isOpen) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetEl = document.querySelector<HTMLElement>(`[data-tour="${activeSpec.target}"]`);
    if (!targetEl) return;

    targetEl.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-[#090d16]');
    targetEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });

    return () => {
      targetEl.classList.remove(
        'ring-2',
        'ring-cyan-400',
        'ring-offset-2',
        'ring-offset-[#090d16]',
      );
    };
  }, [isOpen, activeSpec.target]);

  if (!isOpen) return null;

  const isFirst = safeStep === 0;
  const isLast = safeStep === TOUR_STEPS.length - 1;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="SennaGrid Guided Tour"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-lg border border-cyan-400/70 bg-[#0f172a] p-4 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-cyan-300">
            Guided Tour · Step {safeStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close guided tour"
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-slate-500 bg-[#162033] text-slate-300 hover:border-slate-400 hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <h2 className="mt-2.5 text-sm font-semibold text-slate-100">{activeSpec.title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{activeSpec.body}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 min-[720px]:min-h-[36px]"
        >
          Skip Tour
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onStepChange(safeStep - 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-slate-500 bg-[#162033] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-400 disabled:opacity-40 min-[720px]:min-h-[36px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => (isLast ? onClose() : onStepChange(safeStep + 1))}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-[#04111a] hover:bg-cyan-300 min-[720px]:min-h-[36px]"
          >
            <span>{isLast ? 'Finish' : 'Next'}</span>
            {!isLast && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <p className="mt-2 font-mono text-[10px] text-slate-400">
        Keyboard: Left / Right arrows to navigate, Esc to close.
      </p>
    </aside>
  );
}
