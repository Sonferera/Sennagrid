import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ControlBar } from './components/layout/ControlBar';
import { TabNav } from './components/layout/TabNav';
import { MethodologyView } from './components/methodology/MethodologyView';
import { InteractiveTour } from './components/onboarding/InteractiveTour';
import { DispatchSchedule } from './components/schedule/DispatchSchedule';
import { SwapTracePanel } from './components/schedule/SwapTracePanel';
import { DistrictInspector } from './components/simulator/DistrictInspector';
import { EpidemicCharts } from './components/simulator/EpidemicCharts';
import { KpiStrip } from './components/simulator/KpiStrip';
import { SplitMapView } from './components/simulator/SplitMapView';
import { TimelinePlayer } from './components/simulator/TimelinePlayer';
import { useSimulationStore } from './store/useSimulationStore';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
    return true;
  }
  return target.isContentEditable;
}

function InitialLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading initial optimization" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-32 animate-pulse rounded-lg border border-slate-800 bg-[#0f172a] p-4"
          >
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="mt-4 h-7 w-40 rounded bg-slate-800" />
            <div className="mt-4 h-4 w-32 rounded bg-slate-800" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
        <div className="h-[380px] animate-pulse rounded-lg border border-slate-800 bg-[#0f172a]" />
        <div className="h-[380px] animate-pulse rounded-lg border border-slate-800 bg-[#0f172a]" />
      </div>

      <div className="h-28 animate-pulse rounded-lg border border-slate-800 bg-[#0f172a]" />
    </div>
  );
}

export default function App() {
  const {
    activeTab,
    output,
    isOptimizing,
    error,
    currentDay,
    isPlaying,
    playbackSpeed,
    selectedDistrictId,
    syncMapsLocked,
    mobileMapStrategy,
    advancedOpen,
    tourOpen,
    tourStep,
    initialize,
    runOptimization,
    setActiveTab,
    setCurrentDay,
    stepDay,
    jumpToPeakDay,
    togglePlaying,
    setPlaying,
    setPlaybackSpeed,
    selectDistrict,
    toggleSyncMaps,
    setMobileMapStrategy,
    setAdvancedOpen,
    closeTour,
    setTourStep,
  } = useSimulationStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      output: s.output,
      isOptimizing: s.isOptimizing,
      error: s.error,
      currentDay: s.currentDay,
      isPlaying: s.isPlaying,
      playbackSpeed: s.playbackSpeed,
      selectedDistrictId: s.selectedDistrictId,
      syncMapsLocked: s.syncMapsLocked,
      mobileMapStrategy: s.mobileMapStrategy,
      advancedOpen: s.advancedOpen,
      tourOpen: s.tourOpen,
      tourStep: s.tourStep,
      initialize: s.initialize,
      runOptimization: s.runOptimization,
      setActiveTab: s.setActiveTab,
      setCurrentDay: s.setCurrentDay,
      stepDay: s.stepDay,
      jumpToPeakDay: s.jumpToPeakDay,
      togglePlaying: s.togglePlaying,
      setPlaying: s.setPlaying,
      setPlaybackSpeed: s.setPlaybackSpeed,
      selectDistrict: s.selectDistrict,
      toggleSyncMaps: s.toggleSyncMaps,
      setMobileMapStrategy: s.setMobileMapStrategy,
      setAdvancedOpen: s.setAdvancedOpen,
      closeTour: s.closeTour,
      setTourStep: s.setTourStep,
    })),
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Global keyboard shortcuts (DESIGN_SPEC.md Section 9.8)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tourOpen) {
          closeTour();
          return;
        }
        if (advancedOpen) {
          setAdvancedOpen(false);
          return;
        }
        if (selectedDistrictId) {
          selectDistrict(null);
        }
        return;
      }

      if (tourOpen) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setTourStep(tourStep + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setTourStep(tourStep - 1);
        }
        return;
      }

      if (isEditableElement(e.target) || !output || activeTab !== 'simulator') {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        togglePlaying();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepDay(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepDay(1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    tourOpen,
    tourStep,
    advancedOpen,
    selectedDistrictId,
    output,
    activeTab,
    closeTour,
    setAdvancedOpen,
    selectDistrict,
    setTourStep,
    togglePlaying,
    stepDay,
  ]);

  const handleInspectDistrictFromSchedule = (districtId: string, week: number) => {
    selectDistrict(districtId);
    setCurrentDay(Math.max(0, (week - 1) * 7));
    setActiveTab('simulator');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-100">
      <ControlBar />
      <TabNav />

      {/* Live screen reader status for async optimization */}
      <div className="sr-only" aria-live="polite">
        {isOptimizing
          ? 'Running spatial epidemic optimization in background worker.'
          : output
            ? `Optimization complete in ${output.solveTimeMs} milliseconds.`
            : ''}
      </div>

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-4 min-[720px]:px-6 min-[720px]:py-5">
        {/* Non-destructive Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/50 bg-[#3b111c] px-4 py-3 text-xs text-[#fda4af]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Optimization error:</strong> {error}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void runOptimization()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-rose-400/60 bg-[#090d16]/60 px-3 py-1.5 font-medium text-slate-100 hover:bg-[#090d16]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry Optimization</span>
            </button>
          </div>
        )}

        {!output ? (
          <InitialLoadingSkeleton />
        ) : (
          <>
            {activeTab === 'simulator' && (
              <div
                id="panel-simulator"
                role="tabpanel"
                aria-labelledby="tab-simulator"
                className="space-y-4"
              >
                <KpiStrip
                  output={output}
                  isOptimizing={isOptimizing}
                  onInspectGates={() => setActiveTab('methodology')}
                />

                <SplitMapView
                  output={output}
                  currentDay={currentDay}
                  selectedDistrictId={selectedDistrictId}
                  syncMapsLocked={syncMapsLocked}
                  mobileMapStrategy={mobileMapStrategy}
                  onSelectDistrict={selectDistrict}
                  onToggleSyncMaps={toggleSyncMaps}
                  onSetMobileMapStrategy={setMobileMapStrategy}
                />

                <DistrictInspector
                  output={output}
                  selectedDistrictId={selectedDistrictId}
                  currentDay={currentDay}
                  onClose={() => selectDistrict(null)}
                />

                <TimelinePlayer
                  output={output}
                  currentDay={currentDay}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  onSetCurrentDay={setCurrentDay}
                  onStepDay={stepDay}
                  onJumpToPeak={jumpToPeakDay}
                  onTogglePlaying={togglePlaying}
                  onSetPlaying={setPlaying}
                  onSetPlaybackSpeed={setPlaybackSpeed}
                />

                <EpidemicCharts
                  output={output}
                  currentDay={currentDay}
                  onSelectDay={setCurrentDay}
                />
              </div>
            )}

            {activeTab === 'schedule' && (
              <div
                id="panel-schedule"
                role="tabpanel"
                aria-labelledby="tab-schedule"
                className="space-y-4"
              >
                <DispatchSchedule
                  output={output}
                  onInspectDistrictAtWeek={handleInspectDistrictFromSchedule}
                />
                <SwapTracePanel output={output} />
              </div>
            )}

            {activeTab === 'methodology' && (
              <div
                id="panel-methodology"
                role="tabpanel"
                aria-labelledby="tab-methodology"
              >
                <MethodologyView output={output} />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-[#0b1120] px-4 py-3 text-xs text-slate-400 min-[720px]:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
          <span>
            SennaGrid runs 100% client-side in your browser via Web Worker (RK4 deterministic
            solver, zero backend or paid keys).
          </span>
          <span>
            Synthetic urban benchmarks (Metro Tropica &amp; Harbor Corridor) for decision-support
            research, not clinical directives.
          </span>
        </div>
      </footer>

      <InteractiveTour
        isOpen={tourOpen}
        step={tourStep}
        onStepChange={setTourStep}
        onClose={closeTour}
      />
    </div>
  );
}
