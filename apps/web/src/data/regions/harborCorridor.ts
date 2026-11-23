import { buildContiguousDistrictMesh, type RegionPreset } from './meshBuilder';

const ANCHOR_LAT = 35.4437;
const ANCHOR_LNG = 139.638;

const mesh = buildContiguousDistrictMesh({
  rows: 2,
  cols: 8,
  originLng: 139.42,
  originLat: 35.38,
  cellWidthDeg: 0.055,
  cellHeightDeg: 0.068,
  jitterRatio: 0.14,
  seed: 41,
  curveLatFn: (nx) => 0.025 * Math.sin(nx * Math.PI * 1.15 - 0.25),
  cells: [
    // Row 0 (Coastal waterfront strip)
    { id: 'hc-01', name: 'South Breakwater', population: 3_200, icuBeds: 34, initialCases: 760, zoneType: 'peri_urban' },
    { id: 'hc-02', name: 'Container Port West', population: 3_400, icuBeds: 34, initialCases: 720, zoneType: 'transit_hub' },
    { id: 'hc-03', name: 'Bayfront Ferry Gate', population: 58_000, icuBeds: 108, initialCases: 6, zoneType: 'transit_hub' },
    { id: 'hc-04', name: 'Harbor Medical Core', population: 75_000, icuBeds: 145, initialCases: 8, zoneType: 'core' },
    { id: 'hc-05', name: 'Central Causeway', population: 66_000, icuBeds: 108, initialCases: 7, zoneType: 'transit_hub' },
    { id: 'hc-06', name: 'Shipyard Commons', population: 48_000, icuBeds: 94, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-07', name: 'East Pier Estates', population: 44_000, icuBeds: 90, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-08', name: 'Point Beacon Dock', population: 3_000, icuBeds: 32, initialCases: 690, zoneType: 'peri_urban' },

    // Row 1 (Inland rail corridor)
    { id: 'hc-09', name: 'West Ridge Depots', population: 30_000, icuBeds: 72, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'hc-10', name: 'Dockside Rail Ward', population: 50_000, icuBeds: 94, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-11', name: 'Civic Bottleneck', population: 72_000, icuBeds: 140, initialCases: 0, zoneType: 'core' },
    { id: 'hc-12', name: 'Midtown Exchange', population: 62_000, icuBeds: 104, initialCases: 6, zoneType: 'transit_hub' },
    { id: 'hc-13', name: 'Bridgehead Flats', population: 52_000, icuBeds: 96, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-14', name: 'Northline Suburbs', population: 46_000, icuBeds: 90, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-15', name: 'Hillside Heights', population: 40_000, icuBeds: 84, initialCases: 0, zoneType: 'residential' },
    { id: 'hc-16', name: 'Upper Valley Edge', population: 28_000, icuBeds: 68, initialCases: 0, zoneType: 'peri_urban' },
  ],
});

export const HARBOR_CORRIDOR_PRESET: RegionPreset = {
  id: 'harbor_corridor',
  name: 'Harbor Corridor',
  subtitle: '16 Districts | Linear Coastal Corridor',
  description:
    'Coastal linear metropolitan strip with a central commuter bottleneck linking port terminals, downtown hospitals, and dense suburban districts.',
  defaultDiseaseMode: 'direct_seir',
  anchorLat: ANCHOR_LAT,
  anchorLng: ANCHOR_LNG,
  mapCenter: [ANCHOR_LNG, ANCHOR_LAT],
  mapZoom: 10.1,
  districts: mesh.districts,
  featureCollection: mesh.featureCollection,
};
