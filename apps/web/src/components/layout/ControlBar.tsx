import { computeWeeklyQuota, EPIDEMIC_CONSTANTS, type DiseaseMode, type RegionId } from '@sennagrid/engine';
import {
  ChevronDown,
  ChevronUp,
  CloudOff,
  CloudSun,
  Compass,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getRegionPreset, REGION_PRESET_LIST } from '../../data/regions';
import { useSimulationStore } from '../../store/useSimulationStore';

const BUDGET_DEBOUNCE_MS = 180;

export function ControlBar() {
  const {
    params,
    advancedOpen,
    climate,
    weatherRefreshPending,
    output,
    isOptimizing,
    setRegion,
    setDiseaseMode,
    setBudgetRatio,
    setAdvancedParam,
    resetDefaults,
    runOptimization,
    toggleAdvancedOpen,
    setActiveTab,
    openTour,
  } = useSimulationStore(
    useShallow((s) => ({
      params: s.params,
      advancedOpen: s.advancedOpen,
      climate: s.climate,
      weatherRefreshPending: s.weatherRefreshPending,
      output: s.output,
      isOptimizing: s.isOptimizing,
      setRegion: s.setRegion,
      setDiseaseMode: s.setDiseaseMode,
      setBudgetRatio: s.setBudgetRatio,
      setAdvancedParam: s.setAdvancedParam,
      resetDefaults: s.resetDefaults,
      runOptimization: s.runOptimization,
      toggleAdvancedOpen: s.toggleAdvancedOpen,
      setActiveTab: s.setActiveTab,
      openTour: s.openTour,
    })),
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const scheduleOptimization = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runOptimization();
    }, BUDGET_DEBOUNCE_MS);
  };

  const flushOptimizationNow = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void runOptimization();
  };

  const preset = getRegionPreset(params.regionId);
  const districtCount = preset.districts.length;
  const quotaK = computeWeeklyQuota(districtCount, params.budgetRatio);
  const budgetPct = Math.round(params.budgetRatio * 100);
  const defaultEfficacy =
    params.diseaseMode === 'vector_seir_sei'
      ? EPIDEMIC_CONSTANTS.vector.etaVec
      : EPIDEMIC_CONSTANTS.direct.etaInt;
  const activeEfficacy = params.interventionEfficacy ?? defaultEfficacy;

  const isLiveWeather = climate?.source === 'open_meteo';
  const gateSummary = output?.gates;

  const gatePillClasses =
    gateSummary?.overallStatus === 'PASS'
      ? 'border-emerald-500/60 bg-[#082f23] text-[#6ee7b7]'
      : gateSummary?.overallStatus === 'REVIEW'
        ? 'border-amber-500/60 bg-[#2e1f07] text-[#fcd34d]'
        : gateSummary?.overallStatus === 'FAIL'
          ? 'border-rose-500/60 bg-[#3b111c] text-[#fda4af]'
          : 'border-slate-500 bg-[#162033] text-slate-300';

  const handleRegionChange = (regionId: RegionId) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void setRegion(regionId);
  };

  const handleDiseaseModeChange = (mode: DiseaseMode) => {
    if (mode === params.diseaseMode) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void setDiseaseMode(mode);
  };

  return (
    <div className="border-b border-slate-800 bg-[#0f172a]">
      {/* Compact Application Header */}
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 min-[720px]:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-bold tracking-tight text-slate-100">
            Senna<span className="text-cyan-400">Grid</span>
          </h1>
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-slate-400">
            Spatial Epidemic Optimizer
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live / Fallback Weather Status Pill */}
          <div
            className={`inline-flex min-h-[36px] items-center gap-2 rounded-md border px-2.5 py-1 text-xs ${
              isLiveWeather
                ? 'border-emerald-500/50 bg-[#082f23] text-[#6ee7b7]'
                : 'border-slate-500 bg-[#162033] text-slate-300'
            }`}
            title="Daily temperature and 7-day rolling rainfall modulate Vector SEIR-SEI transmission."
          >
            {isLiveWeather ? (
              <CloudSun className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CloudOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            )}
            <span className="font-medium">
              {isLiveWeather
                ? 'Live Weather: Open-Meteo'
                : weatherRefreshPending
                  ? 'Fallback Climate (Checking Open-Meteo)'
                  : 'Fallback Climatology'}
            </span>
            {climate && (
              <span className="hidden border-l border-slate-600/70 pl-2 font-mono tabular-nums text-slate-200 sm:inline">
                {climate.meanTemp14d.toFixed(1)} C / {climate.meanPrecip14d.toFixed(1)} mm/d
              </span>
            )}
          </div>

          {/* Policy Gate Quick Status */}
          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors hover:brightness-110 min-[720px]:min-h-[36px] ${gatePillClasses}`}
            aria-label="Inspect Policy Gates in Methodology tab"
          >
            {gateSummary?.overallStatus === 'PASS' ? (
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {gateSummary
                ? `Gates ${gateSummary.overallStatus} ${gateSummary.passedCount}/${gateSummary.totalGates}`
                : 'Gates Pending'}
            </span>
          </button>

          {/* Guided Tour Trigger */}
          <button
            type="button"
            onClick={openTour}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-500 bg-[#162033] px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-cyan-400 hover:text-cyan-300 min-[720px]:min-h-[36px]"
          >
            <Compass className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            <span>Guided Tour</span>
          </button>
        </div>
      </header>

      {/* Two-Level Simulation Control Bar */}
      <section
        aria-label="Simulation controls"
        data-tour="control-bar"
        className="mx-auto max-w-[1440px] px-4 py-3.5 min-[720px]:px-6"
      >
        <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-12 min-[1180px]:items-end">
          {/* Scenario Preset Selector */}
          <div className="min-[1180px]:col-span-3">
            <label
              htmlFor="sg-region-select"
              className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400"
            >
              Urban Scenario
            </label>
            <select
              id="sg-region-select"
              value={params.regionId}
              onChange={(e) => handleRegionChange(e.target.value as RegionId)}
              className="min-h-[44px] w-full rounded-md border border-slate-500 bg-[#162033] px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-slate-400"
            >
              {REGION_PRESET_LIST.map((item) => (
                <option key={item.id} value={item.id} className="bg-[#0f172a] text-slate-100">
                  {item.name} ({item.districts.length} districts)
                </option>
              ))}
            </select>
          </div>

          {/* Disease Model Toggle */}
          <div className="min-[1180px]:col-span-3">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400">
              Disease Model
            </span>
            <div
              role="group"
              aria-label="Disease transmission model"
              className="grid grid-cols-2 gap-1 rounded-md border border-slate-500 bg-[#162033] p-1"
            >
              <button
                type="button"
                aria-pressed={params.diseaseMode === 'vector_seir_sei'}
                onClick={() => handleDiseaseModeChange('vector_seir_sei')}
                className={`min-h-[44px] rounded px-2.5 py-1.5 text-xs font-medium transition-colors min-[720px]:min-h-[36px] ${
                  params.diseaseMode === 'vector_seir_sei'
                    ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-inset ring-cyan-400/60'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                Vector SEIR-SEI
              </button>
              <button
                type="button"
                aria-pressed={params.diseaseMode === 'direct_seir'}
                onClick={() => handleDiseaseModeChange('direct_seir')}
                className={`min-h-[44px] rounded px-2.5 py-1.5 text-xs font-medium transition-colors min-[720px]:min-h-[36px] ${
                  params.diseaseMode === 'direct_seir'
                    ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-inset ring-cyan-400/60'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                Direct SEIR
              </button>
            </div>
          </div>

          {/* Weekly Budget Slider */}
          <div className="min-[1180px]:col-span-3">
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="sg-budget-slider"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-400"
              >
                Weekly Budget Quota
              </label>
              <span className="font-mono text-xs font-semibold tabular-nums text-cyan-300">
                {budgetPct}% ({quotaK}/{districtCount} districts/wk)
              </span>
            </div>
            <input
              id="sg-budget-slider"
              type="range"
              min={10}
              max={40}
              step={5}
              value={budgetPct}
              onChange={(e) => {
                setBudgetRatio(Number(e.target.value) / 100);
                scheduleOptimization();
              }}
              onPointerUp={flushOptimizationNow}
              onKeyUp={(e) => {
                if (
                  e.key === 'ArrowLeft' ||
                  e.key === 'ArrowRight' ||
                  e.key === 'Home' ||
                  e.key === 'End'
                ) {
                  flushOptimizationNow();
                }
              }}
              className="sg-range"
              aria-valuetext={`${budgetPct} percent, ${quotaK} of ${districtCount} districts per week`}
            />
          </div>

          {/* Run Optimization CTA & Advanced Drawer Toggle */}
          <div className="flex flex-wrap items-center gap-2 min-[1180px]:col-span-3 min-[1180px]:justify-end">
            <button
              type="button"
              onClick={flushOptimizationNow}
              disabled={isOptimizing}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#04111a] transition-colors hover:bg-cyan-300 disabled:opacity-75 min-[1180px]:flex-initial"
            >
              {isOptimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              )}
              <span>{isOptimizing ? 'Optimizing...' : 'Run Optimization'}</span>
            </button>

            <button
              type="button"
              onClick={toggleAdvancedOpen}
              aria-expanded={advancedOpen}
              aria-controls="sg-advanced-params"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-slate-500 bg-[#162033] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-400 hover:text-slate-100"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Advanced</span>
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Scenario Metadata Sub-strip */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <p className="max-w-3xl">
            <span className="font-medium text-slate-200">{preset.subtitle}:</span>{' '}
            {preset.description}
          </p>
          <span className="font-mono tabular-nums text-slate-300">
            {isOptimizing
              ? 'Worker running RK4 + local search...'
              : output
                ? `Solved in ${output.solveTimeMs} ms (${output.evaluationsCount} evals)`
                : 'Awaiting initial simulation'}
          </span>
        </div>

        {/* Collapsible Advanced Parameters Drawer */}
        {advancedOpen && (
          <div
            id="sg-advanced-params"
            className="mt-3 rounded-lg border border-slate-700 bg-[#162033] p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-200">
                  Advanced Epidemiological Parameters
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Adjust model assumptions and re-run to stress-test allocation sensitivity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void resetDefaults()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-500 bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 min-[720px]:min-h-[36px]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-3">
              {/* ICU Rate */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="sg-icu-rate" className="text-xs font-medium text-slate-300">
                    ICU Hospitalization Rate
                  </label>
                  <span className="font-mono text-xs tabular-nums text-cyan-300">
                    {(params.icuRate * 100).toFixed(2)}%
                  </span>
                </div>
                <input
                  id="sg-icu-rate"
                  type="range"
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  value={Number((params.icuRate * 100).toFixed(1))}
                  onChange={(e) => {
                    setAdvancedParam({ icuRate: Number(e.target.value) / 100 });
                    scheduleOptimization();
                  }}
                  onPointerUp={flushOptimizationNow}
                  className="sg-range"
                />
                <p className="text-[11px] text-slate-400">Default: 1.50% of active infections.</p>
              </div>

              {/* Mobility Outflow */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="sg-mobility-outflow" className="text-xs font-medium text-slate-300">
                    Commuter Mobility Outflow
                  </label>
                  <span className="font-mono text-xs tabular-nums text-cyan-300">
                    {Math.round(params.mobilityOutflow * 100)}%
                  </span>
                </div>
                <input
                  id="sg-mobility-outflow"
                  type="range"
                  min={0}
                  max={40}
                  step={2}
                  value={Math.round(params.mobilityOutflow * 100)}
                  onChange={(e) => {
                    setAdvancedParam({ mobilityOutflow: Number(e.target.value) / 100 });
                    scheduleOptimization();
                  }}
                  onPointerUp={flushOptimizationNow}
                  className="sg-range"
                />
                <p className="text-[11px] text-slate-400">Default: 18% cross-district coupling.</p>
              </div>

              {/* Intervention Efficacy */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="sg-efficacy" className="text-xs font-medium text-slate-300">
                    Intervention Efficacy
                  </label>
                  <span className="font-mono text-xs tabular-nums text-cyan-300">
                    {Math.round(activeEfficacy * 100)}%
                  </span>
                </div>
                <input
                  id="sg-efficacy"
                  type="range"
                  min={30}
                  max={90}
                  step={5}
                  value={Math.round(activeEfficacy * 100)}
                  onChange={(e) => {
                    setAdvancedParam({ interventionEfficacy: Number(e.target.value) / 100 });
                    scheduleOptimization();
                  }}
                  onPointerUp={flushOptimizationNow}
                  className="sg-range"
                />
                <p className="text-[11px] text-slate-400">
                  Mode default: {Math.round(defaultEfficacy * 100)}% transmission suppression.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
