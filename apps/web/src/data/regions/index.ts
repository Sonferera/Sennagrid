import type { BuiltInRegionId, RegionId } from '@sennagrid/engine';
import { HARBOR_CORRIDOR_PRESET } from './harborCorridor';
import { HIGHLAND_RING_PRESET } from './highlandRing';
import type { RegionPreset } from './meshBuilder';
import { METRO_TROPICA_PRESET } from './metroTropica';
import { MONSOON_DELTA_PRESET } from './monsoonDelta';

export type { DistrictFeature, DistrictFeatureCollection, RegionPreset } from './meshBuilder';
export { buildCustomCityId, buildCustomCityPreset } from './customCity';
export { HARBOR_CORRIDOR_PRESET } from './harborCorridor';
export { HIGHLAND_RING_PRESET } from './highlandRing';
export { METRO_TROPICA_PRESET } from './metroTropica';
export { MONSOON_DELTA_PRESET } from './monsoonDelta';

export const REGION_PRESETS: Record<BuiltInRegionId, RegionPreset> = {
  metro_tropica: METRO_TROPICA_PRESET,
  harbor_corridor: HARBOR_CORRIDOR_PRESET,
  highland_ring: HIGHLAND_RING_PRESET,
  monsoon_delta: MONSOON_DELTA_PRESET,
};

export const REGION_PRESET_LIST: RegionPreset[] = [
  METRO_TROPICA_PRESET,
  HARBOR_CORRIDOR_PRESET,
  HIGHLAND_RING_PRESET,
  MONSOON_DELTA_PRESET,
];

export function isBuiltInRegionId(regionId: RegionId): regionId is BuiltInRegionId {
  return Object.prototype.hasOwnProperty.call(REGION_PRESETS, regionId);
}

export function getRegionPreset(
  regionId: RegionId,
  customPreset?: RegionPreset | null,
): RegionPreset {
  if (isBuiltInRegionId(regionId)) {
    return REGION_PRESETS[regionId];
  }
  if (customPreset && customPreset.id === regionId) {
    return customPreset;
  }
  return METRO_TROPICA_PRESET;
}
