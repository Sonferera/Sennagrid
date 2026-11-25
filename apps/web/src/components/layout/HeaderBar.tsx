import { HelpCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore } from '../../store/useSimulationStore';
import { TabNav } from './TabNav';

export function HeaderBar() {
  const { output, setActiveTab, openTour } = useSimulationStore(
    useShallow((s) => ({
      output: s.output,
      setActiveTab: s.setActiveTab,
      openTour: s.openTour,
    })),
  );

  const gates = output?.gates;
  const gateDotColor =
    gates?.overallStatus === 'PASS'
      ? 'bg-[#059669]'
      : gates?.overallStatus === 'REVIEW'
        ? 'bg-[#d97706]'
        : gates?.overallStatus === 'FAIL'
          ? 'bg-[#e11d48]'
          : 'bg-[#57534e]';

  const gateTextColor =
    gates?.overallStatus === 'FAIL'
      ? 'text-[#9f1239]'
      : gates?.overallStatus === 'REVIEW'
        ? 'text-[#92400e]'
        : 'text-[#065f46]';

  return (
    <header className="border-b border-[#e0dbd0] bg-[#fbf9f5]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 px-4 sm:min-h-[56px] sm:flex-nowrap sm:px-6">
        {/* Clean Brand Wordmark */}
        <div className="flex min-h-[48px] items-center gap-2.5 sm:min-h-0">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-[6px] bg-[#0f766e] p-1.5"
          >
            <span className="rounded-[1px] bg-[#fbf9f5]" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-[#fbf9f5]" />
          </span>
          <h1 className="text-[17px] font-bold tracking-tight text-[#1c1917]">SennaGrid</h1>
        </div>

        {/* Center Underline Tabs */}
        <div className="order-3 w-full border-t border-[#e0dbd0] sm:order-2 sm:w-auto sm:border-t-0">
          <TabNav />
        </div>

        {/* Right Minimal Utilities */}
        <div className="order-2 flex items-center gap-4 sm:order-3">
          <button
            type="button"
            onClick={openTour}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[#57534e] transition-colors hover:bg-[#eee9df] hover:text-[#1c1917] sm:min-h-[36px]"
          >
            <HelpCircle className="h-4 w-4 text-[#57534e]" aria-hidden="true" />
            <span>Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            aria-label="Inspect policy verification gates"
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-[#eee9df] sm:min-h-[36px] ${gateTextColor}`}
          >
            <span className={`h-2 w-2 rounded-full ${gateDotColor}`} aria-hidden="true" />
            <span>
              {gates ? `${gates.passedCount}/${gates.totalGates} Gates Pass` : 'Verifying'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
