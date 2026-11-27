import { useShallow } from 'zustand/react/shallow';
import { useSimulationStore, type ActiveTab } from '../../store/useSimulationStore';

const TABS: ReadonlyArray<{ id: ActiveTab; label: string }> = [
  { id: 'simulator', label: 'Simulator' },
  { id: 'schedule', label: 'Weekly Plan' },
  { id: 'methodology', label: 'Methodology' },
];

export function TabNav() {
  const { activeTab, setActiveTab } = useSimulationStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
    })),
  );

  return (
    <nav aria-label="Workspace navigation" className="w-full sm:w-auto">
      <div
        role="tablist"
        aria-label="SennaGrid workspace views"
        className="flex items-center justify-center gap-6 sm:gap-7"
      >
        {TABS.map((tab) => {
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
              className={`relative inline-flex min-h-[44px] items-center px-1 text-[15px] transition-colors min-[880px]:min-h-[56px] ${
                isActive
                  ? 'font-semibold text-[var(--sg-text-primary)]'
                  : 'font-medium text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[var(--sg-teal)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
