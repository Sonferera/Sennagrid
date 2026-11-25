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
    title: '1. Configure Scenario, Climate & Team Quota',
    body: 'Switch between Metro Tropica and Harbor Corridor, compare Peak Season vs Live Open-Meteo weather, or adjust the weekly district quota (10% to 40%).',
  },
  {
    target: 'split-map',
    title: '2. Compare Spatial ICU Pressure Side-by-Side',
    body: 'Reactive Baseline (left) chases current case counts, while SennaGrid (right) shields mobility hubs and low-ICU wards early. Click any ward badge or polygon to inspect details.',
  },
  {
    target: 'timeline-player',
    title: '3. Replay Day 0 to 91 or Jump to Peak Surge',
    body: 'Use Replay D0 to watch the outbreak unfold week-by-week, or jump straight to the Peak Surge day while maps, ward badges, and charts update together.',
  },
  {
    target: 'dispatch-export',
    title: '4. Review the 13-Week Matrix & Export CSV/JSON',
    body: 'Inspect the visual 13-week deployment matrix, filter assignments by rationale, review Stage 2 swaps, and download ready-to-use CSV or JSON files.',
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

    targetEl.classList.add('ring-2', 'ring-[#0d9488]', 'ring-offset-2', 'ring-offset-[#f8fafc]');
    targetEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });

    return () => {
      targetEl.classList.remove(
        'ring-2',
        'ring-[#0d9488]',
        'ring-offset-2',
        'ring-offset-[#f8fafc]',
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
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-teal-600/50 bg-white p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#0f766e]" aria-hidden="true" />
          <span className="text-xs font-bold text-[#0f766e]">
            Guided Tour · Step {safeStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close guided tour"
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-400 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0f172a]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <h2 className="mt-2 text-sm font-bold text-[#0f172a]">{activeSpec.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{activeSpec.body}</p>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-[#0f172a] min-[720px]:min-h-[34px]"
        >
          Skip Tour
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onStepChange(safeStep - 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-[720px]:min-h-[34px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => (isLast ? onClose() : onStepChange(safeStep + 1))}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[#0f766e] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d9488] min-[720px]:min-h-[34px]"
          >
            <span>{isLast ? 'Finish' : 'Next'}</span>
            {!isLast && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
