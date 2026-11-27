import {
  computeWeeklyQuota,
  EPIDEMIC_CONSTANTS,
  type DiseaseMode,
  type RegionId,
} from '@sennagrid/engine';
import { Check, Loader2, MapPin, RotateCcw, Search } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getRegionPreset, REGION_PRESET_LIST } from '../../data/regions';
import { formatPopulationCompact } from '../../lib/viewModels';
import {
  MAX_CITY_QUERY_LENGTH,
  searchCities,
  type CitySearchResult,
} from '../../services/geocoding';
import { useSimulationStore, type ClimateMode } from '../../store/useSimulationStore';

const BUDGET_DEBOUNCE_MS = 180;

export function ControlBar() {
  const {
    params,
    customPreset,
    climateMode,
    climate,
    liveClimateByRegion,
    weatherRefreshPending,
    output,
    isOptimizing,
    setRegion,
    selectCustomCity,
    setDiseaseMode,
    setClimateMode,
    setBudgetRatio,
    setAdvancedParam,
    resetDefaults,
    runOptimization,
  } = useSimulationStore(
    useShallow((s) => ({
      params: s.params,
      customPreset: s.customPreset,
      climateMode: s.climateMode,
      climate: s.climate,
      liveClimateByRegion: s.liveClimateByRegion,
      weatherRefreshPending: s.weatherRefreshPending,
      output: s.output,
      isOptimizing: s.isOptimizing,
      setRegion: s.setRegion,
      selectCustomCity: s.selectCustomCity,
      setDiseaseMode: s.setDiseaseMode,
      setClimateMode: s.setClimateMode,
      setBudgetRatio: s.setBudgetRatio,
      setAdvancedParam: s.setAdvancedParam,
      resetDefaults: s.resetDefaults,
      runOptimization: s.runOptimization,
    })),
  );

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [citySearchPending, setCitySearchPending] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  const [citySearchedOnce, setCitySearchedOnce] = useState(false);

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

  const preset = getRegionPreset(params.regionId, customPreset);
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

  const handleCitySearchSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setCitySearchError('Enter at least 2 characters to search.');
      setCityResults([]);
      setCitySearchedOnce(false);
      return;
    }

    setCitySearchPending(true);
    setCitySearchError(null);
    try {
      const results = await searchCities(trimmed, { count: 4 });
      setCityResults(results);
      setCitySearchedOnce(true);
    } catch {
      setCityResults([]);
      setCitySearchedOnce(false);
      setCitySearchError('Global city search unavailable offline. Select a calibrated preset above.');
    } finally {
      setCitySearchPending(false);
    }
  };

  const handlePickCustomCity = (city: CitySearchResult) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setCityResults([]);
    setCitySearchedOnce(false);
    setCitySearchError(null);
    setCityQuery(city.name);
    void selectCustomCity(city);
  };

  return (
    <aside
      aria-label="Simulation controls"
      className="flex h-full w-full shrink-0 flex-col justify-between gap-5 rounded-xl border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] p-5 transition-colors"
    >
      <div className="space-y-5">
        {/* 1. City Scenario */}
        <div data-tour="city-scenarios" className="scroll-mt-20 rounded-lg">
          <span className="mb-2 block text-[13px] font-medium text-[var(--sg-text-muted)]">
            City Scenario
          </span>
          <div
            role="radiogroup"
            aria-label="City scenario"
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1"
          >
            {REGION_PRESET_LIST.map((item) => {
              const selected = item.id === params.regionId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleRegionChange(item.id)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)]'
                      : 'border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] hover:border-[var(--sg-border-control)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[var(--sg-text-primary)]">
                      {item.name}
                    </div>
                    <div className="truncate text-xs text-[var(--sg-text-muted)]">
                      {item.districts.length} wards · {formatPopulationCompact(item.districts)} ·{' '}
                      {item.defaultDiseaseMode === 'vector_seir_sei' ? 'Dengue' : 'Resp.'}
                    </div>
                  </div>
                  {selected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-[var(--sg-teal)]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}

            {customPreset && (
              <button
                type="button"
                role="radio"
                aria-checked={customPreset.id === params.regionId}
                onClick={() => handleRegionChange(customPreset.id)}
                className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  customPreset.id === params.regionId
                    ? 'border-[var(--sg-teal)] bg-[var(--sg-teal-tint)]'
                    : 'border-[var(--sg-border-subtle)] bg-[var(--sg-surface)] hover:border-[var(--sg-border-control)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--sg-text-primary)]">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sg-teal)]" aria-hidden="true" />
                    <span className="truncate">{customPreset.name}</span>
                  </div>
                  <div className="truncate text-xs text-[var(--sg-text-muted)]">
                    {customPreset.subtitle} · Custom
                  </div>
                </div>
                {customPreset.id === params.regionId && (
                  <Check
                    className="h-4 w-4 shrink-0 text-[var(--sg-teal)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}
          </div>

          {/* Search Any Real City Worldwide */}
          <div className="mt-3 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)]/55 p-2.5">
            <label
              htmlFor="sg-city-search"
              className="mb-1.5 block text-xs font-medium text-[var(--sg-text-secondary)]"
            >
              Simulate Any City (Open-Meteo)
            </label>
            <form onSubmit={(e) => void handleCitySearchSubmit(e)} className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-text-muted)]"
                  aria-hidden="true"
                />
                <input
                  id="sg-city-search"
                  type="search"
                  maxLength={MAX_CITY_QUERY_LENGTH}
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Surabaya, London, Nairobi..."
                  className="min-h-[44px] w-full rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-surface)] py-1 pl-8 pr-2 text-xs text-[var(--sg-text-primary)] placeholder:text-[var(--sg-text-muted)] lg:min-h-[34px]"
                />
              </div>
              <button
                type="submit"
                disabled={citySearchPending}
                aria-label="Search city coordinates"
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-2.5 text-xs font-semibold text-[var(--sg-text-primary)] transition-colors hover:bg-[var(--sg-hover)] disabled:opacity-60 lg:min-h-[34px]"
              >
                {citySearchPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  'Find'
                )}
              </button>
            </form>

            {citySearchError && (
              <p role="alert" className="mt-1.5 text-xs text-[var(--sg-amber)]">
                {citySearchError}
              </p>
            )}

            {!citySearchPending && !citySearchError && citySearchedOnce && cityResults.length === 0 && (
              <p className="mt-1.5 text-xs text-[var(--sg-text-muted)]">
                No matching cities found. Try another name.
              </p>
            )}

            {cityResults.length > 0 && (
              <ul
                aria-label="Matching city results"
                className="mt-2 divide-y divide-[var(--sg-border-row)] overflow-hidden rounded-md border border-[var(--sg-border-subtle)] bg-[var(--sg-surface)]"
              >
                {cityResults.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => handlePickCustomCity(city)}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--sg-hover)] lg:min-h-[34px]"
                    >
                      <span className="min-w-0 truncate font-medium text-[var(--sg-text-primary)]">
                        {city.name}
                        <span className="font-normal text-[var(--sg-text-muted)]">
                          {city.admin1 ? `, ${city.admin1}` : ''}, {city.country}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--sg-teal)]">
                        {city.latitude.toFixed(1)}, {city.longitude.toFixed(1)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {params.regionId.startsWith('custom_') && (
              <p className="mt-2 text-[11px] leading-snug text-[var(--sg-text-muted)]">
                Custom city applies a normalized 18-ward urban density template with live Open-Meteo
                weather.
              </p>
            )}
          </div>
        </div>

        {/* 2–5. Disease Model, Budget Quota, Run CTA & Model Parameters */}
        <div data-tour="model-controls" className="scroll-mt-20 space-y-5 rounded-lg">
        {/* 2. Disease Model */}
        <div>
          <span className="mb-2 block text-[13px] font-medium text-[var(--sg-text-muted)]">
            Disease Model
          </span>
          <div
            role="group"
            aria-label="Transmission model"
            className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-1"
          >
            <button
              type="button"
              aria-pressed={params.diseaseMode === 'vector_seir_sei'}
              onClick={() => handleDiseaseModeChange('vector_seir_sei')}
              title="Vector-borne SEIR-SEI (climate-modulated Dengue)"
              className={`min-h-[44px] rounded-md px-2 py-1.5 text-sm font-semibold transition-all lg:min-h-[36px] ${
                params.diseaseMode === 'vector_seir_sei'
                  ? 'bg-[var(--sg-surface)] text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/50'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              Dengue
            </button>
            <button
              type="button"
              aria-pressed={params.diseaseMode === 'direct_seir'}
              onClick={() => handleDiseaseModeChange('direct_seir')}
              title="Direct-contact SEIR (respiratory corridor spread)"
              className={`min-h-[44px] rounded-md px-2 py-1.5 text-sm font-semibold transition-all lg:min-h-[36px] ${
                params.diseaseMode === 'direct_seir'
                  ? 'bg-[var(--sg-surface)] text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/50'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
              }`}
            >
              Respiratory
            </button>
          </div>
        </div>

        {/* 3. Weekly Budget Quota */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="sg-budget-slider"
              className="text-[13px] font-medium text-[var(--sg-text-muted)]"
            >
              Budget
            </label>
            <span className="font-mono text-sm font-semibold tabular-nums text-[var(--sg-teal)]">
              {budgetPct}% · {quotaK} {quotaK === 1 ? 'ward' : 'wards'}
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
          <div className="flex justify-between font-mono text-xs tabular-nums text-[var(--sg-text-muted)]">
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
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--sg-teal-fill)] px-4 py-2.5 text-sm font-semibold text-[var(--sg-teal-fill-ink)] transition-colors hover:bg-[var(--sg-teal-fill-hover)] disabled:opacity-70 lg:min-h-[42px]"
          >
            {isOptimizing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isOptimizing ? 'Optimizing...' : 'Run Optimization'}</span>
          </button>
          <p className="text-center font-mono text-[13px] tabular-nums text-[var(--sg-text-muted)]">
            {isOptimizing ? 'Running Web Worker...' : solveSecondsText}
          </p>
        </div>

        {/* 5. Always-Visible Model Parameters */}
        <div className="border-t border-[var(--sg-border-subtle)] pt-4">
          <h2 className="mb-3 text-[13px] font-semibold text-[var(--sg-text-primary)]">
            Model Parameters
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {/* Climate Forcing */}
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-[var(--sg-text-muted)]">
                Climate Forcing
              </span>
              <div
                role="group"
                aria-label="Climate data source"
                className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--sg-border-subtle)] bg-[var(--sg-inset)] p-1"
              >
                <button
                  type="button"
                  aria-pressed={climateMode === 'seasonal_benchmark'}
                  onClick={() => handleClimateModeChange('seasonal_benchmark')}
                  className={`min-h-[44px] rounded-md px-2 py-1 text-xs font-semibold transition-all lg:min-h-[32px] ${
                    climateMode === 'seasonal_benchmark'
                      ? 'bg-[var(--sg-surface)] text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/50'
                      : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
                  }`}
                >
                  Peak Season
                </button>
                <button
                  type="button"
                  aria-pressed={climateMode === 'live_weather'}
                  onClick={() => handleClimateModeChange('live_weather')}
                  className={`min-h-[44px] rounded-md px-2 py-1 text-xs font-semibold transition-all lg:min-h-[32px] ${
                    climateMode === 'live_weather'
                      ? 'bg-[var(--sg-surface)] text-[var(--sg-text-primary)] shadow-2xs ring-1 ring-[var(--sg-border-control)]/50'
                      : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text-primary)]'
                  }`}
                >
                  {liveWeatherLabel}
                </button>
              </div>
              {climate && (
                <p className="mt-1.5 font-mono text-xs tabular-nums text-[var(--sg-text-muted)]">
                  {climate.meanTemp14d.toFixed(1)}°C · {climate.meanPrecip14d.toFixed(1)} mm/d
                </p>
              )}
            </div>

            {/* ICU Rate */}
            <div>
              <div className="flex justify-between text-[13px]">
                <label htmlFor="sg-icu-rate" className="font-medium text-[var(--sg-text-muted)]">
                  ICU Rate
                </label>
                <span className="font-mono font-semibold tabular-nums text-[var(--sg-teal)]">
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
              <div className="flex justify-between text-[13px]">
                <label
                  htmlFor="sg-mobility-outflow"
                  className="font-medium text-[var(--sg-text-muted)]"
                >
                  Commuter Outflow
                </label>
                <span className="font-mono font-semibold tabular-nums text-[var(--sg-teal)]">
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
              <div className="flex justify-between text-[13px]">
                <label htmlFor="sg-efficacy" className="font-medium text-[var(--sg-text-muted)]">
                  Team Efficacy
                </label>
                <span className="font-mono font-semibold tabular-nums text-[var(--sg-teal)]">
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
          </div>

          <button
            type="button"
            onClick={() => void resetDefaults()}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--sg-border-control)] bg-[var(--sg-surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--sg-text-primary)] shadow-2xs transition-colors hover:bg-[var(--sg-hover)] lg:min-h-[36px]"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--sg-text-muted)]" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
        </div>
        </div>
      </div>

      {/* Anchored Footer Run Summary */}
      <dl className="mt-auto space-y-2 border-t border-[var(--sg-border-subtle)] pt-4 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--sg-text-muted)]">Horizon</dt>
          <dd className="font-mono font-medium tabular-nums text-[var(--sg-text-primary)]">
            {params.horizonDays}d ({output?.sennagrid.schedule.length ?? 13} weeks)
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--sg-text-muted)]">Solver</dt>
          <dd className="font-mono font-medium tabular-nums text-[var(--sg-text-primary)]">
            RK4 · dt={params.dt}d
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--sg-text-muted)]">City Beds</dt>
          <dd className="font-mono font-medium tabular-nums text-[var(--sg-text-primary)]">
            {output ? `${output.totalIcuCapacity} ICU beds` : 'Calculating'}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
