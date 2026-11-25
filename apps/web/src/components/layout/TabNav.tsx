import { Activity, BookOpenCheck, CalendarRange } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore, type ActiveTab } from '../../store/useSimulationStore';

export function TabNav() {
  const { activeTab, setActiveTab, output } = useSimulationStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      output: s.output,
    })),
  );

  const assignmentCount = output?.assignments.length ?? 0;
  const gateSummary = output?.gates;

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Activity;
    badge?: string;
    badgeTone?: 'neutral' | 'pass' | 'review' | 'fail';
  }> = [
    {
      id: 'simulator',
      label: 'Simulator',
      icon: Activity,
    },
    {
      id: 'schedule',
      label: 'Dispatch Plan',
      icon: CalendarRange,
      badge: output ? `${assignmentCount}` : undefined,
      badgeTone: 'neutral',
    },
    {
      id: 'methodology',
      label: 'Model & Gates',
      icon: BookOpenCheck,
      badge: gateSummary ? `${gateSummary.passedCount}/${gateSummary.totalGates}` : undefined,
      badgeTone:
        gateSummary?.overallStatus === 'PASS'
          ? 'pass'
          : gateSummary?.overallStatus === 'REVIEW'
            ? 'review'
            : gateSummary?.overallStatus === 'FAIL'
              ? 'fail'
              : 'neutral',
    },
  ];

  const getBadgeStyle = (
    isActive: boolean,
    tone: 'neutral' | 'pass' | 'review' | 'fail' = 'neutral',
  ) => {
    if (isActive) {
      return 'bg-teal-50 text-[#115e59] border border-teal-600/30';
    }
    switch (tone) {
      case 'pass':
        return 'bg-emerald-50 text-[#065f46] border border-emerald-600/30';
      case 'review':
        return 'bg-amber-50 text-[#92400e] border border-amber-600/30';
      case 'fail':
        return 'bg-rose-50 text-[#9f1239] border border-rose-600/30';
      default:
        return 'bg-white text-slate-600 border border-slate-300';
    }
  };

  return (
    <nav aria-label="Workspace navigation">
      <div
        role="tablist"
        aria-label="SennaGrid workspace views"
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all min-[720px]:min-h-[34px] ${
                isActive
                  ? 'bg-white text-[#0f172a] shadow-xs ring-1 ring-slate-300'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#0f766e]' : 'text-slate-500'}`}
                aria-hidden="true"
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${getBadgeStyle(isActive, tab.badgeTone)}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
