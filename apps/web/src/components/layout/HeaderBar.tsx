import { HelpCircle, Moon, Sun } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore } from '../../store/useSimulationStore';
import { TabNav } from './TabNav';

export function HeaderBar() {
  const { output, theme, toggleTheme, setActiveTab, openTour } = useSimulationStore(
    useShallow((s) => ({
      output: s.output,
      theme: s.theme,
      toggleTheme: s.toggleTheme,
      setActiveTab: s.setActiveTab,
      openTour: s.openTour,
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
    <header className="sticky top-0 z-40 border-b border-[var(--sg-border-subtle)] bg-[var(--sg-header-bg)] backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-3 px-4 sm:min-h-[56px] sm:flex-nowrap sm:px-6">
        {/* Clean Brand Wordmark */}
        <div className="flex min-h-[48px] items-center gap-2 sm:min-h-0 sm:gap-2.5">
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
        <div className="order-3 w-full border-t border-[var(--sg-border-subtle)] sm:order-2 sm:w-auto sm:border-t-0">
          <TabNav />
        </div>

        {/* Right Minimal Utilities */}
        <div className="order-2 flex items-center gap-1.5 sm:order-3 sm:gap-3">
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
            onClick={openTour}
            aria-label="Open guided tour"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-[var(--sg-text-muted)] transition-colors hover:bg-[var(--sg-inset)] hover:text-[var(--sg-text-primary)] sm:min-h-[36px] sm:min-w-0"
          >
            <HelpCircle className="h-4 w-4 text-[var(--sg-text-muted)]" aria-hidden="true" />
            <span className="hidden min-[440px]:inline">Tour</span>
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
