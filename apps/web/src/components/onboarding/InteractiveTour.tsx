import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
import { useEffect } from 'react';
import { LIVE_TOUR_STEPS } from './guideCatalog';

interface InteractiveTourProps {
  isOpen: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onOpenGuide: () => void;
}

export function InteractiveTour({
  isOpen,
  step,
  onStepChange,
  onClose,
  onOpenGuide,
}: InteractiveTourProps) {
  const safeStep = Math.max(0, Math.min(LIVE_TOUR_STEPS.length - 1, step));
  const activeSpec = LIVE_TOUR_STEPS[safeStep]!;

  useEffect(() => {
    if (!isOpen) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetEl = document.querySelector<HTMLElement>(`[data-tour="${activeSpec.target}"]`);
    if (!targetEl) return;

    const isHeaderTarget = activeSpec.target === 'header-bar';
    const highlightClasses = isHeaderTarget
      ? ['ring-2', 'ring-inset', 'ring-[var(--sg-teal-bright)]']
      : ['ring-2', 'ring-[var(--sg-teal-bright)]', 'ring-offset-2', 'ring-offset-[var(--sg-canvas)]'];

    targetEl.classList.add(...highlightClasses);

    if (isHeaderTarget) {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    } else {
      targetEl.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }

    return () => {
      targetEl.classList.remove(...highlightClasses);
    };
  }, [isOpen, activeSpec.target]);

  if (!isOpen) return null;

  const isFirst = safeStep === 0;
  const isLast = safeStep === LIVE_TOUR_STEPS.length - 1;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="SennaGrid Interactive Live Tour"
      className="fixed bottom-4 left-4 right-4 z-50 flex max-h-[82vh] max-w-lg flex-col rounded-xl border border-[var(--sg-border-control)] bg-[var(--sg-surface)] p-5 shadow-2xl sm:left-auto sm:w-full"
    >
      {/* Top Meta & Full Guide Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--sg-teal)]">
            Step {safeStep + 1} / {LIVE_TOUR_STEPS.length}
          </span>
          <span className="rounded border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sg-text-secondary)]">
            {activeSpec.tabLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="Open full feature guide"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-2.5 text-xs font-semibold text-[var(--sg-text-primary)] transition-colors hover:bg-[var(--sg-hover)] min-[720px]:min-h-[32px]"
          >
            <BookOpen className="h-3.5 w-3.5 text-[var(--sg-teal)]" aria-hidden="true" />
            <span>Full Guide</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close live tour"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-inset)] text-[var(--sg-text-muted)] transition-colors hover:bg-[var(--sg-hover)] hover:text-[var(--sg-text-primary)] min-[720px]:min-h-[32px] min-[720px]:min-w-[32px]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Interactive Direct-Jump Step Strip */}
      <div
        role="group"
        aria-label="Jump to tour step"
        className="mt-3 grid grid-cols-8 gap-1"
      >
        {LIVE_TOUR_STEPS.map((spec, idx) => {
          const isCurrent = idx === safeStep;
          const isCompleted = idx < safeStep;
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => onStepChange(idx)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Jump to step ${spec.stepNumber}: ${spec.title}`}
              title={spec.title}
              className={`min-h-[44px] rounded font-mono text-xs font-semibold tabular-nums transition-colors min-[720px]:min-h-[26px] ${
                isCurrent
                  ? 'bg-[var(--sg-teal-fill)] text-[var(--sg-teal-fill-ink)]'
                  : isCompleted
                    ? 'border border-[var(--sg-teal-border)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)] hover:opacity-90'
                    : 'border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] text-[var(--sg-text-muted)] hover:border-[var(--sg-border-control)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              {spec.stepNumber}
            </button>
          );
        })}
      </div>

      {/* Scrollable Explanation Body */}
      <div className="mt-3.5 flex-1 space-y-3 overflow-y-auto pr-0.5">
        <div>
          <h2 className="text-base font-bold text-[var(--sg-text-primary)]">{activeSpec.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--sg-text-muted)]">
            {activeSpec.summary}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)]/65 p-3">
          <h3 className="text-[11px] font-semibold tracking-wider text-[var(--sg-text-secondary)] uppercase">
            Functions &amp; Controls Here
          </h3>
          <ul className="mt-2 space-y-2 text-[13px] leading-snug">
            {activeSpec.controls.map((control) => (
              <li key={control.label}>
                <span className="font-semibold text-[var(--sg-text-primary)]">{control.label}:</span>{' '}
                <span className="text-[var(--sg-text-muted)]">{control.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="rounded-lg border border-[var(--sg-teal-border)]/70 bg-[var(--sg-teal-tint)]/55 px-3 py-2 text-xs leading-relaxed text-[var(--sg-text-secondary)]">
          <strong className="font-semibold text-[var(--sg-teal-ink)]">Why it matters:</strong>{' '}
          {activeSpec.tip}
        </p>
      </div>

      {/* Pinned Footer Navigation */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--sg-border-subtle)] pt-3.5">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-md px-2 text-[13px] font-medium text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)] min-[720px]:min-h-[32px]"
        >
          Skip Tour
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
