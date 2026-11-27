import { BookOpen, Compass, Moon, Sun } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { getLiveTourStepCount } from '../onboarding/guideCatalog';
import { useSimulationStore } from '../../store/useSimulationStore';
import { TabNav } from './TabNav';

export function HeaderBar() {
  const { output, theme, toggleTheme, setActiveTab, openTour, openGuide } = useSimulationStore(
    useShallow((s) => ({
      output: s.output,
      theme: s.theme,
      toggleTheme: s.toggleTheme,
      setActiveTab: s.setActiveTab,
      openTour: s.openTour,
      openGuide: s.openGuide,
    })),
  );

  const gates = output?.gates;
  const gateDotColor =
    gates?.overallStatus === 'PASS'
      ? 'bg-[var(--sg-safe-dot)]'
      : gates?.overallStatus === 'REVIEW'
        ? 'bg-[var(--sg-amber-dot)]'
        : gates?.overallStatus === 'FAIL'
          ? 'bg-[var(--sg-rose-dot)]'
          : 'bg-[var(--sg-text-muted)]';

  const gateTextColor =
    gates?.overallStatus === 'FAIL'
      ? 'text-[var(--sg-rose-ink)]'
      : gates?.overallStatus === 'REVIEW'
        ? 'text-[var(--sg-amber-ink)]'
        : 'text-[var(--sg-safe-ink)]';

  const gateStatusLabel =
    gates?.overallStatus === 'FAIL'
      ? 'Fail'
      : gates?.overallStatus === 'REVIEW'
        ? 'Review'
        : 'Pass';

  const isDark = theme === 'dark';

  return (
    <header
      data-tour="header-bar"
      className="sticky top-0 z-40 border-b border-[var(--sg-border-subtle)] bg-[var(--sg-header-bg)] backdrop-blur-md transition-colors"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-3 px-4 min-[880px]:min-h-[56px] min-[880px]:flex-nowrap sm:px-6">
        {/* Clean Brand Wordmark */}
        <div className="flex min-h-[48px] items-center gap-2 min-[880px]:min-h-0 sm:gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 shrink-0 grid-cols-2 gap-0.5 rounded-[6px] bg-[#0f766e] p-1.5"
          >
            <span className="rounded-[1px] bg-[#fbf9f5]" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-[#fbf9f5]" />
          </span>
          <h1 className="text-[17px] font-bold tracking-tight text-[var(--sg-text-primary)]">
            SennaGrid
          </h1>
        </div>

        {/* Center Underline Tabs */}
        <div className="order-3 w-full border-t border-[var(--sg-border-subtle)] min-[880px]:order-2 min-[880px]:w-auto min-[880px]:border-t-0">
          <TabNav />
        </div>

        {/* Right Minimal Utilities */}
        <div className="order-2 flex items-center gap-1.5 min-[880px]:order-3 sm:gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to Warm Paper Light mode' : 'Switch to Obsidian Dark mode'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-inset)] px-2.5 text-[13px] font-medium text-[var(--sg-text-primary)] transition-colors hover:bg-[var(--sg-hover)] sm:min-h-[34px] sm:min-w-0"
          >
            {isDark ? (
              <Moon className="h-3.5 w-3.5 text-[var(--sg-teal)]" aria-hidden="true" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-[var(--sg-amber)]" aria-hidden="true" />
            )}
            <span className="hidden min-[440px]:inline">{isDark ? 'Dark' : 'Light'}</span>
          </button>

          <button
            type="button"
            onClick={openGuide}
            aria-label="Open feature and function guide"
            title="Feature & Function Guide"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-[var(--sg-text-muted)] transition-colors hover:bg-[var(--sg-inset)] hover:text-[var(--sg-text-primary)] sm:min-h-[36px] sm:min-w-0"
          >
            <BookOpen className="h-4 w-4 text-[var(--sg-text-muted)]" aria-hidden="true" />
            <span className="hidden min-[520px]:inline">Guide</span>
          </button>

          <button
            type="button"
            onClick={() => openTour(0)}
            aria-label="Start interactive live tour"
            title={`${getLiveTourStepCount()}-Step Live Spotlight Tour`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-[var(--sg-text-muted)] transition-colors hover:bg-[var(--sg-inset)] hover:text-[var(--sg-text-primary)] sm:min-h-[36px] sm:min-w-0"
          >
            <Compass className="h-4 w-4 text-[var(--sg-teal)]" aria-hidden="true" />
            <span className="hidden min-[520px]:inline">Live Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            aria-label="Inspect policy verification gates"
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-[var(--sg-inset)] sm:min-h-[36px] ${gateTextColor}`}
          >
            <span className={`h-2 w-2 rounded-full ${gateDotColor}`} aria-hidden="true" />
            <span className="whitespace-nowrap">
              {gates ? (
                <>
                  {gates.passedCount}/{gates.totalGates}
                  <span className="hidden min-[440px]:inline"> Gates</span> {gateStatusLabel}
                </>
              ) : (
                'Verifying'
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
