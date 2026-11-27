import { buildContiguousDistrictMesh, type RegionPreset } from './meshBuilder';

const ANCHOR_LAT = -1.2921;
const ANCHOR_LNG = 36.8219;

const mesh = buildContiguousDistrictMesh({
  rows: 4,
  cols: 4,
  originLng: 36.71,
  originLat: -1.404,
  cellWidthDeg: 0.056,
  cellHeightDeg: 0.056,
  jitterRatio: 0.14,
  seed: 73,
  curveLngFn: (_nx, ny) => 0.012 * Math.sin(ny * Math.PI),
  cells: [
    // Row 0 (South plateau outer ring)
    { id: 'hr-01', name: 'Ngong Gateway', population: 6_000, icuBeds: 12, initialCases: 420, zoneType: 'peri_urban' },
    { id: 'hr-02', name: 'Langata Terrace', population: 48_000, icuBeds: 90, initialCases: 0, zoneType: 'residential' },
    { id: 'hr-03', name: 'South B Estates', population: 46_000, icuBeds: 86, initialCases: 0, zoneType: 'residential' },
    { id: 'hr-04', name: 'Embakasi Ridge', population: 6_000, icuBeds: 12, initialCases: 390, zoneType: 'peri_urban' },

    // Row 1 (South-central ring + rail interchange)
    { id: 'hr-05', name: 'Dagoretti West', population: 50_000, icuBeds: 94, initialCases: 0, zoneType: 'residential' },
    { id: 'hr-06', name: 'Kilimani Transit Hub', population: 92_000, icuBeds: 104, initialCases: 12, zoneType: 'transit_hub' },
    { id: 'hr-07', name: 'Upper Hill Medical Core', population: 84_000, icuBeds: 160, initialCases: 0, zoneType: 'core' },
    { id: 'hr-08', name: 'Makadara Commons', population: 48_000, icuBeds: 90, initialCases: 0, zoneType: 'residential' },

    // Row 2 (North-central ring + arterial trunk)
    { id: 'hr-09', name: 'Kawangware Gate', population: 50_000, icuBeds: 94, initialCases: 0, zoneType: 'residential' },
    { id: 'hr-10', name: 'Parklands Medical Core', population: 80_000, icuBeds: 160, initialCases: 0, zoneType: 'core' },
    { id: 'hr-11', name: 'Central Rail Ring', population: 90_000, icuBeds: 104, initialCases: 10, zoneType: 'transit_hub' },
    { id: 'hr-12', name: 'Eastleigh Flats', population: 58_000, icuBeds: 109, initialCases: 0, zoneType: 'residential' },

    // Row 3 (North upland perimeter)
    { id: 'hr-13', name: 'Kikuyu Uplands', population: 36_000, icuBeds: 68, initialCases: 0, zoneType: 'peri_urban' },
    { id: 'hr-14', name: 'Westlands Heights', population: 46_000, icuBeds: 86, initialCases: 0, zoneType: 'residential' },
    { id: 'hr-15', name: 'Kasarani Exchange', population: 64_000, icuBeds: 104, initialCases: 0, zoneType: 'transit_hub' },
    { id: 'hr-16', name: 'Runda Frontier', population: 6_000, icuBeds: 12, initialCases: 360, zoneType: 'peri_urban' },
  ],
});

export const HIGHLAND_RING_PRESET: RegionPreset = {
  id: 'highland_ring',
  name: 'Highland Ring',
  subtitle: '16 Districts | Upland Plateau Ring',
  description:
    'Landlocked high-altitude plateau ring with radial commuter corridors linking peripheral gateways, central referral hospitals, and dense upland wards.',
  defaultDiseaseMode: 'direct_seir',
  anchorLat: ANCHOR_LAT,
  anchorLng: ANCHOR_LNG,
  mapCenter: [ANCHOR_LNG, ANCHOR_LAT],
  mapZoom: 10.3,
  districts: mesh.districts,
  featureCollection: mesh.featureCollection,
};
