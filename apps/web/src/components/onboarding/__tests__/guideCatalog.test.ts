import { describe, expect, it } from 'vitest';
import {
  CITY_BENCHMARK_REFERENCE,
  FEATURE_GUIDE_ITEMS,
  GUIDE_CATEGORIES,
  LIVE_TOUR_STEPS,
  filterFeatureGuideItems,
  getLiveTourStepCount,
  getLiveTourTabForStep,
} from '../guideCatalog';

describe('onboarding guideCatalog and live tour mapping', () => {
  it('defines 10 ordered live tour steps across simulator, schedule, and methodology tabs', () => {
    expect(getLiveTourStepCount()).toBe(10);
    expect(LIVE_TOUR_STEPS.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const targets = LIVE_TOUR_STEPS.map((s) => s.target);
    expect(new Set(targets).size).toBe(targets.length);

    for (const step of LIVE_TOUR_STEPS) {
      expect(step.controls.length).toBeGreaterThanOrEqual(3);
      expect(step.summary.length).toBeGreaterThan(25);
      expect(step.tryIt.length).toBeGreaterThan(15);
      expect(step.tip.length).toBeGreaterThan(15);
    }

    expect(getLiveTourTabForStep(-2)).toBe('simulator');
    expect(getLiveTourTabForStep(0)).toBe('simulator');
    expect(getLiveTourTabForStep(6)).toBe('simulator');
    expect(getLiveTourTabForStep(7)).toBe('schedule');
    expect(getLiveTourTabForStep(8)).toBe('schedule');
    expect(getLiveTourTabForStep(9)).toBe('methodology');
    expect(getLiveTourTabForStep(99)).toBe('methodology');
  });

  it('covers all workspace categories, city benchmarks, and resolves valid tour cross-links', () => {
    expect(CITY_BENCHMARK_REFERENCE).toHaveLength(5);
    const representedCategories = new Set(FEATURE_GUIDE_ITEMS.map((item) => item.category));
    for (const cat of GUIDE_CATEGORIES) {
      expect(representedCategories.has(cat.id)).toBe(true);
    }

    // Every Live Tour step is backed by at least one Feature Guide entry.
    const linkedTourSteps = new Set(FEATURE_GUIDE_ITEMS.map((item) => item.tourStepIndex));
    for (let idx = 0; idx < LIVE_TOUR_STEPS.length; idx++) {
      expect(linkedTourSteps.has(idx)).toBe(true);
    }

    for (const item of FEATURE_GUIDE_ITEMS) {
      expect(item.capabilities.length).toBeGreaterThanOrEqual(4);
      expect(item.tryAction.length).toBeGreaterThan(15);
      const linkedStep = LIVE_TOUR_STEPS[item.tourStepIndex];
      expect(linkedStep).toBeDefined();
      expect(linkedStep?.target).toBe(item.tourTarget);
      expect(linkedStep?.tab).toBe(item.tab);
    }
  });

  it('filters guide entries by category and keyword query cleanly', () => {
    expect(filterFeatureGuideItems('all', '')).toHaveLength(FEATURE_GUIDE_ITEMS.length);
    expect(filterFeatureGuideItems('dispatch', '').length).toBeGreaterThanOrEqual(2);
    expect(
      filterFeatureGuideItems('all', 'Open-Meteo').some((i) => i.id === 'global-city-search'),
    ).toBe(true);
    expect(
      filterFeatureGuideItems('controls', 'London').some((i) => i.id === 'global-city-search'),
    ).toBe(true);
    expect(
      filterFeatureGuideItems('maps', 'watchlist').some((i) => i.id === 'map-toolbar-inspector'),
    ).toBe(true);
    expect(filterFeatureGuideItems('all', 'nonexistent-xyz-query')).toHaveLength(0);
  });
});
