import {
  computeWeeklyQuota,
  EPIDEMIC_CONSTANTS,
  type DiseaseMode,
  type RegionId,
} from '@sennagrid/engine';
import {
  ChevronDown,
  ChevronUp,
  CloudSun,
  Compass,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getRegionPreset, REGION_PRESET_LIST } from '../../data/regions';
import { useSimulationStore, type ClimateMode } from '../../store/useSimulationStore';
import { TabNav } from './TabNav';

const BUDGET_DEBOUNCE_MS = 180;

export function ControlBar() {
  const {
    params,
    climateMode,
    advancedOpen,
    climate,
    liveClimateByRegion,
    weatherRefreshPending,
    output,
    isOptimizing,
    setRegion,
    setDiseaseMode,
    setClimateMode,
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
      climateMode: s.climateMode,
      advancedOpen: s.advancedOpen,
      climate: s.climate,
      liveClimateByRegion: s.liveClimateByRegion,
      weatherRefreshPending: s.weatherRefreshPending,
      output: s.output,
      isOptimizing: s.isOptimizing,
      setRegion: s.setRegion,
      setDiseaseMode: s.setDiseaseMode,
      setClimateMode: s.setClimateMode,
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

  const liveSample = liveClimateByRegion[params.regionId];
  const liveWeatherLabel =
    liveSample?.source === 'open_meteo'
      ? `Live (${liveSample.meanTemp14d.toFixed(0)}°C)`
      : weatherRefreshPending
        ? 'Live...'
        : 'Live Weather';

  const gateSummary = output?.gates;
  const gatePillClasses =
    gateSummary?.overallStatus === 'PASS'
      ? 'border-emerald-600/40 bg-emerald-50 text-[#065f46]'
      : gateSummary?.overallStatus === 'REVIEW'
        ? 'border-amber-600/40 bg-amber-50 text-[#92400e]'
        : gateSummary?.overallStatus === 'FAIL'
          ? 'border-rose-600/40 bg-rose-50 text-[#9f1239]'
          : 'border-slate-400 bg-slate-100 text-slate-700';

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

  const handleClimateModeChange = (mode: ClimateMode) => {
    if (mode === climateMode) return;
    void setClimateMode(mode);
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-2xs">
      {/* Unified Clean Top Navigation Header */}
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-2.5 min-[720px]:px-6">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-md bg-[#0f766e] p-1.5 shadow-2xs"
          >
            <span className="rounded-[1px] bg-white" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-teal-200" />
            <span className="rounded-[1px] bg-white" />
          </span>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-bold tracking-tight text-[#0f172a]">
                Senna<span className="text-[#0f766e]">Grid</span>
              </h1>
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                Spatial Epidemic Resource Optimizer
              </span>
            </div>
          </div>
        </div>

        {/* Center Workspace Tabs */}
        <TabNav />

        {/* Right Telemetry & Guided Tour */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('methodology')}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:brightness-95 min-[720px]:min-h-[34px] ${gatePillClasses}`}
            aria-label="Inspect Policy Gates verification"
          >
            {gateSummary?.overallStatus === 'PASS' ? (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {gateSummary
                ? `Gates ${gateSummary.passedCount}/${gateSummary.totalGates} ${gateSummary.overallStatus}`
                : 'Verifying...'}
            </span>
          </button>

          <button
            type="button"
            onClick={openTour}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-500 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0f172a] min-[720px]:min-h-[34px]"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-[#0f766e]" aria-hidden="true" />
            <span>Guided Tour</span>
          </button>
        </div>
      </header>

      {/* Clean Single-Ribbon Scenario & Capacity Controls */}
      <section
        aria-label="Simulation controls"
        data-tour="control-bar"
        className="mx-auto max-w-[1440px] px-4 py-3 min-[720px]:px-6"
      >
        <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-12 min-[1180px]:items-end">
          {/* 1. City Scenario */}
          <div className="min-[1180px]:col-span-3">
            <label
              htmlFor="sg-region-select"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              City Scenario
            </label>
            <select
              id="sg-region-select"
              value={params.regionId}
              onChange={(e) => handleRegionChange(e.target.value as RegionId)}
              className="min-h-[44px] w-full rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-xs font-semibold text-[#0f172a] transition-colors hover:border-slate-700 min-[720px]:min-h-[38px]"
            >
              {REGION_PRESET_LIST.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.districts.length} districts)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Transmission Mode */}
          <div className="min-[1180px]:col-span-3">
            <span className="mb-1 block text-xs font-semibold text-slate-700">
              Transmission Model
            </span>
            <div
              role="group"
              aria-label="Transmission model"
              className="grid grid-cols-2 gap-1 rounded-lg border border-slate-500 bg-slate-100 p-0.5"
            >
              <button
                type="button"
                aria-pressed={params.diseaseMode === 'vector_seir_sei'}
                onClick={() => handleDiseaseModeChange('vector_seir_sei')}
                className={`min-h-[44px] rounded-md px-2.5 py-1 text-xs font-semibold transition-all min-[720px]:min-h-[34px] ${
                  params.diseaseMode === 'vector_seir_sei'
                    ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-[#0f172a]'
                }`}
              >
                Dengue (Vector)
              </button>
              <button
                type="button"
                aria-pressed={params.diseaseMode === 'direct_seir'}
                onClick={() => handleDiseaseModeChange('direct_seir')}
                className={`min-h-[44px] rounded-md px-2.5 py-1 text-xs font-semibold transition-all min-[720px]:min-h-[34px] ${
                  params.diseaseMode === 'direct_seir'
                    ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-[#0f172a]'
                }`}
              >
                Respiratory (Direct)
              </button>
            </div>
          </div>

          {/* 3. Climate Profile */}
          <div className="min-[1180px]:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-700">
              Climate Forcing
            </span>
            <div
              role="group"
              aria-label="Climate data source"
              className="grid grid-cols-2 gap-1 rounded-lg border border-slate-500 bg-slate-100 p-0.5"
            >
              <button
                type="button"
                aria-pressed={climateMode === 'seasonal_benchmark'}
                onClick={() => handleClimateModeChange('seasonal_benchmark')}
                title="Calibrated peak outbreak season climatology"
                className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all min-[720px]:min-h-[34px] ${
                  climateMode === 'seasonal_benchmark'
                    ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-[#0f172a]'
                }`}
              >
                <SunMedium className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Peak Season</span>
              </button>
              <button
                type="button"
                aria-pressed={climateMode === 'live_weather'}
                onClick={() => handleClimateModeChange('live_weather')}
                title="Real-time 14-day Open-Meteo temperature and precipitation"
                className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all min-[720px]:min-h-[34px] ${
                  climateMode === 'live_weather'
                    ? 'bg-white text-[#0f766e] shadow-2xs ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-[#0f172a]'
                }`}
              >
                <CloudSun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{liveWeatherLabel}</span>
              </button>
            </div>
          </div>

          {/* 4. Weekly Capacity Quota Slider */}
          <div className="min-[1180px]:col-span-2">
            <div className="flex items-baseline justify-between gap-1">
              <label
                htmlFor="sg-budget-slider"
                className="text-xs font-semibold text-slate-700"
              >
                Weekly Team Quota
              </label>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#115e59]">
                {budgetPct}% ({quotaK}/{districtCount})
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
              className="sg-range -my-1"
              aria-valuetext={`${budgetPct} percent, ${quotaK} of ${districtCount} districts per week`}
            />
          </div>

          {/* 5. Parameters Drawer + Re-Run CTA */}
          <div className="flex items-center gap-2 min-[1180px]:col-span-2 min-[1180px]:justify-end">
            <button
              type="button"
              onClick={toggleAdvancedOpen}
              aria-expanded={advancedOpen}
              aria-controls="sg-advanced-params"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0f172a] min-[720px]:min-h-[38px]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span>Tune</span>
              {advancedOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={flushOptimizationNow}
              disabled={isOptimizing}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0f766e] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-[#0d9488] disabled:opacity-70 min-[720px]:min-h-[38px] min-[1180px]:flex-initial"
            >
              {isOptimizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              )}
              <span>{isOptimizing ? 'Solving...' : 'Optimize'}</span>
            </button>
          </div>
        </div>

        {/* Subtle Context & Compute Readout */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <p>
            <strong className="font-semibold text-slate-800">{preset.name}:</strong>{' '}
            {preset.description}
          </p>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {climate && (
              <>
                {climate.source === 'open_meteo' ? 'Open-Meteo' : 'Seasonal Benchmark'}{' '}
                {climate.meanTemp14d.toFixed(1)}°C / {climate.meanPrecip14d.toFixed(1)} mm ·{' '}
              </>
            )}
            {isOptimizing
              ? 'Solving...'
              : output
                ? `${output.evaluationsCount} schedules in ${output.solveTimeMs} ms`
                : 'Initializing...'}
          </span>
        </div>

        {/* Collapsible Advanced Parameters Drawer */}
        {advancedOpen && (
          <div
            id="sg-advanced-params"
            className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-[#0f172a]">
                  Epidemiological Sensitivity Parameters
                </h2>
                <p className="text-xs text-slate-600">
                  Stress-test how hospitalization severity, commuter coupling, and intervention
                  strength shift optimal district priority.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void resetDefaults()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#0f172a] min-[720px]:min-h-[34px]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="sg-icu-rate" className="text-xs font-semibold text-slate-700">
                    ICU Hospitalization Rate
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-1"
                />
                <p className="text-[11px] text-slate-500">Default: 1.50% of active cases need ICU.</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <label
                    htmlFor="sg-mobility-outflow"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Daily Commuter Outflow
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-1"
                />
                <p className="text-[11px] text-slate-500">Default: 18% cross-district commuting.</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="sg-efficacy" className="text-xs font-semibold text-slate-700">
                    Intervention Efficacy
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-1"
                />
                <p className="text-[11px] text-slate-500">
                  Default: {Math.round(defaultEfficacy * 100)}% suppression in treated wards.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
