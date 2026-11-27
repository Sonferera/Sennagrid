import { ArrowRight, BookOpen, Compass, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  FEATURE_GUIDE_ITEMS,
  GUIDE_CATEGORIES,
  KEYBOARD_SHORTCUTS,
  filterFeatureGuideItems,
  type GuideCategoryId,
  type GuideTab,
} from './guideCatalog';

interface FeatureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLiveTour: (startStep?: number) => void;
  onNavigateToFeature: (tab: GuideTab, tourTarget: string) => void;
}

export function FeatureGuideModal({
  isOpen,
  onClose,
  onStartLiveTour,
  onNavigateToFeature,
}: FeatureGuideModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<GuideCategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const filteredItems = useMemo(
    () => filterFeatureGuideItems(selectedCategory, searchQuery),
    [selectedCategory, searchQuery],
  );

  if (!isOpen) return null;

  const hasFilters = selectedCategory !== 'all' || searchQuery.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sg-guide-modal-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--sg-border-control)] bg-[var(--sg-surface)] shadow-2xl"
      >
        {/* Pinned Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--sg-border-subtle)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--sg-teal-border)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal)]"
            >
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2
                id="sg-guide-modal-title"
                className="text-lg font-bold tracking-tight text-[var(--sg-text-primary)] sm:text-xl"
              >
                SennaGrid Feature &amp; Function Guide
              </h2>
              <p className="mt-0.5 text-[13px] text-[var(--sg-text-muted)]">
                Complete reference of every workspace control, map layer, trajectory metric, export,
                and integrity gate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStartLiveTour(0)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--sg-teal-fill)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--sg-teal-fill-ink)] transition-colors hover:bg-[var(--sg-teal-fill-hover)] min-[720px]:min-h-[36px]"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Start Live Tour (8 Steps)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close feature guide"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-inset)] text-[var(--sg-text-muted)] transition-colors hover:bg-[var(--sg-hover)] hover:text-[var(--sg-text-primary)] min-[720px]:min-h-[36px] min-[720px]:min-w-[36px]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="space-y-3 border-b border-[var(--sg-border-subtle)] bg-[var(--sg-inset)]/60 px-5 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <label htmlFor="sg-guide-search" className="sr-only">
                Search features and controls
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-text-muted)]"
                aria-hidden="true"
              />
              <input
                id="sg-guide-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features (e.g. Swap Trace, Open-Meteo, Watchlist, H/S/I, CSV)..."
                className="min-h-[44px] w-full rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)] py-1.5 pl-9 pr-3 text-[13px] text-[var(--sg-text-primary)] placeholder:text-[var(--sg-text-muted)] min-[720px]:min-h-[36px]"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-3 py-1 text-[13px] font-medium text-[var(--sg-text-primary)] hover:bg-[var(--sg-hover)] min-[720px]:min-h-[36px]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[var(--sg-text-muted)]" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter guide by workspace section"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              aria-pressed={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[44px] rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors min-[720px]:min-h-[30px] ${
                selectedCategory === 'all'
                  ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)]'
                  : 'border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] text-[var(--sg-text-muted)] hover:border-[var(--sg-border-control)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              All ({FEATURE_GUIDE_ITEMS.length})
            </button>

            {GUIDE_CATEGORIES.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`min-h-[44px] rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors min-[720px]:min-h-[30px] ${
                    active
                      ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)] text-[var(--sg-teal-ink)]'
                      : 'border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] text-[var(--sg-text-muted)] hover:border-[var(--sg-border-control)] hover:text-[var(--sg-text-primary)]'
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {!hasFilters && (
            <div className="rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-4">
              <h3 className="text-xs font-semibold tracking-wider text-[var(--sg-teal)] uppercase">
                How SennaGrid Evaluates Decisions
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-3 text-[13px] leading-relaxed text-[var(--sg-text-secondary)] min-[720px]:grid-cols-3">
                <div className="rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-3">
                  <div className="font-semibold text-[var(--sg-rose)]">1. Without SennaGrid</div>
                  <p className="mt-1 text-[var(--sg-text-muted)]">
                    Allocates weekly teams solely to wards reporting the highest active infections
                    right now, lagging behind commuter hub spillover.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-3">
                  <div className="font-semibold text-[var(--sg-teal)]">2. With SennaGrid</div>
                  <p className="mt-1 text-[var(--sg-text-muted)]">
                    Couples Haversine mobility, climate forcing, and local ICU limits in a 2-stage
                    WK1-13 optimizer using the exact same team quota.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-3">
                  <div className="font-semibold text-[var(--sg-text-primary)]">
                    3. Guardrails &amp; Zero Server
                  </div>
                  <p className="mt-1 text-[var(--sg-text-muted)]">
                    Runs deterministically in a browser Web Worker (<code className="font-mono text-xs text-[var(--sg-teal)]">Float64Array</code> RK4) and verifies 5
                    numerical gates plus Hospital Safety Guardrail.
                  </p>
                </div>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] py-12 text-center">
              <p className="text-base font-semibold text-[var(--sg-text-primary)]">
                No features match &ldquo;{searchQuery.trim()}&rdquo;.
              </p>
              <p className="mt-1 text-sm text-[var(--sg-text-muted)]">
                Try searching for &ldquo;budget&rdquo;, &ldquo;watchlist&rdquo;, &ldquo;swap&rdquo;,
                &ldquo;Open-Meteo&rdquo;, or &ldquo;RK4&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--sg-teal-fill)] px-4 py-2 text-[13px] font-semibold text-[var(--sg-teal-fill-ink)] hover:bg-[var(--sg-teal-fill-hover)] min-[720px]:min-h-[36px]"
              >
                Reset Guide Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)]/45 p-4 transition-colors hover:border-[var(--sg-border-control)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded border border-[var(--sg-teal-border)] bg-[var(--sg-teal-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--sg-teal-ink)]">
                        {item.tabLabel}
                      </span>
                      <span className="font-mono text-xs text-[var(--sg-text-muted)]">
                        Tour Step {item.tourStepIndex + 1}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-[15px] font-bold text-[var(--sg-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--sg-text-muted)]">
                      {item.summary}
                    </p>

                    <ul className="mt-3 space-y-1.5 border-t border-[var(--sg-border-row)] pt-3 text-[13px] leading-snug text-[var(--sg-text-secondary)]">
                      {item.capabilities.map((cap) => (
                        <li key={cap} className="flex items-start gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sg-teal)]"
                          />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sg-border-row)] pt-3">
                    <button
                      type="button"
                      onClick={() => onNavigateToFeature(item.tab, item.tourTarget)}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-[var(--sg-teal)] transition-colors hover:bg-[var(--sg-teal-tint)] min-[720px]:min-h-[30px]"
                    >
                      <span>Open on Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartLiveTour(item.tourStepIndex)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-2.5 text-xs font-semibold text-[var(--sg-text-primary)] transition-colors hover:bg-[var(--sg-hover)] min-[720px]:min-h-[30px]"
                    >
                      <Compass className="h-3.5 w-3.5 text-[var(--sg-teal)]" aria-hidden="true" />
                      <span>Spotlight Step {item.tourStepIndex + 1}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Keyboard Shortcuts Reference */}
          <section
            aria-label="Keyboard shortcuts reference"
            className="rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-4"
          >
            <h3 className="text-xs font-semibold tracking-wider text-[var(--sg-text-secondary)] uppercase">
              Keyboard Shortcuts
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2.5 min-[720px]:grid-cols-3">
              {KEYBOARD_SHORTCUTS.map((sc) => (
                <div
                  key={sc.keys}
                  className="flex flex-col justify-between gap-1 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <kbd className="rounded border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--sg-teal)]">
                      {sc.keys}
                    </kbd>
                    <span className="text-[11px] font-medium text-[var(--sg-text-muted)]">
                      {sc.context}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--sg-text-secondary)]">{sc.action}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
