import type { RegionId } from '@sennagrid/engine';
import { HARBOR_CORRIDOR_PRESET } from './harborCorridor';
import { METRO_TROPICA_PRESET } from './metroTropica';
import type { RegionPreset } from './meshBuilder';

export type { DistrictFeature, DistrictFeatureCollection, RegionPreset } from './meshBuilder';
export { HARBOR_CORRIDOR_PRESET } from './harborCorridor';
export { METRO_TROPICA_PRESET } from './metroTropica';

export const REGION_PRESETS: Record<RegionId, RegionPreset> = {
  metro_tropica: METRO_TROPICA_PRESET,
  harbor_corridor: HARBOR_CORRIDOR_PRESET,
};

export const REGION_PRESET_LIST: RegionPreset[] = [
  METRO_TROPICA_PRESET,
  HARBOR_CORRIDOR_PRESET,
];

export function getRegionPreset(regionId: RegionId): RegionPreset {
  return REGION_PRESETS[regionId];
}
