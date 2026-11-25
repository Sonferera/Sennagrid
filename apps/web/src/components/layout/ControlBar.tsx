import {
  computeWeeklyQuota,
  EPIDEMIC_CONSTANTS,
  type DiseaseMode,
  type RegionId,
} from '@sennagrid/engine';
import { Check, ChevronDown, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getRegionPreset, REGION_PRESET_LIST } from '../../data/regions';
import { formatPopulationCompact } from '../../lib/viewModels';
import { useSimulationStore, type ClimateMode } from '../../store/useSimulationStore';

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
        ? 'Fetching...'
        : 'Live Weather';

  const solveSecondsText = output
    ? `${output.evaluationsCount} plans · ${(output.solveTimeMs / 1000).toFixed(2)}s`
    : 'Initializing...';

  const handleRegionChange = (regionId: RegionId) => {
    if (regionId === params.regionId) return;
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

  const summaryClimate =
    climateMode === 'live_weather'
      ? climate?.source === 'open_meteo'
        ? `Live ${climate.meanTemp14d.toFixed(0)}°C`
        : 'Live'
      : 'Peak';

  return (
    <aside
      aria-label="Simulation controls"
      data-tour="control-bar"
      className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="space-y-5">
        {/* 1. City Scenario */}
        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">City Scenario</span>
          <div role="radiogroup" aria-label="City scenario" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {REGION_PRESET_LIST.map((item) => {
              const selected = item.id === params.regionId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleRegionChange(item.id)}
                  className={`flex min-h-[44px] w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-[#0f766e] bg-[#f0fdfa]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-[13px] font-semibold text-[#0f172a]">{item.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      {item.districts.length} districts · {formatPopulationCompact(item.districts)}
                    </div>
                  </div>
                  {selected && (
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Disease Model */}
        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">Disease Model</span>
          <div
            role="group"
            aria-label="Transmission model"
            className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              aria-pressed={params.diseaseMode === 'vector_seir_sei'}
              onClick={() => handleDiseaseModeChange('vector_seir_sei')}
              title="Vector-borne SEIR-SEI (climate-modulated Dengue)"
              className={`min-h-[44px] rounded-md px-2 py-1.5 text-xs font-semibold transition-all lg:min-h-[32px] ${
                params.diseaseMode === 'vector_seir_sei'
                  ? 'bg-white text-[#0f172a] shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              Dengue
            </button>
            <button
              type="button"
              aria-pressed={params.diseaseMode === 'direct_seir'}
              onClick={() => handleDiseaseModeChange('direct_seir')}
              title="Direct-contact SEIR (respiratory corridor spread)"
              className={`min-h-[44px] rounded-md px-2 py-1.5 text-xs font-semibold transition-all lg:min-h-[32px] ${
                params.diseaseMode === 'direct_seir'
                  ? 'bg-white text-[#0f172a] shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-[#0f172a]'
              }`}
            >
              Respiratory
            </button>
          </div>
        </div>

        {/* 3. Weekly Budget Quota */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="sg-budget-slider" className="text-xs font-medium text-slate-600">
              Budget
            </label>
            <span className="font-mono text-xs font-semibold tabular-nums text-[#0f766e]">
              {budgetPct}% · {quotaK} wards
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
            className="sg-range -my-2"
            aria-valuetext={`${budgetPct} percent, ${quotaK} of ${districtCount} districts per week`}
          />
          <div className="flex justify-between font-mono text-[11px] tabular-nums text-slate-600">
            <span>10%</span>
            <span>40%</span>
          </div>
        </div>

        {/* 4. Primary Run CTA + Quiet Telemetry */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={flushOptimizationNow}
            disabled={isOptimizing}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#115e59] disabled:opacity-70 lg:min-h-[38px]"
          >
            {isOptimizing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            <span>{isOptimizing ? 'Optimizing...' : 'Run Optimization'}</span>
          </button>
          <p className="text-center font-mono text-[11px] tabular-nums text-slate-600">
            {isOptimizing ? 'Running Web Worker...' : solveSecondsText}
          </p>
        </div>

        {/* 5. Collapsible Parameters & Climate Disclosure */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={toggleAdvancedOpen}
            aria-expanded={advancedOpen}
            aria-controls="sg-advanced-params"
            className="flex min-h-[44px] w-full items-center gap-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:text-[#0f172a] lg:min-h-[30px]"
          >
            {advancedOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            )}
            <span>
              Parameters ({summaryClimate} · {(params.icuRate * 100).toFixed(1)}% ICU)
            </span>
          </button>

          {advancedOpen && (
            <div id="sg-advanced-params" className="mt-3 space-y-4 border-t border-slate-100 pt-3">
              {/* Climate Forcing */}
              <div>
                <span className="mb-1.5 block text-[11px] font-medium text-slate-600">
                  Climate Forcing
                </span>
                <div
                  role="group"
                  aria-label="Climate data source"
                  className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={climateMode === 'seasonal_benchmark'}
                    onClick={() => handleClimateModeChange('seasonal_benchmark')}
                    className={`min-h-[44px] rounded-md px-2 py-1 text-[11px] font-semibold transition-all lg:min-h-[30px] ${
                      climateMode === 'seasonal_benchmark'
                        ? 'bg-white text-[#0f172a] shadow-2xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-[#0f172a]'
                    }`}
                  >
                    Peak Season
                  </button>
                  <button
                    type="button"
                    aria-pressed={climateMode === 'live_weather'}
                    onClick={() => handleClimateModeChange('live_weather')}
                    className={`min-h-[44px] rounded-md px-2 py-1 text-[11px] font-semibold transition-all lg:min-h-[30px] ${
                      climateMode === 'live_weather'
                        ? 'bg-white text-[#0f172a] shadow-2xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-[#0f172a]'
                    }`}
                  >
                    {liveWeatherLabel}
                  </button>
                </div>
                {climate && (
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-600">
                    {climate.meanTemp14d.toFixed(1)}°C · {climate.meanPrecip14d.toFixed(1)} mm/d
                  </p>
                )}
              </div>

              {/* ICU Rate */}
              <div>
                <div className="flex justify-between text-[11px]">
                  <label htmlFor="sg-icu-rate" className="font-medium text-slate-600">
                    ICU Rate
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-2"
                />
              </div>

              {/* Mobility Outflow */}
              <div>
                <div className="flex justify-between text-[11px]">
                  <label htmlFor="sg-mobility-outflow" className="font-medium text-slate-600">
                    Commuter Outflow
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-2"
                />
              </div>

              {/* Efficacy */}
              <div>
                <div className="flex justify-between text-[11px]">
                  <label htmlFor="sg-efficacy" className="font-medium text-slate-600">
                    Team Efficacy
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-[#0f766e]">
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
                  className="sg-range -my-2"
                />
              </div>

              <button
                type="button"
                onClick={() => void resetDefaults()}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 lg:min-h-[32px]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Reset Defaults</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
