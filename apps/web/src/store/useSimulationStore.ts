import {
  DEFAULT_SIMULATION_PARAMS,
  getFallbackClimateSeries,
  type ClimateSeries,
  type DiseaseMode,
  type OptimizationOutput,
  type RegionId,
  type SimulationParams,
} from '@sennagrid/engine';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import {
  getLiveTourStepCount,
  getLiveTourTabForStep,
} from '../components/onboarding/guideCatalog';
import { getRegionPreset } from '../data/regions';
import { findCrisisFocusDay, findReactivePeakIcuDay } from '../lib/viewModels';
import { fetchRegionClimate } from '../services/weather';
import {
  createOptimizerWorkerClient,
  type OptimizerWorkerClient,
} from '../workers/optimizerClient';

export type ActiveTab = 'simulator' | 'schedule' | 'methodology';
export type PlaybackSpeed = 1 | 2 | 4;
export type MobileMapStrategy = 'reactive' | 'sennagrid';
export type ClimateMode = 'seasonal_benchmark' | 'live_weather';
export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'sennagrid-theme';

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function persistAndApplyTheme(theme: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota or sandbox errors
    }
  }
}

export interface SimulationStoreDependencies {
  fetchClimate?: (regionId: RegionId) => Promise<ClimateSeries>;
  getFallbackClimate?: (regionId: RegionId, anchorLat: number, anchorLng: number) => ClimateSeries;
  createWorkerClient?: () => OptimizerWorkerClient;
}

export interface SimulationStoreState {
  params: SimulationParams;
  climateMode: ClimateMode;
  theme: ThemeMode;
  advancedOpen: boolean;
  activeTab: ActiveTab;
  selectedDistrictId: string | null;
  syncMapsLocked: boolean;
  showCommuterFlows: boolean;
  showDistrictLabels: boolean;
  mobileMapStrategy: MobileMapStrategy;
  currentDay: number;
  hasUserScrubbedDay: boolean;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  climate: ClimateSeries | null;
  liveClimateByRegion: Partial<Record<RegionId, ClimateSeries>>;
  weatherRefreshPending: boolean;
  output: OptimizationOutput | null;
  isOptimizing: boolean;
  hasInitialized: boolean;
  error: string | null;
  tourOpen: boolean;
  tourStep: number;
  guideOpen: boolean;

  initialize: () => Promise<void>;
  setRegion: (regionId: RegionId) => Promise<void>;
  setDiseaseMode: (diseaseMode: DiseaseMode) => Promise<void>;
  setClimateMode: (mode: ClimateMode) => Promise<void>;
  setBudgetRatio: (budgetRatio: number) => void;
  setAdvancedParam: (
    patch: Partial<Pick<SimulationParams, 'icuRate' | 'mobilityOutflow' | 'interventionEfficacy'>>,
  ) => void;
  resetDefaults: () => Promise<void>;
  runOptimization: (
    overrideParams?: SimulationParams,
    overrideClimate?: ClimateSeries,
    focusPeakOnSettle?: boolean,
  ) => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrentDay: (day: number, fromUser?: boolean) => void;
  stepDay: (delta: number) => void;
  jumpToPeakDay: () => void;
  playFromStart: () => void;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  selectDistrict: (districtId: string | null) => void;
  toggleSyncMaps: () => void;
  toggleCommuterFlows: () => void;
  toggleDistrictLabels: () => void;
  setMobileMapStrategy: (strategy: MobileMapStrategy) => void;
  toggleAdvancedOpen: () => void;
  setAdvancedOpen: (open: boolean) => void;
  openTour: (initialStep?: number) => void;
  closeTour: () => void;
  setTourStep: (step: number) => void;
  openGuide: () => void;
  closeGuide: () => void;
  dispose: () => void;
}

function clampBudget(ratio: number): number {
  const clamped = Math.max(0.1, Math.min(0.4, ratio));
  return Number(clamped.toFixed(2));
}

function getMaxDay(output: OptimizationOutput | null, params: SimulationParams): number {
  if (output && output.reactive.dailyTotalActive.length > 0) {
    return output.reactive.dailyTotalActive.length - 1;
  }
  return Math.max(0, params.horizonDays);
}

export function createSimulationStore(
  deps: SimulationStoreDependencies = {},
): UseBoundStore<StoreApi<SimulationStoreState>> {
  const fetchClimateFn = deps.fetchClimate ?? ((regionId: RegionId) => fetchRegionClimate(regionId));
  const fallbackClimateFn = deps.getFallbackClimate ?? getFallbackClimateSeries;
  const createClientFn = deps.createWorkerClient ?? createOptimizerWorkerClient;

  let workerClient: OptimizerWorkerClient | null = null;
  let activeRunToken = 0;
  let activeWeatherToken = 0;

  function getWorkerClient(): OptimizerWorkerClient {
    if (!workerClient) {
      workerClient = createClientFn();
    }
    return workerClient;
  }

  return create<SimulationStoreState>((set, get) => {
    const resolveActiveClimate = (regionId: RegionId, mode: ClimateMode): ClimateSeries => {
      const preset = getRegionPreset(regionId);
      if (mode === 'live_weather') {
        const cachedLive = get().liveClimateByRegion[regionId];
        if (cachedLive) {
          return cachedLive;
        }
      }
      return fallbackClimateFn(regionId, preset.anchorLat, preset.anchorLng);
    };

    const prefetchLiveClimateInBackground = (regionId: RegionId) => {
      if (get().liveClimateByRegion[regionId]) {
        return;
      }

      const weatherToken = ++activeWeatherToken;
      set({ weatherRefreshPending: true });

      void fetchClimateFn(regionId)
        .then((resolvedClimate) => {
          const stillSameToken = weatherToken === activeWeatherToken;
          set((state) => ({
            liveClimateByRegion: {
              ...state.liveClimateByRegion,
              [regionId]: resolvedClimate,
            },
            weatherRefreshPending: stillSameToken ? false : state.weatherRefreshPending,
          }));

          const current = get();
          if (
            stillSameToken &&
            current.params.regionId === regionId &&
            current.climateMode === 'live_weather'
          ) {
            set({ climate: resolvedClimate });
            void get().runOptimization(current.params, resolvedClimate, !current.hasUserScrubbedDay);
          }
        })
        .catch(() => {
          if (weatherToken === activeWeatherToken) {
            set({ weatherRefreshPending: false });
          }
        });
    };

    return {
      params: { ...DEFAULT_SIMULATION_PARAMS },
      climateMode: 'seasonal_benchmark',
      theme: readInitialTheme(),
      advancedOpen: false,
      activeTab: 'simulator',
      selectedDistrictId: null,
      syncMapsLocked: true,
      showCommuterFlows: true,
      showDistrictLabels: true,
      mobileMapStrategy: 'sennagrid',
      currentDay: 0,
      hasUserScrubbedDay: false,
      isPlaying: false,
      playbackSpeed: 1,
      climate: null,
      liveClimateByRegion: {},
      weatherRefreshPending: false,
      output: null,
      isOptimizing: false,
      hasInitialized: false,
      error: null,
      tourOpen: false,
      tourStep: 0,
      guideOpen: false,

      async initialize() {
        if (get().hasInitialized) {
          return;
        }
        set({ hasInitialized: true });
        const { params, climateMode } = get();
        const immediateClimate = resolveActiveClimate(params.regionId, climateMode);
        set({ climate: immediateClimate });

        prefetchLiveClimateInBackground(params.regionId);
        await get().runOptimization(params, immediateClimate, true);
      },

      async setRegion(regionId) {
        const preset = getRegionPreset(regionId);
        const nextParams: SimulationParams = {
          ...get().params,
          regionId,
          diseaseMode: preset.defaultDiseaseMode,
          interventionEfficacy: undefined,
        };
        const immediateClimate = resolveActiveClimate(regionId, get().climateMode);

        set({
          params: nextParams,
          selectedDistrictId: null,
          isPlaying: false,
          hasUserScrubbedDay: false,
          climate: immediateClimate,
          error: null,
        });

        prefetchLiveClimateInBackground(regionId);
        await get().runOptimization(nextParams, immediateClimate, true);
      },

      async setDiseaseMode(diseaseMode) {
        const nextParams: SimulationParams = {
          ...get().params,
          diseaseMode,
          interventionEfficacy: undefined,
        };
        set({ params: nextParams, isPlaying: false, hasUserScrubbedDay: false, error: null });
        await get().runOptimization(nextParams, undefined, true);
      },

      async setClimateMode(mode) {
        const { params, liveClimateByRegion } = get();
        set({ climateMode: mode, isPlaying: false, error: null });

        if (mode === 'live_weather' && !liveClimateByRegion[params.regionId]) {
          set({ weatherRefreshPending: true });
          const fetched = await fetchClimateFn(params.regionId);
          set((state) => ({
            liveClimateByRegion: {
              ...state.liveClimateByRegion,
              [params.regionId]: fetched,
            },
            weatherRefreshPending: false,
            climate: fetched,
          }));
          await get().runOptimization(params, fetched, true);
          return;
        }

        const nextClimate = resolveActiveClimate(params.regionId, mode);
        set({ climate: nextClimate });
        await get().runOptimization(params, nextClimate, true);
      },

      setBudgetRatio(budgetRatio) {
        const nextRatio = clampBudget(budgetRatio);
        set((state) => ({
          params: {
            ...state.params,
            budgetRatio: nextRatio,
          },
        }));
      },

      setAdvancedParam(patch) {
        set((state) => ({
          params: {
            ...state.params,
            ...patch,
          },
        }));
      },

      async resetDefaults() {
        const regionId = get().params.regionId;
        const preset = getRegionPreset(regionId);
        const nextParams: SimulationParams = {
          ...DEFAULT_SIMULATION_PARAMS,
          regionId,
          diseaseMode: preset.defaultDiseaseMode,
        };
        const seasonalClimate = resolveActiveClimate(regionId, 'seasonal_benchmark');
        set({
          params: nextParams,
          climateMode: 'seasonal_benchmark',
          climate: seasonalClimate,
          isPlaying: false,
          hasUserScrubbedDay: false,
          error: null,
        });
        await get().runOptimization(nextParams, seasonalClimate, true);
      },

      async runOptimization(overrideParams, overrideClimate, focusPeakOnSettle = false) {
        const params = overrideParams ?? get().params;
        const climate =
          overrideClimate ??
          get().climate ??
          resolveActiveClimate(params.regionId, get().climateMode);
        const preset = getRegionPreset(params.regionId);

        const runToken = ++activeRunToken;
        set({
          params,
          climate,
          isOptimizing: true,
          error: null,
        });

        try {
          const result = await getWorkerClient().run(preset.districts, params, climate);
          if (result === null || runToken !== activeRunToken) {
            return;
          }

          const maxDay = Math.max(0, result.reactive.dailyTotalActive.length - 1);
          const prevSelected = get().selectedDistrictId;
          const validSelected =
            prevSelected && result.districts.some((d) => d.id === prevSelected)
              ? prevSelected
              : null;

          const targetDay = focusPeakOnSettle
            ? findCrisisFocusDay(result)
            : Math.max(0, Math.min(maxDay, get().currentDay));

          set({
            output: result,
            climate: result.climate,
            selectedDistrictId: validSelected,
            currentDay: targetDay,
            isOptimizing: false,
            error: null,
          });
        } catch (err) {
          if (runToken !== activeRunToken) {
            return;
          }
          const message =
            err instanceof Error ? err.message : 'Unable to complete spatial optimization run.';
          set({
            isOptimizing: false,
            error: message,
          });
        }
      },

      setActiveTab(tab) {
        set({ activeTab: tab });
      },

      setTheme(theme) {
        persistAndApplyTheme(theme);
        set({ theme });
      },

      toggleTheme() {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        persistAndApplyTheme(next);
        set({ theme: next });
      },

      setCurrentDay(day, fromUser = true) {
        const maxDay = getMaxDay(get().output, get().params);
        const clamped = Math.max(0, Math.min(maxDay, Math.round(day)));
        set((state) => ({
          currentDay: clamped,
          hasUserScrubbedDay: fromUser ? true : state.hasUserScrubbedDay,
          isPlaying: clamped >= maxDay ? false : state.isPlaying,
        }));
      },

      stepDay(delta) {
        const state = get();
        const maxDay = getMaxDay(state.output, state.params);
        const nextDay = Math.max(0, Math.min(maxDay, state.currentDay + delta));
        set({
          currentDay: nextDay,
          hasUserScrubbedDay: true,
          isPlaying: false,
        });
      },

      jumpToPeakDay() {
        const output = get().output;
        if (!output) return;
        const peakDay = findReactivePeakIcuDay(output);
        set({
          currentDay: peakDay,
          hasUserScrubbedDay: true,
          isPlaying: false,
        });
      },

      playFromStart() {
        set({
          currentDay: 0,
          hasUserScrubbedDay: true,
          isPlaying: true,
        });
      },

      togglePlaying() {
        const state = get();
        const maxDay = getMaxDay(state.output, state.params);
        if (!state.isPlaying && state.currentDay >= maxDay) {
          set({ currentDay: 0, hasUserScrubbedDay: true, isPlaying: true });
          return;
        }
        set({ isPlaying: !state.isPlaying, hasUserScrubbedDay: true });
      },

      setPlaying(playing) {
        set({ isPlaying: playing });
      },

      setPlaybackSpeed(speed) {
        set({ playbackSpeed: speed });
      },

      selectDistrict(districtId) {
        set({ selectedDistrictId: districtId });
      },

      toggleSyncMaps() {
        set((state) => ({ syncMapsLocked: !state.syncMapsLocked }));
      },

      toggleCommuterFlows() {
        set((state) => ({ showCommuterFlows: !state.showCommuterFlows }));
      },

      toggleDistrictLabels() {
        set((state) => ({ showDistrictLabels: !state.showDistrictLabels }));
      },

      setMobileMapStrategy(strategy) {
        set({ mobileMapStrategy: strategy });
      },

      toggleAdvancedOpen() {
        set((state) => ({ advancedOpen: !state.advancedOpen }));
      },

      setAdvancedOpen(open) {
        set({ advancedOpen: open });
      },

      openTour(initialStep) {
        const maxStep = Math.max(0, getLiveTourStepCount() - 1);
        const startStep =
          typeof initialStep === 'number' && Number.isFinite(initialStep)
            ? Math.max(0, Math.min(maxStep, Math.round(initialStep)))
            : 0;
        set({
          guideOpen: false,
          tourOpen: true,
          tourStep: startStep,
          activeTab: getLiveTourTabForStep(startStep),
        });
      },

      closeTour() {
        set({ tourOpen: false });
      },

      setTourStep(step) {
        const maxStep = Math.max(0, getLiveTourStepCount() - 1);
        const clamped = Math.max(0, Math.min(maxStep, Math.round(step)));
        set({
          tourStep: clamped,
          activeTab: getLiveTourTabForStep(clamped),
        });
      },

      openGuide() {
        set({ guideOpen: true, tourOpen: false });
      },

      closeGuide() {
        set({ guideOpen: false });
      },

      dispose() {
        activeRunToken++;
        activeWeatherToken++;
        if (workerClient) {
          workerClient.terminate();
          workerClient = null;
        }
      },
    };
  });
}

export const useSimulationStore = createSimulationStore();
