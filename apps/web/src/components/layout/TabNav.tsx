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
      label: 'Dispatch Schedule',
      icon: CalendarRange,
      badge: output ? `${assignmentCount} rows` : undefined,
      badgeTone: 'neutral',
    },
    {
      id: 'methodology',
      label: 'Methodology & Math',
      icon: BookOpenCheck,
      badge: gateSummary ? `${gateSummary.overallStatus} ${gateSummary.passedCount}/${gateSummary.totalGates}` : undefined,
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

  const getBadgeStyle = (tone: 'neutral' | 'pass' | 'review' | 'fail' = 'neutral') => {
    switch (tone) {
      case 'pass':
        return 'bg-[#082f23] text-[#6ee7b7] border border-emerald-500/40';
      case 'review':
        return 'bg-[#2e1f07] text-[#fcd34d] border border-amber-500/40';
      case 'fail':
        return 'bg-[#3b111c] text-[#fda4af] border border-rose-500/40';
      default:
        return 'bg-[#162033] text-slate-300 border border-slate-600/80';
    }
  };

  return (
    <nav
      aria-label="Workspace navigation"
      className="border-b border-slate-800 bg-[#0b1120]"
    >
      <div
        role="tablist"
        aria-label="SennaGrid workspace views"
        className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-1 px-4 py-1.5 min-[720px]:px-6"
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
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#0f172a] text-cyan-300 ring-1 ring-inset ring-cyan-400/60'
                  : 'text-slate-300 hover:bg-[#162033] hover:text-slate-100'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${getBadgeStyle(tab.badgeTone)}`}
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
