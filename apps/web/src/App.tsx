import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ControlBar } from './components/layout/ControlBar';
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
      <div className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="mt-4 h-7 w-36 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-12">
        <div className="h-[460px] animate-pulse rounded-xl border border-slate-200 bg-white min-[1180px]:col-span-9" />
        <div className="h-[460px] animate-pulse rounded-xl border border-slate-200 bg-white min-[1180px]:col-span-3" />
      </div>
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
    showCommuterFlows,
    showDistrictLabels,
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
    playFromStart,
    togglePlaying,
    setPlaying,
    setPlaybackSpeed,
    selectDistrict,
    toggleSyncMaps,
    toggleCommuterFlows,
    toggleDistrictLabels,
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
      showCommuterFlows: s.showCommuterFlows,
      showDistrictLabels: s.showDistrictLabels,
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
      playFromStart: s.playFromStart,
      togglePlaying: s.togglePlaying,
      setPlaying: s.setPlaying,
      setPlaybackSpeed: s.setPlaybackSpeed,
      selectDistrict: s.selectDistrict,
      toggleSyncMaps: s.toggleSyncMaps,
      toggleCommuterFlows: s.toggleCommuterFlows,
      toggleDistrictLabels: s.toggleDistrictLabels,
      setMobileMapStrategy: s.setMobileMapStrategy,
      setAdvancedOpen: s.setAdvancedOpen,
      closeTour: s.closeTour,
      setTourStep: s.setTourStep,
    })),
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

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
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-[#0f172a]">
      <ControlBar />

      <div className="sr-only" aria-live="polite">
        {isOptimizing
          ? 'Running spatial epidemic optimization in background worker.'
          : output
            ? `Optimization complete in ${output.solveTimeMs} milliseconds.`
            : ''}
      </div>

      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-4 min-[720px]:px-6">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-[#9f1239]"
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
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-500/40 bg-white px-3 py-1.5 font-semibold text-[#9f1239] hover:bg-rose-100"
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

                {/* Unified 12-Column Spatial Stage: Map + Attached Timeline + Docked Watchlist/Inspector */}
                <div className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-12 min-[1180px]:items-stretch">
                  <div className="min-[1180px]:col-span-9">
                    <SplitMapView
                      output={output}
                      currentDay={currentDay}
                      selectedDistrictId={selectedDistrictId}
                      syncMapsLocked={syncMapsLocked}
                      showCommuterFlows={showCommuterFlows}
                      showDistrictLabels={showDistrictLabels}
                      mobileMapStrategy={mobileMapStrategy}
                      onSelectDistrict={selectDistrict}
                      onToggleSyncMaps={toggleSyncMaps}
                      onToggleCommuterFlows={toggleCommuterFlows}
                      onToggleDistrictLabels={toggleDistrictLabels}
                      onSetMobileMapStrategy={setMobileMapStrategy}
                    />
                    <TimelinePlayer
                      output={output}
                      currentDay={currentDay}
                      isPlaying={isPlaying}
                      playbackSpeed={playbackSpeed}
                      onSetCurrentDay={setCurrentDay}
                      onStepDay={stepDay}
                      onJumpToPeak={jumpToPeakDay}
                      onPlayFromStart={playFromStart}
                      onTogglePlaying={togglePlaying}
                      onSetPlaying={setPlaying}
                      onSetPlaybackSpeed={setPlaybackSpeed}
                    />
                  </div>

                  <div className="min-[1180px]:col-span-3">
                    <DistrictInspector
                      output={output}
                      selectedDistrictId={selectedDistrictId}
                      currentDay={currentDay}
                      onSelectDistrict={selectDistrict}
                    />
                  </div>
                </div>

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

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 min-[720px]:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
          <span>
            SennaGrid runs 100% client-side in your browser via Web Worker (deterministic RK4
            solver, zero backend or paid API keys).
          </span>
          <span>
            Synthetic urban benchmarks (Metro Tropica &amp; Harbor Corridor) for public health
            planning research, not clinical directives.
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
