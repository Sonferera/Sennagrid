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
import { getRegionPreset } from '../data/regions';
import { findReactivePeakIcuDay } from '../lib/viewModels';
import { fetchRegionClimate } from '../services/weather';
import {
  createOptimizerWorkerClient,
  type OptimizerWorkerClient,
} from '../workers/optimizerClient';

export type ActiveTab = 'simulator' | 'schedule' | 'methodology';
export type PlaybackSpeed = 1 | 2 | 4;
export type MobileMapStrategy = 'reactive' | 'sennagrid';

export interface SimulationStoreDependencies {
  fetchClimate?: (regionId: RegionId) => Promise<ClimateSeries>;
  getFallbackClimate?: (regionId: RegionId, anchorLat: number, anchorLng: number) => ClimateSeries;
  createWorkerClient?: () => OptimizerWorkerClient;
}

export interface SimulationStoreState {
  params: SimulationParams;
  advancedOpen: boolean;
  activeTab: ActiveTab;
  selectedDistrictId: string | null;
  syncMapsLocked: boolean;
  mobileMapStrategy: MobileMapStrategy;
  currentDay: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  climate: ClimateSeries | null;
  climateByRegion: Partial<Record<RegionId, ClimateSeries>>;
  weatherRefreshPending: boolean;
  output: OptimizationOutput | null;
  isOptimizing: boolean;
  hasInitialized: boolean;
  error: string | null;
  tourOpen: boolean;
  tourStep: number;

  initialize: () => Promise<void>;
  setRegion: (regionId: RegionId) => Promise<void>;
  setDiseaseMode: (diseaseMode: DiseaseMode) => Promise<void>;
  setBudgetRatio: (budgetRatio: number) => void;
  setAdvancedParam: (
    patch: Partial<Pick<SimulationParams, 'icuRate' | 'mobilityOutflow' | 'interventionEfficacy'>>,
  ) => void;
  resetDefaults: () => Promise<void>;
  runOptimization: (overrideParams?: SimulationParams, overrideClimate?: ClimateSeries) => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentDay: (day: number) => void;
  stepDay: (delta: number) => void;
  jumpToPeakDay: () => void;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  selectDistrict: (districtId: string | null) => void;
  toggleSyncMaps: () => void;
  setMobileMapStrategy: (strategy: MobileMapStrategy) => void;
  toggleAdvancedOpen: () => void;
  setAdvancedOpen: (open: boolean) => void;
  openTour: () => void;
  closeTour: () => void;
  setTourStep: (step: number) => void;
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
    const refreshLiveClimateInBackground = (regionId: RegionId) => {
      const cached = get().climateByRegion[regionId];
      if (cached && cached.source === 'open_meteo') {
        return;
      }

      const weatherToken = ++activeWeatherToken;
      set({ weatherRefreshPending: true });

      void fetchClimateFn(regionId)
        .then((resolvedClimate) => {
          const current = get();
          const stillSameWeatherToken = weatherToken === activeWeatherToken;
          set((state) => ({
            climateByRegion: {
              ...state.climateByRegion,
              [regionId]: resolvedClimate,
            },
            weatherRefreshPending: stillSameWeatherToken ? false : state.weatherRefreshPending,
          }));

          // Only trigger a seamless background re-run if live Open-Meteo data differs from fallback
          // and the user is still viewing this region.
          if (
            stillSameWeatherToken &&
            current.params.regionId === regionId &&
            resolvedClimate.source === 'open_meteo' &&
            current.climate?.source !== 'open_meteo'
          ) {
            set({ climate: resolvedClimate });
            void get().runOptimization(get().params, resolvedClimate);
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
      advancedOpen: false,
      activeTab: 'simulator',
      selectedDistrictId: null,
      syncMapsLocked: true,
      mobileMapStrategy: 'sennagrid',
      currentDay: 0,
      isPlaying: false,
      playbackSpeed: 1,
      climate: null,
      climateByRegion: {},
      weatherRefreshPending: false,
      output: null,
      isOptimizing: false,
      hasInitialized: false,
      error: null,
      tourOpen: false,
      tourStep: 0,

      async initialize() {
        if (get().hasInitialized) {
          return;
        }
        set({ hasInitialized: true });
        const { params, climateByRegion } = get();
        const preset = getRegionPreset(params.regionId);
        const immediateClimate =
          climateByRegion[params.regionId] ??
          fallbackClimateFn(params.regionId, preset.anchorLat, preset.anchorLng);

        set((state) => ({
          climate: immediateClimate,
          climateByRegion: {
            ...state.climateByRegion,
            [params.regionId]: immediateClimate,
          },
        }));

        // Start initial simulation immediately without blocking on external weather latency.
        refreshLiveClimateInBackground(params.regionId);
        await get().runOptimization(params, immediateClimate);
      },

      async setRegion(regionId) {
        const preset = getRegionPreset(regionId);
        const nextParams: SimulationParams = {
          ...get().params,
          regionId,
          diseaseMode: preset.defaultDiseaseMode,
          interventionEfficacy: undefined,
        };
        const immediateClimate =
          get().climateByRegion[regionId] ??
          fallbackClimateFn(regionId, preset.anchorLat, preset.anchorLng);

        set((state) => ({
          params: nextParams,
          selectedDistrictId: null,
          isPlaying: false,
          currentDay: 0,
          climate: immediateClimate,
          climateByRegion: {
            ...state.climateByRegion,
            [regionId]: immediateClimate,
          },
          error: null,
        }));

        refreshLiveClimateInBackground(regionId);
        await get().runOptimization(nextParams, immediateClimate);
      },

      async setDiseaseMode(diseaseMode) {
        const nextParams: SimulationParams = {
          ...get().params,
          diseaseMode,
          interventionEfficacy: undefined,
        };
        set({ params: nextParams, isPlaying: false, error: null });
        await get().runOptimization(nextParams);
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
        set({ params: nextParams, isPlaying: false, error: null });
        await get().runOptimization(nextParams);
      },

      async runOptimization(overrideParams, overrideClimate) {
        const params = overrideParams ?? get().params;
        const preset = getRegionPreset(params.regionId);
        const climate =
          overrideClimate ??
          get().climate ??
          get().climateByRegion[params.regionId] ??
          fallbackClimateFn(params.regionId, preset.anchorLat, preset.anchorLng);

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

          set((state) => ({
            output: result,
            climate: result.climate,
            selectedDistrictId: validSelected,
            currentDay: Math.max(0, Math.min(maxDay, state.currentDay)),
            isOptimizing: false,
            error: null,
          }));
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

      setCurrentDay(day) {
        const maxDay = getMaxDay(get().output, get().params);
        const clamped = Math.max(0, Math.min(maxDay, Math.round(day)));
        set((state) => ({
          currentDay: clamped,
          isPlaying: clamped >= maxDay ? false : state.isPlaying,
        }));
      },

      stepDay(delta) {
        const state = get();
        const maxDay = getMaxDay(state.output, state.params);
        const nextDay = Math.max(0, Math.min(maxDay, state.currentDay + delta));
        set({
          currentDay: nextDay,
          isPlaying: false,
        });
      },

      jumpToPeakDay() {
        const output = get().output;
        if (!output) return;
        const peakDay = findReactivePeakIcuDay(output);
        set({
          currentDay: peakDay,
          isPlaying: false,
        });
      },

      togglePlaying() {
        const state = get();
        const maxDay = getMaxDay(state.output, state.params);
        if (!state.isPlaying && state.currentDay >= maxDay) {
          set({ currentDay: 0, isPlaying: true });
          return;
        }
        set({ isPlaying: !state.isPlaying });
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

      setMobileMapStrategy(strategy) {
        set({ mobileMapStrategy: strategy });
      },

      toggleAdvancedOpen() {
        set((state) => ({ advancedOpen: !state.advancedOpen }));
      },

      setAdvancedOpen(open) {
        set({ advancedOpen: open });
      },

      openTour() {
        set({ tourOpen: true, tourStep: 0, activeTab: 'simulator' });
      },

      closeTour() {
        set({ tourOpen: false });
      },

      setTourStep(step) {
        const clamped = Math.max(0, Math.min(3, step));
        set({
          tourStep: clamped,
          activeTab: clamped === 3 ? 'schedule' : 'simulator',
        });
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
