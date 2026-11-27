import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ControlBar } from './components/layout/ControlBar';
import { Footer } from './components/layout/Footer';
import { HeaderBar } from './components/layout/HeaderBar';
import { MethodologyView } from './components/methodology/MethodologyView';
import { FeatureGuideModal } from './components/onboarding/FeatureGuideModal';
import { InteractiveTour } from './components/onboarding/InteractiveTour';
import type { GuideTab } from './components/onboarding/guideCatalog';
import { DispatchSchedule } from './components/schedule/DispatchSchedule';
import { SwapTracePanel } from './components/schedule/SwapTracePanel';
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
    <div
      aria-busy="true"
      aria-label="Loading initial optimization"
      className="grid grid-cols-1 gap-6 lg:grid-cols-[284px_minmax(0,1fr)]"
    >
      <div className="h-96 animate-pulse rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)]" />
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)]" />
        <div className="h-[460px] animate-pulse rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)]" />
      </div>
    </div>
  );
}

export default function App() {
  const {
    activeTab,
    theme,
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
    tourOpen,
    tourStep,
    guideOpen,
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
    toggleCommuterFlows,
    toggleDistrictLabels,
    setMobileMapStrategy,
    openTour,
    closeTour,
    setTourStep,
    openGuide,
    closeGuide,
  } = useSimulationStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      theme: s.theme,
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
      tourOpen: s.tourOpen,
      tourStep: s.tourStep,
      guideOpen: s.guideOpen,
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
      toggleCommuterFlows: s.toggleCommuterFlows,
      toggleDistrictLabels: s.toggleDistrictLabels,
      setMobileMapStrategy: s.setMobileMapStrategy,
      openTour: s.openTour,
      closeTour: s.closeTour,
      setTourStep: s.setTourStep,
      openGuide: s.openGuide,
      closeGuide: s.closeGuide,
    })),
  );

  const flashCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      flashCleanupRef.current?.();
      flashCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (guideOpen) {
          closeGuide();
          return;
        }
        if (tourOpen) {
          closeTour();
          return;
        }
        if (selectedDistrictId) {
          selectDistrict(null);
        }
        return;
      }

      if (guideOpen) {
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
    guideOpen,
    tourOpen,
    tourStep,
    selectedDistrictId,
    output,
    activeTab,
    closeGuide,
    closeTour,
    selectDistrict,
    setTourStep,
    togglePlaying,
    stepDay,
  ]);

  const handleNavigateToFeature = (tab: GuideTab, tourTarget: string) => {
    flashCleanupRef.current?.();
    flashCleanupRef.current = null;
    closeGuide();
    setActiveTab(tab);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        const targetEl = document.querySelector<HTMLElement>(`[data-tour="${tourTarget}"]`);
        if (!targetEl) return;

        const isHeaderTarget = tourTarget === 'header-bar';
        const classes = isHeaderTarget
          ? ['ring-2', 'ring-inset', 'ring-[var(--sg-teal-bright)]']
          : ['ring-2', 'ring-[var(--sg-teal-bright)]', 'ring-offset-2', 'ring-offset-[var(--sg-canvas)]'];

        targetEl.classList.add(...classes);
        if (isHeaderTarget) {
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        } else {
          targetEl.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }

        const timer = window.setTimeout(() => {
          targetEl.classList.remove(...classes);
        }, 1800);

        flashCleanupRef.current = () => {
          window.clearTimeout(timer);
          targetEl.classList.remove(...classes);
        };
      });
    });

    flashCleanupRef.current = () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  };

  const handleInspectDistrictFromSchedule = (districtId: string, week: number) => {
    selectDistrict(districtId);
    setCurrentDay(Math.max(0, (week - 1) * 7));
    setActiveTab('simulator');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sg-canvas)] text-[var(--sg-text-primary)] transition-colors">
      <HeaderBar />

      <div className="sr-only" aria-live="polite">
        {isOptimizing
          ? 'Running spatial epidemic optimization in background worker.'
          : output
            ? `Optimization complete in ${output.solveTimeMs} milliseconds.`
            : ''}
      </div>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--sg-rose-border)] bg-[var(--sg-rose-tint)] px-4 py-3 text-sm text-[var(--sg-rose-ink)]"
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
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--sg-rose-border)] bg-[var(--sg-surface)] px-3 py-1.5 font-semibold text-[var(--sg-rose-ink)] hover:opacity-90 sm:min-h-[36px]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Retry</span>
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
                className="grid grid-cols-1 gap-6 lg:grid-cols-[284px_minmax(0,1fr)] lg:items-stretch"
              >
                <ControlBar />

                <div className="min-w-0 space-y-5">
                  <KpiStrip
                    output={output}
                    isOptimizing={isOptimizing}
                    onInspectGates={() => setActiveTab('methodology')}
                  />

                  <SplitMapView
                    output={output}
                    theme={theme}
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
                  >
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
                  </SplitMapView>

                  <EpidemicCharts
                    output={output}
                    theme={theme}
                    currentDay={currentDay}
                    onSelectDay={setCurrentDay}
                  />
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div
                id="panel-schedule"
                role="tabpanel"
                aria-labelledby="tab-schedule"
                className="mx-auto max-w-[1240px] space-y-6"
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
                className="mx-auto max-w-[1240px]"
              >
                <MethodologyView output={output} />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <FeatureGuideModal
        isOpen={guideOpen}
        onClose={closeGuide}
        onStartLiveTour={(step) => openTour(step ?? 0)}
        onNavigateToFeature={handleNavigateToFeature}
      />

      <InteractiveTour
        isOpen={tourOpen}
        step={tourStep}
        onStepChange={setTourStep}
        onClose={closeTour}
        onOpenGuide={openGuide}
      />
    </div>
  );
}
