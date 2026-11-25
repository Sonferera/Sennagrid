import { ArrowLeft, ArrowRight, X } from 'lucide-react';
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
    body: 'Choose Metro Tropica or Harbor Corridor, switch Dengue vs Respiratory mode, adjust the team quota (10% to 40%), or tune Climate Forcing, ICU rate, mobility, and efficacy.',
  },
  {
    target: 'split-map',
    title: '2. Compare Spatial ICU Load Side-by-Side',
    body: 'Without SennaGrid (left) chases current cases, while With SennaGrid (right) shields commuter hubs early. Click any district polygon or open Watchlist to inspect ward metrics.',
  },
  {
    target: 'timeline-player',
    title: '3. Scrub Day 0 to 91 or Jump to Peak Surge',
    body: 'Press Play to watch outbreak propagation week-by-week, or click Jump: Peak to isolate the day reactive hospitals exceed local ICU capacity.',
  },
  {
    target: 'dispatch-export',
    title: '4. Inspect the 13-Week Plan & Export Files',
    body: 'Review the Weekly Coverage Matrix, filter district field protocols, expand the Stage 2 Swap Trace, and export CSV schedules or full JSON runs.',
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

    targetEl.classList.add(
      'ring-2',
      'ring-[var(--sg-teal-bright)]',
      'ring-offset-2',
      'ring-offset-[var(--sg-canvas)]',
    );
    targetEl.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });

    return () => {
      targetEl.classList.remove(
        'ring-2',
        'ring-[var(--sg-teal-bright)]',
        'ring-offset-2',
        'ring-offset-[var(--sg-canvas)]',
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
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-[var(--sg-border-control)] bg-[var(--sg-surface)] p-5 shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[13px] font-semibold text-[var(--sg-teal)]">
          Step {safeStep + 1} of {TOUR_STEPS.length}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close guided tour"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-inset)] text-[var(--sg-text-muted)] hover:bg-[var(--sg-hover)] hover:text-[var(--sg-text-primary)] min-[720px]:min-h-[34px] min-[720px]:min-w-[34px]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <h2 className="mt-2 text-base font-bold text-[var(--sg-text-primary)]">{activeSpec.title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--sg-text-muted)]">
        {activeSpec.body}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--sg-border-subtle)] pt-3.5">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-md px-2 text-[13px] font-medium text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)] min-[720px]:min-h-[32px]"
        >
          Skip
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onStepChange(safeStep - 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-3 py-1 text-[13px] font-semibold text-[var(--sg-text-primary)] hover:bg-[var(--sg-hover)] disabled:opacity-40 min-[720px]:min-h-[34px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => (isLast ? onClose() : onStepChange(safeStep + 1))}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[var(--sg-teal-fill)] px-3.5 py-1 text-[13px] font-semibold text-[var(--sg-teal-fill-ink)] hover:bg-[var(--sg-teal-fill-hover)] min-[720px]:min-h-[34px]"
          >
            <span>{isLast ? 'Finish' : 'Next'}</span>
            {!isLast && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
