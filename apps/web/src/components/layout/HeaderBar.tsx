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
          : 'bg-slate-400';

  const gateTextColor =
    gates?.overallStatus === 'FAIL'
      ? 'text-[#9f1239]'
      : gates?.overallStatus === 'REVIEW'
        ? 'text-[#92400e]'
        : 'text-[#065f46]';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 px-4 sm:min-h-[52px] sm:flex-nowrap sm:px-6">
        {/* Clean Brand Wordmark */}
        <div className="flex min-h-[48px] items-center gap-2.5 sm:min-h-0">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 grid-cols-2 gap-0.5 rounded-[5px] bg-[#0f766e] p-1"
          >
            <span className="rounded-[1px] bg-white" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-white" />
          </span>
          <h1 className="text-[15px] font-bold tracking-tight text-[#0f172a]">SennaGrid</h1>
        </div>

        {/* Center Underline Tabs */}
        <div className="order-3 w-full border-t border-slate-100 sm:order-2 sm:w-auto sm:border-t-0">
          <TabNav />
        </div>

        {/* Right Minimal Utilities */}
        <div className="order-2 flex items-center gap-4 sm:order-3">
          <button
            type="button"
            onClick={openTour}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0f172a] sm:min-h-[34px]"
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            aria-label="Inspect policy verification gates"
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-slate-50 sm:min-h-[34px] ${gateTextColor}`}
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
